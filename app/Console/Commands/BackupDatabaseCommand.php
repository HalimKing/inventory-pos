<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;

class BackupDatabaseCommand extends Command
{
    protected $signature = 'audit:backup-database';

    protected $description = 'Create a database backup file';

    public function handle(): int
    {
        $connection = Config::get('database.default');
        $driver = Config::get("database.connections.{$connection}.driver");

        if ($driver === 'sqlite') {
            $database = Config::get("database.connections.{$connection}.database");

            if (! File::exists($database)) {
                $this->error('Database file not found.');

                return self::FAILURE;
            }

            $backupDir = storage_path('app/backups');
            File::ensureDirectoryExists($backupDir);

            $filename = 'backup-'.now()->format('Y-m-d-His').'.sqlite';
            File::copy($database, $backupDir.DIRECTORY_SEPARATOR.$filename);

            $this->info("SQLite backup created: {$filename}");

            return self::SUCCESS;
        }

        $this->warn('Automatic backup is only configured for SQLite in this environment.');

        return self::SUCCESS;
    }
}
