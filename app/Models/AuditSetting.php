<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditSetting extends Model
{
    protected $fillable = [
        'retention_days',
        'auto_purge_enabled',
    ];

    protected function casts(): array
    {
        return [
            'auto_purge_enabled' => 'boolean',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'retention_days' => config('audit.default_retention_days', 90),
            'auto_purge_enabled' => config('audit.auto_purge_enabled', true),
        ]);
    }
}
