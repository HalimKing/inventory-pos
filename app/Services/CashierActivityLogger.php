<?php

namespace App\Services;

use App\Enums\AuditModule;
use App\Enums\AuditSeverity;
use App\Enums\AuditStatus;
use App\Models\CashierActivityLog;
use Illuminate\Http\Request;

class CashierActivityLogger
{
    public static function log(
        int $userId,
        string $action,
        ?string $resourceType = null,
        ?string $resourceId = null,
        array $metadata = [],
        ?Request $request = null,
    ): CashierActivityLog {
        $log = CashierActivityLog::query()->create([
            'user_id' => $userId,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'metadata' => $metadata,
            'ip_address' => $request?->ip(),
        ]);

        $user = $request?->user();

        AuditLogger::record(
            eventType: 'sales.'.$action,
            module: AuditModule::Sales,
            description: match ($action) {
                'receipt_reprint' => 'Receipt reprinted',
                'receipt_resend' => 'Receipt resent to customer',
                'report_export' => 'Cashier report exported',
                default => str_replace('_', ' ', ucfirst($action)),
            },
            user: $user,
            request: $request,
            resourceType: $resourceType,
            resourceId: $resourceId,
            metadata: array_merge($metadata, ['cashier_activity_log_id' => $log->id]),
            severity: AuditSeverity::Info,
            status: AuditStatus::Success,
        );

        return $log;
    }
}
