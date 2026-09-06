<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Sales;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('inventory staff cannot list users', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);

    $this->actingAs($user)
        ->get('/admin/users')
        ->assertForbidden();
});

test('cashier cannot create products', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);

    $this->actingAs($user)
        ->post('/admin/products', [
            'name' => 'Blocked Product',
        ])
        ->assertForbidden();
});

test('inventory staff can access product listing', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);

    $this->actingAs($user)
        ->get('/admin/products')
        ->assertOk();
});

test('inventory staff can access categories and suppliers', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);

    $this->actingAs($user)
        ->get('/admin/categories')
        ->assertOk();

    $this->actingAs($user)
        ->get('/admin/suppliers')
        ->assertOk();
});

test('inventory staff cannot access the admin dashboard', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);

    $this->actingAs($user)
        ->get('/admin/dashboard')
        ->assertForbidden();
});

test('admin can access the admin dashboard and product listing', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    $this->actingAs($admin)
        ->get('/admin/dashboard')
        ->assertOk();

    $this->actingAs($admin)
        ->get('/admin/products')
        ->assertOk();
});

test('admin cannot assign super admin role when creating users', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    $this->actingAs($admin)
        ->post('/admin/users', [
            'name' => 'Blocked Super Admin',
            'email' => 'blocked-super@example.com',
            'phone' => '1234567890',
            'role' => 'supper admin',
            'status' => 'active',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
        ->assertForbidden();
});

test('admin cannot delete their own account', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    $this->actingAs($admin)
        ->deleteJson("/admin/users/{$admin->id}")
        ->assertForbidden();
});

test('cashier cannot view sales transaction reports', function () {
    $cashier = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);

    $this->actingAs($cashier)
        ->get('/admin/api/sales/transactions')
        ->assertForbidden();
});

test('admin can view sales transaction reports', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    $this->actingAs($admin)
        ->get('/admin/api/sales/transactions')
        ->assertOk();
});

test('sales policy allows cashiers to view only their own sales', function () {
    $cashierA = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $cashierB = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);

    $sale = Sales::query()->create([
        'transaction_id' => 'TNX-TEST-001',
        'sub_total' => 10,
        'discount_amount' => 0,
        'discount_percentage' => 0,
        'grand_total' => 10,
        'status' => 'completed',
        'amount_paid' => 10,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'user_id' => $cashierB->id,
    ]);

    expect($cashierB->can('view', $sale))->toBeTrue();
    expect($cashierA->can('view', $sale))->toBeFalse();
    expect($cashierA->can('viewAny', Sales::class))->toBeFalse();
});

test('inventory staff cannot import products', function () {
    $inventoryUser = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);

    $this->actingAs($inventoryUser)
        ->post('/admin/imports/products/upload', [])
        ->assertForbidden();
});

test('inventory staff cannot access sales reports page', function () {
    $inventoryUser = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);

    $this->actingAs($inventoryUser)
        ->get('/admin/sale-reports')
        ->assertForbidden();
});

function createMinimalProductForPolicyTests(): Product
{
    $category = Category::query()->create([
        'name' => 'Policy Category',
        'description' => 'Test',
    ]);

    $supplier = Supplier::query()->create([
        'name' => 'Policy Contact',
        'company_name' => 'Policy Supplier',
        'email' => 'policy'.uniqid().'@example.com',
        'phone' => '1234567890',
        'address' => 'Test',
        'status' => 'active',
    ]);

    return Product::query()->create([
        'name' => 'Policy Product',
        'category_id' => $category->id,
        'supplier_id' => $supplier->id,
        'cost_price' => 5,
        'selling_price' => 10,
        'profit' => 5,
        'total_profit' => 0,
        'total_quantity' => 10,
        'quantity_sold' => 0,
        'quantity_left' => 10,
        'expiry_date' => now()->addMonths(3)->toDateString(),
        'has_expiry' => false,
        'track_batch' => false,
        'track_serial' => false,
        'reorder_level' => 5,
    ]);
}

test('inventory staff can delete products', function () {
    $inventoryUser = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);
    $product = createMinimalProductForPolicyTests();

    $this->actingAs($inventoryUser)
        ->deleteJson("/admin/products/{$product->id}")
        ->assertOk();
});
