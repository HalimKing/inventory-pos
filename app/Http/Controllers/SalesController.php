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
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SalesController extends Controller
{

    //
    public function index()
    {
        $productsData = $this->allProducts();
        $companySettings = CompanySetting::first();
        return Inertia::render('sales/index', compact('productsData', 'companySettings'));
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
            $sale->user_id = auth()->id() ?? null;
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
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Transaction failed. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    private function allProducts()
    {
        $products = Product::with('category', 'inventory')->get();
        $productsData = $products->map(function ($product) {
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
            $isNearExpiry = $effectiveExpiry ? Carbon::today()->diffInDays(Carbon::parse($effectiveExpiry), false) <= 30 && !$isExpired : false;

            return [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category->name,
                'barcode' => $product->barcode,
                'stock' => $stock,
                'price' => $product->selling_price,
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
        });

        return $productsData;
    }

    public function fetchAllProducts()
    {
        return response()->json($this->allProducts());
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
