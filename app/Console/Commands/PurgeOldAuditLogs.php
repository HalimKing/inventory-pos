<?php

namespace App\Console\Commands;

use App\Models\AuditSetting;
use App\Models\SystemLog;
use Illuminate\Console\Command;

class PurgeOldAuditLogs extends Command
{
    protected $signature = 'audit:purge-old-logs';

    protected $description = 'Purge audit logs older than the configured retention period';

    public function handle(): int
    {
        $settings = AuditSetting::current();

        if (! $settings->auto_purge_enabled) {
            $this->info('Auto purge is disabled. Skipping.');

            return self::SUCCESS;
        }

        $cutoff = now()->subDays($settings->retention_days);

        $deleted = SystemLog::query()
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info("Purged {$deleted} log entries older than {$settings->retention_days} days.");

        return self::SUCCESS;
    }
}
