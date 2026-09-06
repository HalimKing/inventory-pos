<?php

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Enums\StockMovementType;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function createStockManagedProduct(int $stock = 20): Product
{
    $category = Category::query()->create([
        'name' => 'Stock Category '.uniqid(),
        'description' => 'Test',
    ]);

    $supplier = Supplier::query()->create([
        'name' => 'Stock Contact',
        'company_name' => 'Stock Supplier',
        'email' => 'stock'.uniqid().'@example.com',
        'phone' => '1234567890',
        'address' => 'Test',
        'status' => 'active',
    ]);

    $product = Product::query()->create([
        'name' => "Men's Suit",
        'category_id' => $category->id,
        'supplier_id' => $supplier->id,
        'cost_price' => 50,
        'selling_price' => 100,
        'profit' => 50,
        'total_profit' => 50 * $stock,
        'total_quantity' => $stock,
        'quantity_sold' => 0,
        'quantity_left' => $stock,
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

    return $product->fresh(['inventory']);
}

test('inventory staff can add stock to an existing product', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);
    $product = createStockManagedProduct(20);

    $response = $this->actingAs($user)->postJson("/admin/products/{$product->id}/stock", [
        'quantity' => 15,
        'notes' => 'Supplier delivery',
    ]);

    $response->assertOk()
        ->assertJsonPath('product.quantityLeft', 35)
        ->assertJsonPath('movement.quantityDelta', 15);

    $product->refresh();
    expect((int) $product->quantity_left)->toBe(35);
    expect((int) $product->inventory->fresh()->quantity)->toBe(35);
    expect((int) $product->total_quantity)->toBe(35);

    $this->assertDatabaseHas('stock_movements', [
        'product_id' => $product->id,
        'type' => StockMovementType::StockIn->value,
        'quantity_delta' => 15,
        'quantity_before' => 20,
        'quantity_after' => 35,
        'user_id' => $user->id,
    ]);
});

test('adding stock does not create a duplicate product', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);
    createStockManagedProduct(20);

    $beforeCount = Product::query()->where('name', "Men's Suit")->count();

    $product = Product::query()->where('name', "Men's Suit")->firstOrFail();

    $this->actingAs($user)->postJson("/admin/products/{$product->id}/stock", [
        'quantity' => 15,
    ])->assertOk();

    expect(Product::query()->where('name', "Men's Suit")->count())->toBe($beforeCount);
});

test('sales create stock movement history entries', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $product = createStockManagedProduct(10);

    $this->actingAs($user)->postJson('/cashier/sales/save/transaction', [
        'items' => [
            [
                'product_id' => (string) $product->id,
                'quantity' => 3,
                'price' => 100,
                'subtotal' => 300,
            ],
        ],
        'customer_name' => 'Walk-in',
        'subtotal' => 300,
        'discount_amount' => 0,
        'discount_percentage' => 0,
        'total_amount' => 300,
        'payment_method' => 'cash',
        'amount_received' => 300,
        'change_amount' => 0,
    ])->assertOk();

    $this->assertDatabaseHas('stock_movements', [
        'product_id' => $product->id,
        'type' => StockMovementType::Sale->value,
        'quantity_delta' => -3,
        'quantity_before' => 10,
        'quantity_after' => 7,
    ]);

    expect((int) $product->fresh()->quantity_left)->toBe(7);
});

test('stock history endpoint returns movements for a product', function () {
    $user = User::factory()->withoutTwoFactor()->create(['role_id' => 4]);
    $product = createStockManagedProduct(20);

    $this->actingAs($user)->postJson("/admin/products/{$product->id}/stock", [
        'quantity' => 5,
    ])->assertOk();

    $this->actingAs($user)
        ->getJson("/admin/products/{$product->id}/stock-movements")
        ->assertOk()
        ->assertJsonPath('productId', $product->id)
        ->assertJsonCount(1, 'movements');
});

test('cashier cannot add stock to products', function () {
    $cashier = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $product = createStockManagedProduct(20);

    $this->actingAs($cashier)
        ->postJson("/admin/products/{$product->id}/stock", [
            'quantity' => 5,
        ])
        ->assertForbidden();
});
