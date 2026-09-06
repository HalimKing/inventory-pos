<?php

namespace App\Http\Responses;

use App\Support\RoleRedirect;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        return $request->wantsJson()
            ? response()->json(['two_factor' => false])
            : redirect()->intended(RoleRedirect::fallbackPath($request));
    }
}
