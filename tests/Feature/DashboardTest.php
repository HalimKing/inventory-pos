<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('authenticated users are redirected to their role dashboard', function () {
    $this->actingAs(User::factory()->withoutTwoFactor()->create(['role_id' => 1]));

    $this->get(route('dashboard'))
        ->assertRedirect(route('admin.dashboard'));
});

test('authenticated admins can visit the admin dashboard', function () {
    $this->actingAs(User::factory()->withoutTwoFactor()->create(['role_id' => 1]));

    $this->get(route('admin.dashboard'))->assertOk();
});