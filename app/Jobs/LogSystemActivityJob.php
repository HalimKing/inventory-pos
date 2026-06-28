<?php

namespace App\Jobs;

use App\Models\SystemLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class LogSystemActivityJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public array $payload) {}

    public function handle(): void
    {
        SystemLog::query()->create($this->payload);
    }
}
