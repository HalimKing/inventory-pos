<?php

namespace App\Http\Middleware;

use App\Enums\AuditModule;
use App\Enums\AuditSeverity;
use App\Enums\AuditStatus;
use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogAdminApiActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $response;
        }

        if (! $request->user()) {
            return $response;
        }

        $status = $response->getStatusCode() >= 400 ? AuditStatus::Failed : AuditStatus::Success;
        $severity = $response->getStatusCode() >= 500 ? AuditSeverity::Error : AuditSeverity::Info;

        AuditLogger::record(
            eventType: 'api.request',
            module: AuditModule::Api,
            description: sprintf('%s %s', $request->method(), $request->path()),
            user: $request->user(),
            request: $request,
            severity: $severity,
            status: $status,
            metadata: [
                'method' => $request->method(),
                'path' => $request->path(),
                'status_code' => $response->getStatusCode(),
            ],
        );

        return $response;
    }
}
