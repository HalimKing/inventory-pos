<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Fortify\Fortify;

class RoleRedirect
{
    public static function fallbackPath(Request $request): string
    {
        $default = Fortify::redirects('login');
        $user = $request->user();

        if (! $user instanceof User) {
            return $default;
        }

        $intended = $request->session()->get('url.intended');

        if (is_string($intended) && $intended !== '' && ! $user->canAccessIntendedUrl($intended)) {
            $request->session()->forget('url.intended');

            return $user->homePath();
        }

        return $default;
    }
}
