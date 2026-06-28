<?php

return [
    // When true, logs are queued and require `php artisan queue:work` to be running.
    // Defaults to false so logs appear immediately without a queue worker.
    'async' => env('AUDIT_ASYNC', false),

    'default_retention_days' => (int) env('AUDIT_RETENTION_DAYS', 90),

    'auto_purge_enabled' => env('AUDIT_AUTO_PURGE', true),
];
