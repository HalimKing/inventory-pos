<?php

namespace App\Services;

use App\Enums\AuditModule;
use App\Enums\AuditSeverity;
use App\Enums\AuditStatus;
use App\Jobs\LogSystemActivityJob;
use App\Models\SystemLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class AuditLogger
{
    public static function record(
        string $eventType,
        AuditModule|string $module,
        string $description,
        ?User $user = null,
        ?Request $request = null,
        ?string $resourceType = null,
        ?string $resourceId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        AuditSeverity|string $severity = AuditSeverity::Info,
        AuditStatus|string $status = AuditStatus::Success,
        array $metadata = [],
        bool $forceSync = false,
    ): ?SystemLog {
        $moduleValue = $module instanceof AuditModule ? $module->value : $module;
        $severityValue = $severity instanceof AuditSeverity ? $severity->value : $severity;
        $statusValue = $status instanceof AuditStatus ? $status->value : $status;

        $userAgent = $request?->userAgent();
        $parsedAgent = self::parseUserAgent($userAgent);

        $payload = [
            'event_type' => $eventType,
            'module' => $moduleValue,
            'severity' => $severityValue,
            'status' => $statusValue,
            'description' => $description,
            'user_id' => $user?->id,
            'user_name' => $user?->name,
            'user_role' => $user?->roleName(),
            'ip_address' => $request?->ip(),
            'user_agent' => $userAgent,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'old_values' => $oldValues ? self::sanitizeValues($oldValues) : null,
            'new_values' => $newValues ? self::sanitizeValues($newValues) : null,
            'metadata' => array_merge($metadata, [
                'browser' => $parsedAgent['browser'],
                'device' => $parsedAgent['device'],
            ]),
            'created_at' => now(),
        ];

        $useAsync = config('audit.async', true) && ! $forceSync;

        if ($useAsync) {
            LogSystemActivityJob::dispatch($payload);

            return null;
        }

        return SystemLog::query()->create($payload);
    }

    public static function sanitizeValues(array $values): array
    {
        $hidden = ['password', 'password_confirmation', 'newPassword', 'confirmPassword', 'token'];

        return Arr::except($values, $hidden);
    }

    private static function parseUserAgent(?string $userAgent): array
    {
        if (! $userAgent) {
            return ['browser' => null, 'device' => null];
        }

        $device = str_contains($userAgent, 'Mobile') ? 'Mobile' : 'Desktop';
        $browser = match (true) {
            str_contains($userAgent, 'Edg') => 'Edge',
            str_contains($userAgent, 'Chrome') => 'Chrome',
            str_contains($userAgent, 'Firefox') => 'Firefox',
            str_contains($userAgent, 'Safari') => 'Safari',
            default => 'Unknown',
        };

        return ['browser' => $browser, 'device' => $device];
    }
}
