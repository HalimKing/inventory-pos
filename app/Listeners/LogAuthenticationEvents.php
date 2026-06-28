<?php

namespace App\Listeners;

use App\Enums\AuditModule;
use App\Enums\AuditSeverity;
use App\Enums\AuditStatus;
use App\Services\AuditLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;

class LogAuthenticationEvents
{
    public function handleLogin(Login $event): void
    {
        AuditLogger::record(
            eventType: 'auth.login',
            module: AuditModule::Auth,
            description: 'User logged in successfully',
            user: $event->user,
            request: request(),
            severity: AuditSeverity::Info,
            status: AuditStatus::Success,
            metadata: ['guard' => $event->guard],
        );
    }

    public function handleLogout(Logout $event): void
    {
        AuditLogger::record(
            eventType: 'auth.logout',
            module: AuditModule::Auth,
            description: 'User logged out',
            user: $event->user,
            request: request(),
            severity: AuditSeverity::Info,
            status: AuditStatus::Success,
            metadata: ['guard' => $event->guard],
        );
    }

    public function handleFailed(Failed $event): void
    {
        AuditLogger::record(
            eventType: 'auth.failed_login',
            module: AuditModule::Auth,
            description: 'Failed login attempt',
            user: null,
            request: request(),
            severity: AuditSeverity::Warning,
            status: AuditStatus::Failed,
            metadata: [
                'email' => $event->credentials['email'] ?? null,
                'guard' => $event->guard,
            ],
        );
    }

    public function handlePasswordReset(PasswordReset $event): void
    {
        AuditLogger::record(
            eventType: 'auth.password_reset',
            module: AuditModule::Auth,
            description: 'User password was reset',
            user: $event->user,
            request: request(),
            resourceType: get_class($event->user),
            resourceId: (string) $event->user->getKey(),
            severity: AuditSeverity::Info,
            status: AuditStatus::Success,
        );
    }

    public static function registerInactiveLoginAttempt(Request $request, string $email): void
    {
        AuditLogger::record(
            eventType: 'auth.inactive_login_blocked',
            module: AuditModule::Auth,
            description: 'Login blocked for inactive account',
            user: null,
            request: $request,
            severity: AuditSeverity::Warning,
            status: AuditStatus::Failed,
            metadata: ['email' => $email],
        );
    }

    public static function subscribe(): void
    {
        Event::listen(Login::class, [self::class, 'handleLogin']);
        Event::listen(Logout::class, [self::class, 'handleLogout']);
        Event::listen(Failed::class, [self::class, 'handleFailed']);
        Event::listen(PasswordReset::class, [self::class, 'handlePasswordReset']);
    }
}
