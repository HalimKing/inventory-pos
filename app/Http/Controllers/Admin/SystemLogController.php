<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditSetting;
use App\Models\SystemLog;
use App\Models\User;
use App\Services\AuditLogger;
use App\Enums\AuditModule;
use App\Enums\AuditSeverity;
use App\Enums\AuditStatus;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SystemLogController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', SystemLog::class);

        $users = User::query()
            ->with('role')
            ->orderBy('name')
            ->get(['id', 'name', 'role_id'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->roleName(),
            ]);

        return Inertia::render('admin/system-logs/index', [
            'filterOptions' => [
                'modules' => array_column(AuditModule::cases(), 'value'),
                'severities' => array_column(AuditSeverity::cases(), 'value'),
                'statuses' => array_column(AuditStatus::cases(), 'value'),
            ],
            'users' => $users,
            'retentionSettings' => AuditSetting::current(),
        ]);
    }

    public function list(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SystemLog::class);

        $perPage = max(10, min((int) $request->integer('per_page', 25), 100));
        $sortDirection = $request->query('sort', 'desc') === 'asc' ? 'asc' : 'desc';

        $query = SystemLog::query()->orderBy('created_at', $sortDirection);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('description', 'like', "%{$search}%")
                    ->orWhere('event_type', 'like', "%{$search}%")
                    ->orWhere('user_name', 'like', "%{$search}%")
                    ->orWhere('resource_id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('module') && $request->query('module') !== 'all') {
            $query->where('module', $request->query('module'));
        }

        if ($request->filled('event_type') && $request->query('event_type') !== 'all') {
            $query->where('event_type', 'like', $request->query('event_type').'%');
        }

        if ($request->filled('severity') && $request->query('severity') !== 'all') {
            $query->where('severity', $request->query('severity'));
        }

        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('user_id') && $request->query('user_id') !== 'all') {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('role') && $request->query('role') !== 'all') {
            $query->where('user_role', $request->query('role'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        $summaryQuery = clone $query;
        $summary = [
            'total' => (clone $summaryQuery)->count(),
            'errors' => (clone $summaryQuery)->whereIn('severity', ['error', 'critical'])->count(),
            'warnings' => (clone $summaryQuery)->where('severity', 'warning')->count(),
            'security_events' => (clone $summaryQuery)->where('module', AuditModule::Auth->value)->count(),
        ];

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (SystemLog $log) => $this->formatLogSummary($log));

        return response()->json([
            'summary' => $summary,
            'logs' => $paginator,
        ]);
    }

    public function show(SystemLog $systemLog): JsonResponse
    {
        $this->authorize('view', $systemLog);

        return response()->json($this->formatLogDetail($systemLog));
    }

    public function export(Request $request): JsonResponse
    {
        $this->authorize('export', SystemLog::class);

        $query = $this->buildFilteredQuery($request);
        $logs = $query->limit(5000)->get()->map(fn (SystemLog $log) => $this->formatLogDetail($log));

        AuditLogger::record(
            eventType: 'system.log_export',
            module: AuditModule::System,
            description: 'System logs exported',
            user: Auth::user(),
            request: $request,
            metadata: [
                'format' => $request->query('format', 'json'),
                'count' => $logs->count(),
            ],
        );

        return response()->json(['logs' => $logs]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $this->authorize('manageRetention', SystemLog::class);

        $validated = $request->validate([
            'retention_days' => 'required|integer|min:7|max:3650',
            'auto_purge_enabled' => 'required|boolean',
        ]);

        $settings = AuditSetting::current();
        $old = $settings->only(['retention_days', 'auto_purge_enabled']);
        $settings->update($validated);

        AuditLogger::record(
            eventType: 'system.retention_updated',
            module: AuditModule::System,
            description: 'Audit log retention settings updated',
            user: Auth::user(),
            request: $request,
            oldValues: $old,
            newValues: $validated,
        );

        return response()->json([
            'success' => true,
            'settings' => $settings->fresh(),
        ]);
    }

    public function purge(Request $request): JsonResponse
    {
        $this->authorize('manageRetention', SystemLog::class);

        $validated = $request->validate([
            'before_date' => 'nullable|date',
            'use_retention_policy' => 'boolean',
        ]);

        $beforeDate = isset($validated['before_date'])
            ? Carbon::parse($validated['before_date'])->endOfDay()
            : now()->subDays(AuditSetting::current()->retention_days)->endOfDay();

        $deleted = SystemLog::query()
            ->where('created_at', '<=', $beforeDate)
            ->delete();

        AuditLogger::record(
            eventType: 'system.logs_purged',
            module: AuditModule::System,
            description: "Purged {$deleted} audit log entries",
            user: Auth::user(),
            request: $request,
            metadata: ['before_date' => $beforeDate->toIso8601String(), 'deleted_count' => $deleted],
            severity: AuditSeverity::Warning,
        );

        return response()->json([
            'success' => true,
            'deleted_count' => $deleted,
        ]);
    }

    public function runBackup(Request $request): JsonResponse
    {
        $this->authorize('manageRetention', SystemLog::class);

        try {
            Artisan::call('audit:backup-database');
            $output = trim(Artisan::output());

            AuditLogger::record(
                eventType: 'system.database_backup',
                module: AuditModule::System,
                description: 'Database backup initiated',
                user: Auth::user(),
                request: $request,
                metadata: ['output' => $output],
            );

            return response()->json(['success' => true, 'message' => $output ?: 'Backup completed.']);
        } catch (\Throwable $e) {
            AuditLogger::record(
                eventType: 'system.database_backup',
                module: AuditModule::System,
                description: 'Database backup failed',
                user: Auth::user(),
                request: $request,
                status: AuditStatus::Failed,
                severity: AuditSeverity::Error,
                metadata: ['error' => $e->getMessage()],
            );

            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    private function buildFilteredQuery(Request $request)
    {
        $query = SystemLog::query()->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where('description', 'like', "%{$search}%");
        }

        foreach (['module', 'severity', 'status'] as $field) {
            if ($request->filled($field) && $request->query($field) !== 'all') {
                $query->where($field, $request->query($field));
            }
        }

        if ($request->filled('user_id') && $request->query('user_id') !== 'all') {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        return $query;
    }

    private function formatLogSummary(SystemLog $log): array
    {
        return [
            'id' => $log->id,
            'event_type' => $log->event_type,
            'module' => $log->module,
            'severity' => $log->severity,
            'status' => $log->status,
            'description' => $log->description,
            'user_name' => $log->user_name,
            'user_role' => $log->user_role,
            'ip_address' => $log->ip_address,
            'resource_type' => $log->resource_type,
            'resource_id' => $log->resource_id,
            'created_at' => $log->created_at?->toIso8601String(),
            'created_at_formatted' => $log->created_at?->format('M d, Y g:i A'),
        ];
    }

    private function formatLogDetail(SystemLog $log): array
    {
        return [
            ...$this->formatLogSummary($log),
            'user_id' => $log->user_id,
            'user_agent' => $log->user_agent,
            'browser' => $log->metadata['browser'] ?? null,
            'device' => $log->metadata['device'] ?? null,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'metadata' => $log->metadata,
        ];
    }
}
