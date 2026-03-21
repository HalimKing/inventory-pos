<?php

namespace App\Http\Middleware;

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
        // If user is not authenticated, continue normally
        if (!auth()->check()) {
            return $next($request);
        }


        // Define routes that should not be redirected (allowed to access)
        $exemptRoutes = [
            'logout',
            // 'cashier.dashboard', // The dashboard route itself
            'api.*', // API routes if any
        ];

        // Check if current route is exempt from redirection
        foreach ($exemptRoutes as $exemptRoute) {
            if ($request->routeIs($exemptRoute)) {
                return $next($request);
            }
        }

        // Resolve role name first to avoid hard-coded role ID assumptions.
        $roleName = strtolower((string) optional(auth()->user()->role)->name);
        $roleId = (int) auth()->user()->role_id;

        // Define role-specific dashboards
        $roleDashboardsByName = [
            'cashier' => 'cashier.dashboard',
            'supper admin' => 'admin.dashboard',
            'admin' => 'admin.dashboard',
            'inventory' => 'admin.products.index',
        ];

        // Fallback for legacy DBs where role relation/name may be missing.
        $roleDashboardsById = [
            3 => 'cashier.dashboard',
            1 => 'admin.dashboard',
            2 => 'admin.dashboard',
            4 => 'admin.products.index',
        ];

        $targetDashboard = $roleDashboardsByName[$roleName] ?? $roleDashboardsById[$roleId] ?? null;


        // If user is already on their correct dashboard route, continue
        if ($targetDashboard && $request->routeIs($targetDashboard)) {
            return $next($request);
        }

        // Redirect to appropriate dashboard based on role
        if ($targetDashboard) {
            return redirect()->route($targetDashboard);
        }

        // For users without a defined role dashboard, continue normally
        return $next($request);
    }
}
