<?php

use App\Models\SystemLog;
use App\Models\User;
use App\Services\AuditLogger;
use App\Enums\AuditModule;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    config(['audit.async' => false]);
});

test('admin can access system logs page', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    $this->actingAs($admin)
        ->get('/admin/system-logs')
        ->assertOk();
});

test('cashier cannot access system logs', function () {
    $cashier = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);

    $this->actingAs($cashier)
        ->get('/admin/system-logs')
        ->assertForbidden();
});

test('audit logger creates immutable log entries', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    AuditLogger::record(
        eventType: 'test.event',
        module: AuditModule::System,
        description: 'Test audit entry',
        user: $admin,
        request: request(),
    );

    expect(SystemLog::query()->count())->toBe(1);
    expect(SystemLog::first()->description)->toBe('Test audit entry');
});

test('admin can list and filter system logs', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    AuditLogger::record(
        eventType: 'auth.login',
        module: AuditModule::Auth,
        description: 'User logged in',
        user: $admin,
        request: request(),
    );

    AuditLogger::record(
        eventType: 'product.created',
        module: AuditModule::Products,
        description: 'Product created',
        user: $admin,
        request: request(),
    );

    $response = $this->actingAs($admin)
        ->getJson('/admin/api/system-logs?module=auth')
        ->assertOk();

    expect($response->json('summary.total'))->toBe(1);
    expect($response->json('logs.data.0.module'))->toBe('auth');
});

test('user creation is audit logged', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    $this->actingAs($admin)->post('/admin/users', [
        'name' => 'Audit Test User',
        'email' => 'audit-test@example.com',
        'phone' => '1234567890',
        'role' => 'cashier',
        'status' => 'active',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    expect(SystemLog::query()->where('event_type', 'user.created')->exists())->toBeTrue();
});

test('admin can update retention settings', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    $this->actingAs($admin)
        ->putJson('/admin/api/system-logs/settings/retention', [
            'retention_days' => 60,
            'auto_purge_enabled' => true,
        ])
        ->assertOk()
        ->assertJsonPath('settings.retention_days', 60);
});

test('purge command removes old logs', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    SystemLog::query()->create([
        'event_type' => 'test.old',
        'module' => 'system',
        'severity' => 'info',
        'status' => 'success',
        'description' => 'Old log',
        'user_id' => $admin->id,
        'created_at' => now()->subDays(100),
    ]);

    \App\Models\AuditSetting::current()->update(['retention_days' => 30, 'auto_purge_enabled' => true]);

    $this->artisan('audit:purge-old-logs')->assertSuccessful();

    expect(SystemLog::query()->where('event_type', 'test.old')->exists())->toBeFalse();
});
