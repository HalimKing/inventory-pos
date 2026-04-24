<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransactionRequest;
use App\Models\CompanySetting;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\SaleItem;
use App\Models\Sales;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SalesController extends Controller
{

    //
    public function index(Request $request)
    {
        $productsData = $this->paginateSalesProducts($request)
            ->getCollection()
            ->values()
            ->all();
        $companySettings = CompanySetting::first();

        return Inertia::render('sales/index', [
            'productsData' => $productsData,
            'companySettings' => $companySettings,
        ]);
    }

    private function paginateSalesProducts(Request $request)
    {
        $perPage = max(1, min((int) $request->integer('per_page', 5), 20));
        $page = max(1, (int) $request->integer('page', 1));
        $search = trim((string) $request->query('search', ''));
        $categoryId = $request->query('category_id');
        $inventoryType = $request->query('inventory_type', 'all');

        $query = Product::with(['category', 'inventory'])
            ->orderBy('name');

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($categoryId && $categoryId !== 'all') {
            $query->where('category_id', $categoryId);
        }

        if ($inventoryType === 'perishable') {
            $query->where('has_expiry', true);
        } elseif ($inventoryType === 'non-perishable') {
            $query->where('has_expiry', false);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);
        $paginator->getCollection()->transform(function (Product $product) {
            return $this->formatSalesProduct($product);
        });

        return $paginator;
    }

    private function formatSalesProduct(Product $product): array
    {
        $nearestBatch = null;
        $batchStock = 0;

        if ($product->track_batch && $product->has_expiry) {
            $nearestBatch = ProductBatch::where('product_id', $product->id)
                ->where('quantity', '>', 0)
                ->whereDate('expiry_date', '>=', Carbon::today())
                ->orderBy('expiry_date')
                ->first();

            $batchStock = (int) ProductBatch::where('product_id', $product->id)
                ->where('quantity', '>', 0)
                ->whereDate('expiry_date', '>=', Carbon::today())
                ->sum('quantity');
        }

        $stock = $product->track_batch && $product->has_expiry
            ? $batchStock
            : (int) ($product->inventory?->quantity ?? $product->quantity_left);

        $effectiveExpiry = $product->track_batch && $product->has_expiry
            ? $nearestBatch?->expiry_date
            : ($product->inventory?->expiry_date ?? $product->expiry_date);

        $isExpired = $effectiveExpiry ? Carbon::parse($effectiveExpiry)->isPast() : false;
        $isNearExpiry = $effectiveExpiry
            ? Carbon::today()->diffInDays(Carbon::parse($effectiveExpiry), false) <= 30 && ! $isExpired
            : false;

        return [
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->category?->name,
            'barcode' => $product->barcode,
            'stock' => $stock,
            'price' => (float) $product->selling_price,
            'image' => $product->product_image,
            'has_expiry' => (bool) $product->has_expiry,
            'track_batch' => (bool) $product->track_batch,
            'track_serial' => (bool) $product->track_serial,
            'expiry_date' => $effectiveExpiry,
            'is_expired' => $isExpired,
            'is_near_expiry' => $isNearExpiry,
            'inventory_type' => $product->has_expiry ? 'perishable' : 'non-perishable',
            'selected_batch' => $nearestBatch ? [
                'id' => $nearestBatch->id,
                'batch_number' => $nearestBatch->batch_number,
                'expiry_date' => $nearestBatch->expiry_date,
            ] : null,
        ];
    }

    public function saveTransactions(StoreTransactionRequest $request): JsonResponse
    {
        DB::beginTransaction();

        try {
            $stockErrors = [];
            foreach ($request->items as $item) {
                $product = Product::with('inventory')->find($item['product_id']);
                if (!$product) {
                    $stockErrors[] = "Product with ID {$item['product_id']} not found.";
                    continue;
                }

                if ($product->track_batch && $product->has_expiry) {
                    $expiredBatchStock = (int) ProductBatch::where('product_id', $product->id)
                        ->where('quantity', '>', 0)
                        ->whereDate('expiry_date', '<', Carbon::today())
                        ->sum('quantity');

                    $availableBatches = ProductBatch::where('product_id', $product->id)
                        ->where('quantity', '>', 0)
                        ->whereDate('expiry_date', '>=', Carbon::today())
                        ->orderBy('expiry_date')
                        ->lockForUpdate()
                        ->get();

                    $availableStock = (int) $availableBatches->sum('quantity');

                    if ($availableStock <= 0 && $expiredBatchStock > 0) {
                        $stockErrors[] = "{$product->name} has only expired batches and cannot be sold.";
                        continue;
                    }

                    if ($availableStock < $item['quantity']) {
                        $stockErrors[] = "Insufficient stock for {$product->name}. Available: {$availableStock}, Requested: {$item['quantity']}";
                    }
                    continue;
                }

                $inventory = Inventory::where('product_id', $product->id)->lockForUpdate()->first();
                $availableStock = (int) ($inventory?->quantity ?? $product->quantity_left ?? 0);

                if ($product->has_expiry) {
                    $expiryDate = $inventory?->expiry_date ?? $product->expiry_date;
                    if ($expiryDate && Carbon::parse($expiryDate)->isPast()) {
                        $stockErrors[] = "{$product->name} is expired and cannot be sold.";
                        continue;
                    }
                }

                if ($availableStock < $item['quantity']) {
                    $stockErrors[] = "Insufficient stock for {$product->name}. Available: {$availableStock}, Requested: {$item['quantity']}";
                }
            }

            if (!empty($stockErrors)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Stock validation failed',
                    'errors' => $stockErrors
                ], 422);
            }

            // Save Transaction
            Log::info('Saving transaction', $request->all());

            // calculate grand total in
            $grandTotal = round($request->subtotal - $request->discount_amount, 2);

            $sale = new Sales();
            $sale->transaction_id = 'TNX-' . uniqid(10, false);
            $sale->user_id = Auth::id();
            $sale->sub_total = $request->subtotal;
            $sale->discount_amount = $request->discount_amount;
            $sale->discount_percentage = $request->discount_percentage;
            $sale->grand_total = $grandTotal;
            $sale->status = 'completed';
            $sale->amount_paid = $request->amount_received;
            $sale->change_amount = $request->change_amount;
            $sale->payment_method = $request->payment_method;
            $sale->customer_name = $request->customer_name;
            $sale->save();

            // Update Stock
            foreach ($request->items as $item) {
                $product = Product::with('inventory')->findOrFail($item['product_id']);
                $remaining = (int) $item['quantity'];

                if ($product->track_batch && $product->has_expiry) {
                    $batches = ProductBatch::where('product_id', $product->id)
                        ->where('quantity', '>', 0)
                        ->whereDate('expiry_date', '>=', Carbon::today())
                        ->orderBy('expiry_date')
                        ->lockForUpdate()
                        ->get();

                    foreach ($batches as $batch) {
                        if ($remaining <= 0) {
                            break;
                        }

                        $deductQty = min($remaining, (int) $batch->quantity);
                        $batch->quantity -= $deductQty;
                        $batch->save();

                        $remaining -= $deductQty;

                        $saleItems = new SaleItem();
                        $saleItems->product_id = $product->id;
                        $saleItems->product_batch_id = $batch->id;
                        $saleItems->category_id = $product->category_id;
                        $saleItems->sale_id = $sale->id;
                        $saleItems->product_name = $product->name;
                        $saleItems->quantity = $deductQty;
                        $saleItems->price = $product->selling_price;
                        $saleItems->total_amount = $deductQty * $product->selling_price;
                        $saleItems->quantity_left = max(0, (int) ($product->quantity_left - $item['quantity']));
                        $saleItems->quantity_sold = (int) $product->quantity_sold + $item['quantity'];
                        $saleItems->profit = $product->profit * $deductQty;
                        $saleItems->expiry_date = $batch->expiry_date;
                        $saleItems->save();
                    }
                } else {
                    $inventory = Inventory::where('product_id', $product->id)->lockForUpdate()->first();

                    if ($inventory) {
                        $inventory->quantity = max(0, (int) $inventory->quantity - $remaining);
                        if (!$product->has_expiry) {
                            $inventory->expiry_date = null;
                        }
                        $inventory->save();
                    }

                    $expiryDate = $inventory?->expiry_date ?? $product->expiry_date;

                    $saleItems = new SaleItem();
                    $saleItems->product_id = $product->id;
                    $saleItems->category_id = $product->category_id;
                    $saleItems->sale_id = $sale->id;
                    $saleItems->product_name = $product->name;
                    $saleItems->quantity = $item['quantity'];
                    $saleItems->price = $product->selling_price;
                    $saleItems->total_amount = $item['subtotal'];
                    $saleItems->quantity_left = max(0, (int) ($product->quantity_left - $item['quantity']));
                    $saleItems->quantity_sold = (int) $product->quantity_sold + $item['quantity'];
                    $saleItems->profit = $product->profit * $item['quantity'];
                    $saleItems->expiry_date = $expiryDate;
                    $saleItems->save();
                }

                $product->quantity_left = $this->availableStock($product);
                $product->quantity_sold += $item['quantity'];
                $product->save();
            }


            // Commit the transaction
            DB::commit();
            return response()->json(['success' => true, 'message' => 'Transaction saved successfully.']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Transaction failed: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'user_id' => Auth::id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Transaction failed. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function fetchAllProducts(Request $request): JsonResponse
    {
        return response()->json($this->paginateSalesProducts($request));
    }

    public function fetchProductByBarcode(string $barcode): JsonResponse
    {
        $product = Product::with(['category', 'inventory'])
            ->where('barcode', $barcode)
            ->first();

        if (!$product) {
            return response()->json([
                'message' => 'Product not found',
            ], 404);
        }

        if ($product->track_batch && $product->has_expiry) {
            $availableBatches = ProductBatch::where('product_id', $product->id)
                ->where('quantity', '>', 0)
                ->whereDate('expiry_date', '>=', Carbon::today())
                ->orderBy('expiry_date')
                ->get();

            if ($availableBatches->isEmpty()) {
                return response()->json([
                    'message' => 'Product is out of stock or all batches are expired.',
                ], 422);
            }

            $selectedBatch = $availableBatches->first();

            return response()->json([
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category?->name,
                'barcode' => $product->barcode,
                'stock' => (int) $availableBatches->sum('quantity'),
                'price' => (float) $product->selling_price,
                'image' => $product->product_image,
                'has_expiry' => (bool) $product->has_expiry,
                'track_batch' => (bool) $product->track_batch,
                'track_serial' => (bool) $product->track_serial,
                'expiry_date' => $selectedBatch->expiry_date,
                'is_expired' => false,
                'is_near_expiry' => Carbon::today()->diffInDays(Carbon::parse($selectedBatch->expiry_date), false) <= 30,
                'inventory_type' => 'perishable',
                'selected_batch' => [
                    'id' => $selectedBatch->id,
                    'batch_number' => $selectedBatch->batch_number,
                    'expiry_date' => $selectedBatch->expiry_date,
                ],
                'available_batches' => $availableBatches->map(fn($batch) => [
                    'id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'quantity' => (int) $batch->quantity,
                    'expiry_date' => $batch->expiry_date,
                ])->values(),
            ]);
        }

        $stock = (int) ($product->inventory?->quantity ?? $product->quantity_left ?? 0);
        $expiryDate = $product->inventory?->expiry_date ?? $product->expiry_date;
        $isExpired = $expiryDate ? Carbon::parse($expiryDate)->isPast() : false;

        if ($stock <= 0 || ($product->has_expiry && $isExpired)) {
            return response()->json([
                'message' => $stock <= 0
                    ? 'Product is out of stock.'
                    : 'Product batch is expired and cannot be sold.',
            ], 422);
        }

        return response()->json([
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->category?->name,
            'barcode' => $product->barcode,
            'stock' => $stock,
            'price' => (float) $product->selling_price,
            'image' => $product->product_image,
            'has_expiry' => (bool) $product->has_expiry,
            'track_batch' => (bool) $product->track_batch,
            'track_serial' => (bool) $product->track_serial,
            'expiry_date' => $expiryDate,
            'is_expired' => $isExpired,
            'is_near_expiry' => $expiryDate
                ? Carbon::today()->diffInDays(Carbon::parse($expiryDate), false) <= 30 && !$isExpired
                : false,
            'inventory_type' => $product->has_expiry ? 'perishable' : 'non-perishable',
            'selected_batch' => null,
            'available_batches' => [],
        ]);
    }

    /**
     * Sync offline sales from POS
     * Handles multiple sales that were created while offline
     */
    public function syncOfflineSales(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sales' => 'required|array|min:1',
            'sales.*.items' => 'required|array|min:1',
            'sales.*.items.*.product_id' => 'required|string',
            'sales.*.items.*.product_name' => 'required|string',
            'sales.*.items.*.quantity' => 'required|integer|min:1',
            'sales.*.items.*.price' => 'required|numeric',
            'sales.*.subtotal' => 'required|numeric',
            'sales.*.discount_amount' => 'numeric|min:0',
            'sales.*.discount_percentage' => 'numeric|min:0',
            'sales.*.grand_total' => 'required|numeric',
            'sales.*.amount_paid' => 'required|numeric',
            'sales.*.payment_method' => 'required|string',
            'sales.*.customer_name' => 'string|nullable',
            'sales.*.created_at' => 'required|date',
            'sales.*.offline_id' => 'required|string', // Unique ID for duplicate prevention
        ]);

        DB::beginTransaction();

        try {
            $results = [
                'success' => true,
                'synced_count' => 0,
                'failed_count' => 0,
                'errors' => [],
            ];

            foreach ($validated['sales'] as $saleData) {
                try {
                    // Check for duplicate sales using offline_id
                    $existingSale = Sales::where('offline_sync_id', $saleData['offline_id'])->first();
                    if ($existingSale) {
                        Log::info('Duplicate offline sale detected', ['offline_id' => $saleData['offline_id']]);
                        $results['synced_count']++;
                        continue;
                    }

                    // Validate stock availability
                    $stockErrors = [];
                    foreach ($saleData['items'] as $item) {
                        $product = Product::with('inventory')->find($item['product_id']);
                        if (!$product) {
                            $stockErrors[] = "Product with ID {$item['product_id']} not found.";
                            continue;
                        }

                        if ($product->track_batch && $product->has_expiry) {
                            $availableBatches = ProductBatch::where('product_id', $product->id)
                                ->where('quantity', '>', 0)
                                ->whereDate('expiry_date', '>=', Carbon::today())
                                ->sum('quantity');

                            if ($availableBatches < $item['quantity']) {
                                $stockErrors[] = "Insufficient stock for {$product->name}. Available: {$availableBatches}, Requested: {$item['quantity']}";
                            }
                        } else {
                            $inventory = Inventory::where('product_id', $product->id)->first();
                            $availableStock = (int) ($inventory?->quantity ?? $product->quantity_left ?? 0);

                            if ($availableStock < $item['quantity']) {
                                $stockErrors[] = "Insufficient stock for {$product->name}. Available: {$availableStock}, Requested: {$item['quantity']}";
                            }
                        }
                    }

                    if (!empty($stockErrors)) {
                        throw new \Exception(implode('; ', $stockErrors));
                    }

                    // Create sale
                    $sale = new Sales();
                    $sale->transaction_id = 'TNX-' . uniqid(10, false);
                    $sale->user_id = Auth::id();
                    $sale->sub_total = $saleData['subtotal'];
                    $sale->discount_amount = $saleData['discount_amount'] ?? 0;
                    $sale->discount_percentage = $saleData['discount_percentage'] ?? 0;
                    $sale->grand_total = $saleData['grand_total'];
                    $sale->status = 'completed';
                    $sale->amount_paid = $saleData['amount_paid'];
                    $sale->payment_method = $saleData['payment_method'];
                    $sale->customer_name = $saleData['customer_name'] ?? null;
                    $sale->offline_sync_id = $saleData['offline_id']; // Store offline ID
                    $sale->synced_at = now();
                    $sale->save();

                    // Process items and update stock
                    foreach ($saleData['items'] as $item) {
                        $product = Product::with('inventory')->findOrFail($item['product_id']);
                        $remaining = (int) $item['quantity'];

                        if ($product->track_batch && $product->has_expiry) {
                            $batches = ProductBatch::where('product_id', $product->id)
                                ->where('quantity', '>', 0)
                                ->whereDate('expiry_date', '>=', Carbon::today())
                                ->lockForUpdate()
                                ->orderBy('expiry_date')
                                ->get();

                            foreach ($batches as $batch) {
                                if ($remaining <= 0) break;

                                $deductQty = min($remaining, (int) $batch->quantity);
                                $batch->quantity -= $deductQty;
                                $batch->save();
                                $remaining -= $deductQty;

                                $saleItem = new SaleItem();
                                $saleItem->product_id = $product->id;
                                $saleItem->product_batch_id = $batch->id;
                                $saleItem->category_id = $product->category_id;
                                $saleItem->sale_id = $sale->id;
                                $saleItem->product_name = $product->name;
                                $saleItem->quantity = $deductQty;
                                $saleItem->price = $product->selling_price;
                                $saleItem->total_amount = $deductQty * $product->selling_price;
                                $saleItem->quantity_left = max(0, (int) ($product->quantity_left - $item['quantity']));
                                $saleItem->quantity_sold = (int) $product->quantity_sold + $item['quantity'];
                                $saleItem->profit = $product->profit * $deductQty;
                                $saleItem->expiry_date = $batch->expiry_date;
                                $saleItem->save();
                            }
                        } else {
                            $inventory = Inventory::where('product_id', $product->id)->lockForUpdate()->first();

                            if ($inventory) {
                                $inventory->quantity = max(0, (int) $inventory->quantity - $remaining);
                                if (!$product->has_expiry) {
                                    $inventory->expiry_date = null;
                                }
                                $inventory->save();
                            }

                            $expiryDate = $inventory?->expiry_date ?? $product->expiry_date;

                            $saleItem = new SaleItem();
                            $saleItem->product_id = $product->id;
                            $saleItem->category_id = $product->category_id;
                            $saleItem->sale_id = $sale->id;
                            $saleItem->product_name = $product->name;
                            $saleItem->quantity = $item['quantity'];
                            $saleItem->price = $product->selling_price;
                            $saleItem->total_amount = $item['quantity'] * $product->selling_price;
                            $saleItem->quantity_left = max(0, (int) ($product->quantity_left - $item['quantity']));
                            $saleItem->quantity_sold = (int) $product->quantity_sold + $item['quantity'];
                            $saleItem->profit = $product->profit * $item['quantity'];
                            $saleItem->expiry_date = $expiryDate;
                            $saleItem->save();
                        }

                        $product->quantity_left = $this->availableStock($product);
                        $product->quantity_sold += $item['quantity'];
                        $product->save();
                    }

                    $results['synced_count']++;
                    Log::info('Offline sale synced successfully', ['offline_id' => $saleData['offline_id'], 'sale_id' => $sale->id]);
                } catch (\Exception $e) {
                    $results['failed_count']++;
                    $results['success'] = false;
                    $results['errors'][] = [
                        'offline_id' => $saleData['offline_id'] ?? 'unknown',
                        'message' => $e->getMessage(),
                    ];
                    Log::error('Failed to sync offline sale', [
                        'offline_id' => $saleData['offline_id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            DB::commit();

            return response()->json($results, $results['success'] ? 200 : 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Batch sync failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Batch sync failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function availableStock(Product $product): int
    {
        if ($product->track_batch && $product->has_expiry) {
            return (int) ProductBatch::where('product_id', $product->id)
                ->where('quantity', '>', 0)
                ->whereDate('expiry_date', '>=', Carbon::today())
                ->sum('quantity');
        }

        return (int) ($product->inventory?->quantity ?? $product->quantity_left ?? 0);
    }
}
