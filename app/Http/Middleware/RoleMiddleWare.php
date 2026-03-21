<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        if (!auth()->check()) {
            abort(403, 'Unauthorized');
        }

        $tokens = collect($roles)
            ->flatMap(fn($value) => explode(',', (string) $value))
            ->map(fn($value) => trim((string) $value))
            ->filter()
            ->values();

        $allowedRoleIds = $tokens
            ->filter(fn($value) => ctype_digit($value))
            ->map(fn($value) => (int) $value)
            ->values();

        $allowedRoleNames = $tokens
            ->reject(fn($value) => ctype_digit($value))
            ->map(fn($value) => strtolower($value))
            ->values();

        $user = auth()->user();
        $userRoleId = (int) $user->role_id;
        $userRoleName = strtolower((string) optional($user->role)->name);

        $isAllowedById = $allowedRoleIds->isNotEmpty() && $allowedRoleIds->contains($userRoleId);
        $isAllowedByName = $allowedRoleNames->isNotEmpty() && $allowedRoleNames->contains($userRoleName);

        if (!$isAllowedById && !$isAllowedByName) {
            abort(403, 'Unauthorized');
        }

        return $next($request);
    }
}
