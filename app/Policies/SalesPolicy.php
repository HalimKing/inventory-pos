<?php

namespace App\Policies;

use App\Models\Sales;
use App\Models\User;
use App\Policies\Concerns\AuthorizesByRole;

class SalesPolicy
{
    use AuthorizesByRole;

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, Sales $sale): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        return $this->isCashier($user) && (int) $sale->user_id === (int) $user->id;
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user) || $this->isCashier($user);
    }

    public function syncOffline(User $user): bool
    {
        return $this->create($user);
    }

    public function refund(User $user): bool
    {
        return $this->isAdmin($user) || $this->isCashier($user);
    }

    public function viewReports(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function viewOwnHistory(User $user): bool
    {
        return $this->isCashier($user);
    }

    public function viewOwnReports(User $user): bool
    {
        return $this->isCashier($user);
    }

    public function exportOwnReports(User $user): bool
    {
        return $this->isCashier($user);
    }

    public function reprintReceipt(User $user, Sales $sale): bool
    {
        return $this->view($user, $sale);
    }
}
