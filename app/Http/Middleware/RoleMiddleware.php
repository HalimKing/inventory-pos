<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     * Accepts role names as middleware parameters, e.g. role:admin|cashier or role:admin,cashier
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! auth()->check()) {
            abort(403);
        }

        if ($roles === []) {
            return $next($request);
        }

        $allowed = [];
        foreach ($roles as $role) {
            foreach (preg_split('/[|,]/', strtolower($role)) ?: [] as $part) {
                $part = trim($part);
                if ($part !== '') {
                    $allowed[] = $part;
                }
            }
        }

        $user = auth()->user();
        $userRoleName = strtolower((string) $user->roleName());

        if ($userRoleName !== '' && in_array($userRoleName, $allowed, true)) {
            return $next($request);
        }

        $roleId = (int) ($user->role_id ?? 0);
        $roleMap = [
            'cashier' => [3],
            'supper admin' => [1],
            'admin' => [1, 2],
            'inventory' => [4],
        ];

        foreach ($allowed as $allowedRole) {
            if (isset($roleMap[$allowedRole]) && in_array($roleId, $roleMap[$allowedRole], true)) {
                return $next($request);
            }
        }

        abort(403);
    }
}
