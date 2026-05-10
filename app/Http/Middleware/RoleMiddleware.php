<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     * Accepts role names as middleware parameters, e.g. ->middleware('role:admin|cashier')
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $roles = null): Response
    {
        if (! auth()->check()) {
            abort(403);
        }

        // If no roles provided, allow any authenticated user
        if (empty($roles)) {
            return $next($request);
        }

        $allowed = array_filter(array_map('trim', preg_split('/[|,]/', strtolower($roles))));

        $user = auth()->user();

        // Resolve user's role name in a few common ways
        $userRoleName = strtolower((string) optional($user->role)->name);
        if ($userRoleName && in_array($userRoleName, $allowed, true)) {
            return $next($request);
        }

        // If the user has a direct `role` attribute (string column)
        $userRoleAttr = strtolower((string) ($user->role ?? ''));
        if ($userRoleAttr && in_array($userRoleAttr, $allowed, true)) {
            return $next($request);
        }

        // Fallback: check by role_id mappings used elsewhere in this app
        $roleId = (int) ($user->role_id ?? 0);
        $roleMap = [
            'cashier' => [3],
            'supper admin' => [1],
            'admin' => [1,2],
            'inventory' => [4],
        ];

        foreach ($allowed as $a) {
            if (isset($roleMap[$a]) && in_array($roleId, $roleMap[$a], true)) {
                return $next($request);
            }
        }

        abort(403);
    }
}
