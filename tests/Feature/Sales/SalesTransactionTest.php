<?php

use App\Http\Controllers\SalesDetailsController;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Sales;
use App\Models\Supplier;
use App\Models\User;
use App\Services\SalesService;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

function createPosCatalogProduct(int $stock = 10): Product
{
    $category = Category::query()->create([
        'name' => 'Test Category',
        'description' => 'Test',
    ]);

    $supplier = Supplier::query()->create([
        'name' => 'Test Contact',
        'company_name' => 'Test Supplier Co',
        'email' => 'supplier'.uniqid().'@example.com',
        'phone' => '1234567890',
        'address' => 'Test Address',
        'status' => 'active',
    ]);

    $product = Product::query()->create([
        'name' => 'Test Product',
        'category_id' => $category->id,
        'supplier_id' => $supplier->id,
        'cost_price' => 5,
        'selling_price' => 10,
        'profit' => 5,
        'total_profit' => 0,
        'total_quantity' => $stock,
        'quantity_sold' => 0,
        'quantity_left' => $stock,
        'expiry_date' => now()->addMonths(3)->toDateString(),
        'has_expiry' => false,
        'track_batch' => false,
        'track_serial' => false,
        'reorder_level' => 5,
    ]);

    Inventory::query()->create([
        'product_id' => $product->id,
        'quantity' => $stock,
        'expiry_date' => null,
    ]);

    return $product->fresh(['inventory', 'category']);
}

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('online sale deducts inventory stock', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $product = createPosCatalogProduct(stock: 10);

    $response = $this->actingAs($user)->postJson('/cashier/sales/save/transaction', [
        'items' => [
            [
                'product_id' => (string) $product->id,
                'quantity' => 3,
                'price' => 10,
                'subtotal' => 30,
            ],
        ],
        'customer_name' => 'Walk-in Customer',
        'subtotal' => 30,
        'discount_amount' => 0,
        'discount_percentage' => 0,
        'total_amount' => 30,
        'payment_method' => 'cash',
        'amount_received' => 30,
        'change_amount' => 0,
    ]);

    $response->assertOk()->assertJson(['success' => true]);

    expect(Inventory::query()->where('product_id', $product->id)->value('quantity'))->toBe(7);
    expect(Sales::query()->count())->toBe(1);
});

test('online sale fails when stock is insufficient', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $product = createPosCatalogProduct(stock: 2);

    $response = $this->actingAs($user)->postJson('/cashier/sales/save/transaction', [
        'items' => [
            [
                'product_id' => (string) $product->id,
                'quantity' => 5,
                'price' => 10,
                'subtotal' => 50,
            ],
        ],
        'customer_name' => 'Walk-in Customer',
        'subtotal' => 50,
        'discount_amount' => 0,
        'discount_percentage' => 0,
        'total_amount' => 50,
        'payment_method' => 'cash',
        'amount_received' => 50,
        'change_amount' => 0,
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['errors']);

    expect(Inventory::query()->where('product_id', $product->id)->value('quantity'))->toBe(2);
    expect(Sales::query()->count())->toBe(0);
});

test('offline sync is idempotent for duplicate offline ids', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $product = createPosCatalogProduct(stock: 10);
    $offlineId = 'offline-sale-'.uniqid();

    $payload = [
        'sales' => [
            [
                'items' => [
                    [
                        'product_id' => (string) $product->id,
                        'product_name' => $product->name,
                        'quantity' => 2,
                        'price' => 10,
                    ],
                ],
                'subtotal' => 20,
                'discount_amount' => 0,
                'discount_percentage' => 0,
                'grand_total' => 20,
                'amount_paid' => 20,
                'payment_method' => 'cash',
                'customer_name' => 'Offline Customer',
                'created_at' => now()->toIso8601String(),
                'offline_id' => $offlineId,
            ],
        ],
    ];

    $first = $this->actingAs($user)->postJson('/api/sales/sync', $payload);
    $second = $this->actingAs($user)->postJson('/api/sales/sync', $payload);

    $first->assertOk()->assertJsonPath('synced_count', 1);
    $second->assertOk()->assertJsonPath('synced_count', 1);

    expect(Sales::query()->where('offline_sync_id', $offlineId)->count())->toBe(1);
    expect(Inventory::query()->where('product_id', $product->id)->value('quantity'))->toBe(8);
});

