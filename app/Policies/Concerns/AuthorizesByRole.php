<?php

namespace App\Policies\Concerns;

use App\Enums\RoleName;
use App\Models\User;

trait AuthorizesByRole
{
    protected function isSuperAdmin(User $user): bool
    {
        return $user->hasRole(RoleName::SuperAdmin);
    }

    protected function isAdmin(User $user): bool
    {
        return $user->hasRole(RoleName::SuperAdmin, RoleName::Admin);
    }

    protected function isCashier(User $user): bool
    {
        return $user->hasRole(RoleName::Cashier);
    }

    protected function isInventoryStaff(User $user): bool
    {
        return $user->hasRole(RoleName::Inventory);
    }

    protected function canAccessCatalog(User $user): bool
    {
        return $this->isAdmin($user)
            || $this->isCashier($user)
            || $this->isInventoryStaff($user);
    }

    protected function canManageCatalog(User $user): bool
    {
        return $this->isAdmin($user) || $this->isInventoryStaff($user);
    }

    protected function canManageUsers(User $user): bool
    {
        return $this->isAdmin($user);
    }

    protected function canManageTargetUser(User $actor, User $target): bool
    {
        if (! $this->canManageUsers($actor)) {
            return false;
        }

        if ($target->hasRole(RoleName::SuperAdmin) && ! $actor->isSuperAdmin()) {
            return false;
        }

        return true;
    }
}
