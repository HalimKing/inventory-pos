<?php

use App\Models\CashierActivityLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\Sales;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Str;

function createCashierSale(User $cashier, array $overrides = []): Sales
{
    $category = Category::query()->create([
        'name' => 'Cashier Test Category',
        'description' => 'Test',
    ]);

    $supplier = Supplier::query()->create([
        'name' => 'Cashier Test Contact',
        'company_name' => 'Cashier Test Supplier',
        'email' => 'cashier-supplier'.uniqid().'@example.com',
        'phone' => '1234567890',
        'address' => 'Test Address',
        'status' => 'active',
    ]);

    $product = Product::query()->create([
        'name' => 'Cashier Test Product',
        'category_id' => $category->id,
        'supplier_id' => $supplier->id,
        'cost_price' => 5,
        'selling_price' => 10,
        'profit' => 5,
        'total_profit' => 0,
        'total_quantity' => 100,
        'quantity_sold' => 0,
        'quantity_left' => 100,
        'expiry_date' => now()->addMonths(3)->toDateString(),
        'has_expiry' => false,
        'track_batch' => false,
        'track_serial' => false,
        'reorder_level' => 5,
    ]);

    $sale = Sales::query()->create(array_merge([
        'transaction_id' => 'TXN-'.Str::upper(Str::random(8)),
        'customer_name' => 'Walk-in Customer',
        'sub_total' => 20,
        'user_id' => $cashier->id,
        'amount_paid' => 20,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'discount_percentage' => 0,
        'discount_amount' => 0,
        'grand_total' => 20,
        'status' => 'completed',
    ], $overrides));

    SaleItem::query()->create([
        'sale_id' => $sale->id,
        'product_id' => $product->id,
        'category_id' => $category->id,
        'product_name' => $product->name,
        'quantity' => 2,
        'price' => 10,
        'total_amount' => 20,
        'quantity_left' => 98,
        'quantity_sold' => 2,
        'profit' => 10,
    ]);

    return $sale->fresh(['saleItems']);
}

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('cashier can access transaction history page', function () {
    $cashier = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);

    $this->actingAs($cashier)
        ->get('/cashier/transactions')
        ->assertOk();
});

test('cashier can list only their own transactions', function () {
    $cashierA = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $cashierB = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);

    $ownSale = createCashierSale($cashierA, ['transaction_id' => 'TXN-OWN-001']);
    createCashierSale($cashierB, ['transaction_id' => 'TXN-OTHER-001']);

    $response = $this->actingAs($cashierA)
        ->getJson('/cashier/api/transactions')
        ->assertOk();

    expect($response->json('total'))->toBe(1);
    expect($response->json('data.0.transaction_id'))->toBe($ownSale->transaction_id);
});

test('cashier cannot view another cashiers transaction detail', function () {
    $cashierA = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $cashierB = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);

    $otherSale = createCashierSale($cashierB);

    $this->actingAs($cashierA)
        ->getJson("/cashier/api/transactions/{$otherSale->id}")
        ->assertForbidden();
});

test('cashier can view their own transaction detail', function () {
    $cashier = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $sale = createCashierSale($cashier);

    $this->actingAs($cashier)
        ->getJson("/cashier/api/transactions/{$sale->id}")
        ->assertOk()
        ->assertJsonPath('transaction_id', $sale->transaction_id)
        ->assertJsonCount(1, 'items');
});

test('cashier receipt reprint is logged', function () {
    $cashier = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    $sale = createCashierSale($cashier);

    $this->actingAs($cashier)
        ->postJson("/cashier/api/transactions/{$sale->id}/reprint-log", ['channel' => 'print'])
        ->assertOk()
        ->assertJson(['success' => true]);

    expect(CashierActivityLog::query()->where('action', 'receipt_reprint')->count())->toBe(1);
});

test('cashier can access reports page and data', function () {
    $cashier = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);
    createCashierSale($cashier);

    $this->actingAs($cashier)
        ->get('/cashier/reports')
        ->assertOk();

    $this->actingAs($cashier)
        ->getJson('/cashier/api/reports/data?period=daily')
        ->assertOk()
        ->assertJsonPath('summary.total_transactions', 1);
});

test('cashier report export is logged', function () {
    $cashier = User::factory()->withoutTwoFactor()->create(['role_id' => 3]);

    $this->actingAs($cashier)
        ->postJson('/cashier/api/reports/export-log', [
            'format' => 'pdf',
            'period' => 'daily',
        ])
        ->assertOk()
        ->assertJson(['success' => true]);

    expect(CashierActivityLog::query()->where('action', 'report_export')->count())->toBe(1);
});

test('admin cannot access cashier transaction history routes', function () {
    $admin = User::factory()->withoutTwoFactor()->create(['role_id' => 2]);

    $this->actingAs($admin)
        ->get('/cashier/transactions')
        ->assertForbidden();
});
