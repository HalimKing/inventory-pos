<?php

namespace App\Policies;

use App\Models\SystemLog;
use App\Models\User;
use App\Policies\Concerns\AuthorizesByRole;

class SystemLogPolicy
{
    use AuthorizesByRole;

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, SystemLog $systemLog): bool
    {
        return $this->isAdmin($user);
    }

    public function export(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function manageRetention(User $user): bool
    {
        return $this->isAdmin($user);
    }
}
