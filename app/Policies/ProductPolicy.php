<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use App\Policies\Concerns\AuthorizesByRole;

class ProductPolicy
{
    use AuthorizesByRole;

    public function viewAny(User $user): bool
    {
        return $this->canAccessCatalog($user);
    }

    public function view(User $user, Product $product): bool
    {
        return $this->canAccessCatalog($user);
    }

    public function create(User $user): bool
    {
        return $this->canManageCatalog($user);
    }

    public function update(User $user, Product $product): bool
    {
        return $this->canManageCatalog($user);
    }

    public function delete(User $user, Product $product): bool
    {
        return $this->canManageCatalog($user);
    }

    public function manageBatches(User $user, Product $product): bool
    {
        return $this->canManageCatalog($user);
    }

    public function import(User $user): bool
    {
        return $this->isAdmin($user);
    }
}
