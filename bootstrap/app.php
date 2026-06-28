<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogAdminApiActivity;
use App\Http\Middleware\RedirectUserByRole;
use App\Http\Middleware\RoleMiddleware;
use App\Enums\AuditModule;
use App\Enums\AuditSeverity;
use App\Enums\AuditStatus;
use App\Services\AuditLogger;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'redirect.role' => RedirectUserByRole::class,
            'audit.api' => LogAdminApiActivity::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->reportable(function (Throwable $e) {
            if (app()->runningInConsole() || app()->runningUnitTests()) {
                return;
            }

            $request = app(Request::class);

            AuditLogger::record(
                eventType: 'error.exception',
                module: AuditModule::Errors,
                description: class_basename($e).': '.$e->getMessage(),
                user: $request->user(),
                request: $request,
                severity: AuditSeverity::Error,
                status: AuditStatus::Failed,
                metadata: [
                    'exception' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ],
            );
        });
    })->create();
