<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'event_type',
        'module',
        'severity',
        'status',
        'description',
        'user_id',
        'user_name',
        'user_role',
        'ip_address',
        'user_agent',
        'resource_type',
        'resource_id',
        'old_values',
        'new_values',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
