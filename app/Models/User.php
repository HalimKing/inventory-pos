<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\RoleName;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'role_id',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function roleName(): ?string
    {
        return $this->role?->name ?? $this->resolveRoleNameFromId();
    }

    private function resolveRoleNameFromId(): ?string
    {
        return match ((int) ($this->role_id ?? 0)) {
            1 => 'supper admin',
            2 => 'admin',
            3 => 'cashier',
            4 => 'inventory',
            default => null,
        };
    }

    public function hasRole(RoleName|string ...$roles): bool
    {
        $currentRole = strtolower((string) $this->roleName());

        foreach ($roles as $role) {
            $expected = $role instanceof RoleName ? $role->value : strtolower($role);

            if ($currentRole === $expected) {
                return true;
            }
        }

        return false;
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(RoleName::SuperAdmin);
    }

    public function isAdminUser(): bool
    {
        return $this->hasRole(RoleName::SuperAdmin, RoleName::Admin);
    }

    public function homeRouteName(): string
    {
        return match (strtolower((string) $this->roleName())) {
            'cashier' => 'cashier.dashboard',
            'inventory' => 'admin.products.index',
            default => 'admin.dashboard',
        };
    }

    public function homePath(): string
    {
        return route($this->homeRouteName(), absolute: false);
    }

    public function canAccessIntendedUrl(string $url): bool
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            $path = $url;
        }

        $path = '/'.ltrim($path, '/');

        if ($path === '/dashboard') {
            return true;
        }

        return match (strtolower((string) $this->roleName())) {
            'cashier' => $this->pathStartsWith($path, ['/cashier', '/settings']),
            'inventory' => $this->pathStartsWith($path, [
                '/admin/products',
                '/admin/categories',
                '/admin/suppliers',
                '/settings',
            ]),
            'supper admin', 'admin' => $this->pathStartsWith($path, ['/admin', '/settings']),
            default => false,
        };
    }

    /**
     * @param  list<string>  $prefixes
     */
    private function pathStartsWith(string $path, array $prefixes): bool
    {
        foreach ($prefixes as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
