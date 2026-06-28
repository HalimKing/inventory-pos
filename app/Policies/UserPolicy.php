<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\User;
use App\Policies\Concerns\AuthorizesByRole;

class UserPolicy
{
    use AuthorizesByRole;

    public function viewAny(User $user): bool
    {
        return $this->canManageUsers($user);
    }

    public function view(User $user, User $model): bool
    {
        return $this->canManageTargetUser($user, $model);
    }

    public function create(User $user): bool
    {
        return $this->canManageUsers($user);
    }

    public function createWithRole(User $user, string $roleName): bool
    {
        if (! $this->canManageUsers($user)) {
            return false;
        }

        if (strtolower($roleName) === RoleName::SuperAdmin->value && ! $this->isSuperAdmin($user)) {
            return false;
        }

        return true;
    }

    public function updateWithRole(User $user, User $model, string $roleName): bool
    {
        if (! $this->canManageTargetUser($user, $model)) {
            return false;
        }

        if (strtolower($roleName) === RoleName::SuperAdmin->value && ! $this->isSuperAdmin($user)) {
            return false;
        }

        return true;
    }

    public function update(User $user, User $model): bool
    {
        return $this->canManageTargetUser($user, $model);
    }

    public function delete(User $user, User $model): bool
    {
        if ($user->id === $model->id) {
            return false;
        }

        return $this->canManageTargetUser($user, $model);
    }

    public function resetPassword(User $user, User $model): bool
    {
        return $this->canManageTargetUser($user, $model);
    }

    public function updateStatus(User $user, User $model): bool
    {
        if ($user->id === $model->id) {
            return false;
        }

        return $this->canManageTargetUser($user, $model);
    }
}
