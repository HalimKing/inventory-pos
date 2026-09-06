<?php

use App\Http\Controllers\Admin\SystemLogController;
use App\Http\Controllers\Cashier\CashierReportController;
use App\Http\Controllers\Cashier\CashierTransactionController;
use App\Http\Controllers\CashierDashboardController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImportProductController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\RolesController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\SalesDetailsController;
use App\Http\Controllers\SalesReportController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    // return Inertia::render('welcome', [
    //     'canRegister' => Features::enabled(Features::registration()),
    // ]);
    return redirect()->route('login');
})->name('home');

/*
|--------------------------------------------------------------------------
| Authenticated & Verified Routes
|--------------------------------------------------------------------------
*/

// Route::get('/dashboard', function () {
// })->middleware(['auth', 'redirect.role'])->name('dashboard');
Route::get('dashboard', [DashboardController::class, 'index'])->middleware(['auth', 'redirect.role'])->name('dashboard');

Route::middleware(['auth', 'role:supper admin,admin,cashier'])->group(function () {
    Route::get('api/products/barcode/{barcode}', [SalesController::class, 'fetchProductByBarcode']);
    Route::get('api/categories/fetch', [CategoryController::class, 'fetchCategories']);
    Route::post('api/sales/sync', [SalesController::class, 'syncOfflineSales']);
});

// Cashier Route
Route::middleware(['auth', 'role:cashier'])->prefix('cashier')->name('cashier.')->group(function () {
    Route::get('dashboard', [CashierDashboardController::class, 'index'])->name('dashboard');
    Route::get('/api/cashier/dashboard', [CashierDashboardController::class, 'getDashboardData']);

    Route::prefix('sales')->group(function () {
        Route::get('products/fetch-all-products', [SalesController::class, 'fetchAllProducts']);
        Route::post('save/transaction', [SalesController::class, 'saveTransactions']);
        Route::get('/', [SalesController::class, 'index']);
    });

    Route::get('transactions', [CashierTransactionController::class, 'index'])->name('transactions.index');
    Route::get('api/transactions', [CashierTransactionController::class, 'list']);
    Route::get('api/transactions/{sale}', [CashierTransactionController::class, 'show']);
    Route::post('api/transactions/{sale}/refund', [SalesController::class, 'refundTransaction']);
    Route::post('api/transactions/{sale}/reprint-log', [CashierTransactionController::class, 'logReprint']);
    Route::post('api/transactions/{sale}/resend-receipt', [CashierTransactionController::class, 'resendReceipt']);

    Route::get('reports', [CashierReportController::class, 'index'])->name('reports.index');
    Route::get('api/reports/data', [CashierReportController::class, 'data']);
    Route::post('api/reports/export-log', [CashierReportController::class, 'logExport']);
});

Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {

    // Admin-only access (supper admin + admin)
    Route::middleware('role:supper admin,admin')->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('api/dashboard/data', [DashboardController::class, 'getDashboardData']);

        Route::post('imports/products/upload', [ImportProductController::class, 'import'])
            ->name('imports.products.upload');

        Route::get('api/sales/all-users', [UserController::class, 'allUsers']);
        Route::get('api/roles/all-roles', [RolesController::class, 'allRoles']);
        Route::get('api/users/{id}/status', [UserController::class, 'updateStatus']);

        Route::prefix('sales')->group(function () {
            Route::get('/', [SalesController::class, 'index']);
            Route::get('products/fetch-all-products', [SalesController::class, 'fetchAllProducts']);
            Route::post('save/transaction', [SalesController::class, 'saveTransactions']);
        });

        Route::prefix('api/sales')->group(function () {
            Route::get('sales-details', [SalesDetailsController::class, 'salesDetails']);
            Route::get('transactions', [SalesDetailsController::class, 'transactions']);
            Route::get('transactions/{id}/sale-items', [SalesDetailsController::class, 'saleItems']);
            Route::get('transactions/{id}/details', [SalesDetailsController::class, 'transactionDetails']);
            Route::post('transactions/{sale}/refund', [SalesController::class, 'refundTransaction']);
        });

        Route::resource('users', UserController::class);
        Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword']);
        Route::get('sale-reports', [SalesReportController::class, 'index']);

        Route::prefix('settings')->group(function () {
            Route::get('index', [SettingsController::class, 'index'])->name('settings.index');
            Route::post('update', [SettingsController::class, 'update']);
        });

        Route::get('system-logs', [SystemLogController::class, 'index'])->name('system-logs.index');
        Route::middleware('audit.api')->prefix('api/system-logs')->group(function () {
            Route::get('/', [SystemLogController::class, 'list']);
            Route::get('/export', [SystemLogController::class, 'export']);
            Route::get('/{systemLog}', [SystemLogController::class, 'show']);
            Route::put('/settings/retention', [SystemLogController::class, 'updateSettings']);
            Route::post('/purge', [SystemLogController::class, 'purge']);
            Route::post('/backup', [SystemLogController::class, 'runBackup']);
        });
    });

    // Shared inventory management access (supper admin + admin + inventory)
    Route::middleware('role:supper admin,admin,inventory')->group(function () {
        Route::prefix('categories')->group(function () {
            Route::get('fetch-categories', [CategoryController::class, 'fetchCategories']);
            Route::get('data/fetch/all-categories', [CategoryController::class, 'fetchAllCategories']);
            Route::post('/bulk-delete/categories', [CategoryController::class, 'bulkDelete']);
        });

        Route::prefix('suppliers')->group(function () {
            Route::get('fetch-suppliers', [SupplierController::class, 'fetchAllSuppliers']);
            Route::get('data/fetch/all-suppliers', [SupplierController::class, 'fetchSuppliersData']);
            Route::get('{id}/status', [SupplierController::class, 'updateStatus']);
        });

        Route::prefix('products')->group(function () {
            Route::get('data/fetch/all-products', [ProductController::class, 'fetchProductsData']);
            Route::post('{product}/stock', [ProductController::class, 'addStock'])->name('products.stock.add');
            Route::get('{product}/stock-movements', [ProductController::class, 'stockMovements'])->name('products.stock.movements');
            Route::post('{product}/batches', [ProductController::class, 'storeBatch']);
            Route::put('{product}/batches/{batch}', [ProductController::class, 'updateBatch']);
            Route::delete('{product}/batches/{batch}', [ProductController::class, 'destroyBatch']);
        });

        Route::resource('categories', CategoryController::class);
        Route::resource('suppliers', SupplierController::class);
        Route::resource('products', ProductController::class);
    });
});

require __DIR__.'/settings.php';