test('offline sync fails when stock is insufficient', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $product = createPosCatalogProduct(stock: 1);

    $response = $this->actingAs($user)->postJson('/api/sales/sync', [
        'sales' => [
            [
                'items' => [
                    [
                        'product_id' => (string) $product->id,
                        'product_name' => $product->name,
                        'quantity' => 4,
                        'price' => 10,
                    ],
                ],
                'subtotal' => 40,
                'discount_amount' => 0,
                'discount_percentage' => 0,
                'grand_total' => 40,
                'amount_paid' => 40,
                'payment_method' => 'cash',
                'customer_name' => 'Offline Customer',
                'created_at' => now()->toIso8601String(),
                'offline_id' => 'offline-sale-'.uniqid(),
            ],
        ],
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonPath('failed_count', 1);

    expect(Sales::query()->count())->toBe(0);
    expect(Inventory::query()->where('product_id', $product->id)->value('quantity'))->toBe(1);
});

test('a partial refund restores stock and updates the original sale status', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $product = createPosCatalogProduct(stock: 10);

    $sale = app(SalesService::class)->processSale([
        'items' => [[
            'product_id' => (string) $product->id,
            'quantity' => 4,
            'price' => 10,
            'subtotal' => 40,
        ]],
        'subtotal' => 40,
        'discount_amount' => 0,
        'discount_percentage' => 0,
        'grand_total' => 40,
        'amount_paid' => 40,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'customer_name' => 'Customer',
    ], $user->id);

    $saleItem = $sale->saleItems()->first();

    $response = $this->actingAs($user)->postJson('/cashier/api/transactions/'.$sale->id.'/refund', [
        'reason' => 'Customer changed mind',
        'items' => [[
            'sale_item_id' => $saleItem->id,
            'quantity' => 2,
        ]],
    ]);

    $response->assertOk()->assertJson(['success' => true]);

    $sale->refresh();
    $saleItem->refresh();

    $refundSale = Sales::query()->where('refund_of_sale_id', $sale->id)->first();

    expect($sale->status)->toBe('partially_refunded');
    expect($saleItem->refunded_quantity)->toBe(2);
    expect(Inventory::query()->where('product_id', $product->id)->value('quantity'))->toBe(8);
    expect($refundSale)->not->toBeNull();
    expect($refundSale?->grand_total)->toBe(-20);
    expect(Sales::query()->where('refund_of_sale_id', $sale->id)->count())->toBe(1);
});

test('admin transaction reports exclude refund records and use net revenue', function () {
    $admin = User::factory()->withoutTwoFactor()->create([
        'role_id' => 2,
        'email_verified_at' => now(),
    ]);
    $product = createPosCatalogProduct(stock: 10);

    $sale = app(SalesService::class)->processSale([
        'items' => [[
            'product_id' => (string) $product->id,
            'quantity' => 3,
            'price' => 10,
            'subtotal' => 30,
        ]],
        'subtotal' => 30,
        'discount_amount' => 0,
        'discount_percentage' => 0,
        'grand_total' => 30,
        'amount_paid' => 30,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'customer_name' => 'Customer',
    ], $admin->id);

    $saleItem = $sale->saleItems()->first();

    $refundSale = app(SalesService::class)->refundSale($sale, [
        'reason' => 'Customer changed mind',
        'items' => [[
            'sale_item_id' => $saleItem->id,
            'quantity' => 1,
        ]],
    ], $admin);

    expect($refundSale->grand_total)->toBe(-10.0);

    Gate::before(fn ($user, $ability) => true);
    $this->actingAs($admin);

    $response = app(SalesDetailsController::class)->transactions();
    $transactions = $response->getData(true);

    expect($response->status())->toBe(200);
    expect($transactions)->toHaveCount(2);
    expect(collect($transactions)->sum('grandTotal'))->toBe(20);
});
