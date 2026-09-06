<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectUserByRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! auth()->check()) {
            return $next($request);
        }

        $exemptRoutes = [
            'logout',
            'api.*',
        ];

        foreach ($exemptRoutes as $exemptRoute) {
            if ($request->routeIs($exemptRoute)) {
                return $next($request);
            }
        }

        $user = auth()->user();
        $targetDashboard = $this->dashboardRouteName($user);

        if ($targetDashboard && $request->routeIs($targetDashboard)) {
            return $next($request);
        }

        if ($targetDashboard) {
            return redirect()->route($targetDashboard);
        }

        return $next($request);
    }

    private function dashboardRouteName(User $user): ?string
    {
        $roleName = strtolower((string) $user->roleName());
        $knownRoles = ['cashier', 'inventory', 'supper admin', 'admin'];

        if (in_array($roleName, $knownRoles, true) || in_array((int) $user->role_id, [1, 2, 3, 4], true)) {
            return $user->homeRouteName();
        }

        return null;
    }
}
