<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductBatch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
        $products = $this->fetchProducts();
        return Inertia::render('products/index', compact('products'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|integer|max:255|exists:categories,id',
            'supplier' => 'required|integer|max:255|exists:suppliers,id',
            'barcode' => 'nullable|string|max:100|unique:products,barcode',
            'totalQuantity' => 'required|integer|min:0',
            'sellingPrice' => 'required|numeric|min:1|max:1000000.00',
            'costPrice' => 'required|numeric|min:1|max:10000000.00',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'expiryDate' => 'nullable|date',
            'reorderLevel' => 'required|integer|min:1|max:10000',
            'hasExpiry' => 'nullable|boolean',
            'trackBatch' => 'nullable|boolean',
            'trackSerial' => 'nullable|boolean',
        ]);

        $hasExpiry = (bool) ($validated['hasExpiry'] ?? false);
        $trackBatch = (bool) ($validated['trackBatch'] ?? false);
        $trackSerial = (bool) ($validated['trackSerial'] ?? false);

        if ($trackBatch && !$hasExpiry) {
            return redirect()->route('admin.products.index')
                ->withErrors(['trackBatch' => 'Batch tracking requires expiry tracking to be enabled.']);
        }

        if ($hasExpiry && empty($validated['expiryDate'])) {
            return redirect()->route('admin.products.index')
                ->withErrors(['expiryDate' => 'Expiry date is required when expiry tracking is enabled.']);
        }

        try {
            DB::beginTransaction();

            $product = new Product();

            $product->name = $validated['name'];
            $product->category_id = $validated['category'];
            $product->supplier_id = $validated['supplier'];
            $product->barcode = $validated['barcode'] ?? null;
            $product->total_quantity = (int) $validated['totalQuantity'];
            $product->selling_price = (float) $validated['sellingPrice'];
            $product->cost_price = (float) $validated['costPrice'];
            $product->expiry_date = $hasExpiry && !$trackBatch ? $validated['expiryDate'] : null;
            $product->has_expiry = $hasExpiry;
            $product->track_batch = $trackBatch;
            $product->track_serial = $trackSerial;
            $product->profit = $product->selling_price - $product->cost_price;
            $product->total_profit = $product->profit * $product->total_quantity;
            $product->quantity_left = $product->total_quantity;
            $product->quantity_sold = 0;
            $product->reorder_level = (int) $validated['reorderLevel'];

            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $path = $image->store('images', 'public');
                $product->product_image = $path;
            }

            $product->save();

            if (empty($product->barcode)) {
                $product->barcode = $this->generateBarcode($product->id);
                $product->save();
            }

            $this->syncStockStorage(
                product: $product,
                requestedQuantity: (int) $validated['totalQuantity'],
                expiryDate: $validated['expiryDate'] ?? null,
                createBatchOnDelta: true,
            );

            DB::commit();

            return redirect()->route('admin.products.index')
                ->with('success', 'Product created Successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e->getMessage());
            if ($request->hasFile('image')) {
                unlink(public_path('images/' . $request->image));
            }
            return redirect()->route('admin.products.index')
                ->with('error', 'Something went wrong!');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:products,name,' . $product->id,
            'category' => 'required|integer|max:255|exists:categories,id',
            'supplier' => 'required|integer|max:255|exists:suppliers,id',
            'barcode' => 'nullable|string|max:100|unique:products,barcode,' . $product->id,
            'totalQuantity' => 'required|integer|min:0',
            'sellingPrice' => 'required|numeric|min:1|max:1000000.00',
            'costPrice' => 'required|numeric|min:1|max:10000000.00',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'expiryDate' => 'nullable|date',
            'reorderLevel' => 'required|integer|min:1|max:100',
            'hasExpiry' => 'nullable|boolean',
            'trackBatch' => 'nullable|boolean',
            'trackSerial' => 'nullable|boolean',
        ]);

        $hasExpiry = (bool) ($validated['hasExpiry'] ?? false);
        $trackBatch = (bool) ($validated['trackBatch'] ?? false);
        $trackSerial = (bool) ($validated['trackSerial'] ?? false);

        if ($trackBatch && !$hasExpiry) {
            return redirect()->route('admin.products.index')
                ->withErrors(['trackBatch' => 'Batch tracking requires expiry tracking to be enabled.']);
        }

        if ($hasExpiry && empty($validated['expiryDate'])) {
            return redirect()->route('admin.products.index')
                ->withErrors(['expiryDate' => 'Expiry date is required when expiry tracking is enabled.']);
        }

        DB::beginTransaction();

        try {
            $previousTotal = (int) $product->total_quantity;
            $requestedTotal = (int) $validated['totalQuantity'];

            $product->name = $validated['name'];
            $product->category_id = $validated['category'];
            $product->supplier_id = $validated['supplier'];
            $product->barcode = $validated['barcode'] ?? $product->barcode;
            $product->selling_price = (float) $validated['sellingPrice'];
            $product->cost_price = (float) $validated['costPrice'];
            $product->expiry_date = $hasExpiry && !$trackBatch ? $validated['expiryDate'] : null;
            $product->has_expiry = $hasExpiry;
            $product->track_batch = $trackBatch;
            $product->track_serial = $trackSerial;
            $product->profit = $product->selling_price - $product->cost_price;
            $product->reorder_level = (int) $validated['reorderLevel'];

            if (!$trackBatch) {
                $delta = $requestedTotal - $previousTotal;
                $product->quantity_left = max(0, (int) $product->quantity_left + $delta);
                $product->total_quantity = $requestedTotal;
            }

            if ($request->hasFile('image')) {
                $this->deleteProductImageIfExists($product->product_image);

                $image = $request->file('image');
                $path = $image->store('images', 'public');
                $product->product_image = $path;
            }

            $product->save();

            if (empty($product->barcode)) {
                $product->barcode = $this->generateBarcode($product->id);
                $product->save();
            }

            $this->syncStockStorage(
                product: $product,
                requestedQuantity: $requestedTotal,
                expiryDate: $validated['expiryDate'] ?? null,
                createBatchOnDelta: true,
            );

            $product->total_profit = $product->profit * (int) $product->total_quantity;
            $product->save();

            DB::commit();

            return redirect()->route('admin.products.index')
                ->with('success', 'Product updated Successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e->getMessage());

            return redirect()->route('admin.products.index')
                ->with('error', 'Something went wrong!');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        //
        // delete image
        try {
            $this->deleteProductImageIfExists($product->product_image);

            $product->delete();

            return response()->json(['message' => 'Product deleted successfully.']);
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return response()->json(['error' => 'Something went wrong.'], 500);
        }
    }

    private function deleteProductImageIfExists(?string $relativePath): void
    {
        if (empty($relativePath)) {
            return;
        }

        $fullPath = public_path('storage/' . ltrim($relativePath, '/'));

        if (is_file($fullPath)) {
            unlink($fullPath);
        }
    }

    private function fetchProducts()
    {
        $products = Product::with('category', 'supplier', 'inventory', 'productBatches')->get();
        $productsData = $products->map(function ($product) {
            $hasStoredBatches = $product->productBatches->isNotEmpty();
            $effectiveTrackBatch = (bool) $product->track_batch || ($product->has_expiry && $hasStoredBatches);
            $effectiveExpiryDate = $this->effectiveExpiryDate($product);

            if ($product->quantity_left == 0) {
                $status = 'out-of-stock';
            } elseif ($product->has_expiry && $effectiveExpiryDate && now()->greaterThan($effectiveExpiryDate)) {
                $status = 'expired';
            } elseif ($product->has_expiry && $effectiveExpiryDate && now()->diffInDays($effectiveExpiryDate, false) <= 30) {
                $status = 'near-expiry';
            } elseif ($product->quantity_left <= $product->reorder_level) {
                $status = 'low-stock';
            } else {
                $status = 'in-stock';
            }
            return [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category->name,
                'category_id' => $product->category_id,
                'supplier' => $product->supplier->name,
                'supplier_id' => $product->supplier_id,
                'barcode' => $product->barcode,
                'totalQuantity' => $product->total_quantity,
                'quantityLeft' => $product->quantity_left,
                'quantitySold' => $product->quantity_sold,
                'sellingPrice' => $product->selling_price,
                'initialAmount' => $product->cost_price,
                'profit' => $product->profit,
                'unitProfit' => $product->total_profit,
                'image' => $product->product_image,
                'expiryDate' => $effectiveExpiryDate,
                'reorderLevel' => $product->reorder_level,
                'status' => $status,
                'hasExpiry' => (bool) $product->has_expiry,
                'trackBatch' => $effectiveTrackBatch,
                'trackSerial' => (bool) $product->track_serial,
                'stockMode' => $effectiveTrackBatch ? 'batch' : 'inventory',
                'batchCount' => $product->productBatches->count(),
                'batches' => $product->productBatches
                    ->where('quantity', '>', 0)
                    ->sortBy('expiry_date')
                    ->values()
                    ->map(fn($batch) => [
                        'id' => $batch->id,
                        'batchNumber' => $batch->batch_number,
                        'quantity' => $batch->quantity,
                        'expiryDate' => $batch->expiry_date,
                    ]),
            ];
        });
        return $productsData;
    }

    public function fetchProductsData()
    {
        return response()->json($this->fetchProducts());
    }

    public function storeBatch(Request $request, Product $product)
    {
        if (!$product->has_expiry || !$product->track_batch) {
            return response()->json([
                'message' => 'This product does not use batch tracking.',
            ], 422);
        }

        $validated = $request->validate([
            'batchNumber' => 'required|string|max:255|unique:product_batches,batch_number',
            'quantity' => 'required|integer|min:1',
            'expiryDate' => 'required|date',
        ]);

        DB::beginTransaction();

        try {
            ProductBatch::create([
                'product_id' => $product->id,
                'batch_number' => $validated['batchNumber'],
                'quantity' => (int) $validated['quantity'],
                'expiry_date' => $validated['expiryDate'],
            ]);

            $this->recalculateBatchTrackedStock($product);

            DB::commit();

            return response()->json(['message' => 'Batch added successfully.']);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error($e->getMessage());

            return response()->json([
                'message' => 'Failed to add batch.',
            ], 500);
        }
    }

    public function updateBatch(Request $request, Product $product, ProductBatch $batch)
    {
        if ($batch->product_id !== $product->id) {
            return response()->json([
                'message' => 'Batch does not belong to this product.',
            ], 422);
        }

        if (!$product->has_expiry || !$product->track_batch) {
            return response()->json([
                'message' => 'This product does not use batch tracking.',
            ], 422);
        }

        $validated = $request->validate([
            'batchNumber' => 'required|string|max:255|unique:product_batches,batch_number,' . $batch->id,
            'quantity' => 'required|integer|min:0',
            'expiryDate' => 'required|date',
        ]);

        DB::beginTransaction();

        try {
            $batch->batch_number = $validated['batchNumber'];
            $batch->quantity = (int) $validated['quantity'];
            $batch->expiry_date = $validated['expiryDate'];
            $batch->save();

            $this->recalculateBatchTrackedStock($product);

            DB::commit();

            return response()->json(['message' => 'Batch updated successfully.']);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error($e->getMessage());

            return response()->json([
                'message' => 'Failed to update batch.',
            ], 500);
        }
    }

    public function destroyBatch(Product $product, ProductBatch $batch)
    {
        if ($batch->product_id !== $product->id) {
            return response()->json([
                'message' => 'Batch does not belong to this product.',
            ], 422);
        }

        DB::beginTransaction();

        try {
            $batch->delete();
            $this->recalculateBatchTrackedStock($product);

            DB::commit();

            return response()->json(['message' => 'Batch removed successfully.']);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error($e->getMessage());

            return response()->json([
                'message' => 'Failed to remove batch.',
            ], 500);
        }
    }

    private function syncStockStorage(Product $product, int $requestedQuantity, ?string $expiryDate, bool $createBatchOnDelta = false): void
    {
        $hasStoredBatches = $product->productBatches()->exists();
        $effectiveTrackBatch = (bool) $product->track_batch || ($product->has_expiry && $hasStoredBatches);

        if ($effectiveTrackBatch && $product->has_expiry) {
            $currentBatchQty = (int) $product->productBatches()->sum('quantity');
            $delta = $requestedQuantity - $currentBatchQty;

            if ($delta > 0 && $createBatchOnDelta) {
                ProductBatch::create([
                    'product_id' => $product->id,
                    'batch_number' => $this->generateBatchNumber($product),
                    'quantity' => $delta,
                    'expiry_date' => $expiryDate,
                ]);
            }

            if ($delta < 0) {
                $this->shrinkBatchStock($product, abs($delta));
            }

            $available = (int) $product->productBatches()->sum('quantity');
            $product->quantity_left = $available;
            $product->total_quantity = $available + (int) $product->quantity_sold;
            $product->expiry_date = null;
            $product->save();

            Inventory::updateOrCreate(
                ['product_id' => $product->id],
                ['quantity' => 0, 'expiry_date' => null]
            );

            return;
        }

        Inventory::updateOrCreate(
            ['product_id' => $product->id],
            [
                'quantity' => max(0, (int) $product->quantity_left),
                'expiry_date' => $product->has_expiry ? $expiryDate : null,
            ]
        );
    }

    private function shrinkBatchStock(Product $product, int $quantityToRemove): void
    {
        if ($quantityToRemove <= 0) {
            return;
        }

        $batches = $product->productBatches()
            ->orderByDesc('expiry_date')
            ->orderByDesc('id')
            ->get();

        foreach ($batches as $batch) {
            if ($quantityToRemove <= 0) {
                break;
            }

            $removable = min($batch->quantity, $quantityToRemove);
            $batch->quantity -= $removable;
            $quantityToRemove -= $removable;

            if ($batch->quantity <= 0) {
                $batch->delete();
            } else {
                $batch->save();
            }
        }
    }

    private function effectiveExpiryDate(Product $product): ?string
    {
        if (!$product->has_expiry) {
            return null;
        }

        if ($product->track_batch || $product->productBatches->isNotEmpty()) {
            $nearestBatch = $product->productBatches
                ->filter(fn($batch) => $batch->quantity > 0 && !empty($batch->expiry_date))
                ->sortBy('expiry_date')
                ->first();

            return $nearestBatch?->expiry_date;
        }

        return $product->inventory?->expiry_date ?? $product->expiry_date;
    }

    private function generateBatchNumber(Product $product): string
    {
        return 'B-' . $product->id . '-' . Carbon::now()->format('YmdHis') . '-' . random_int(100, 999);
    }

    private function generateBarcode(int $productId): string
    {
        do {
            $barcode = 'BC-' . $productId . Carbon::now()->format('His') . random_int(100, 999);
        } while (Product::where('barcode', $barcode)->exists());

        return $barcode;
    }

    private function recalculateBatchTrackedStock(Product $product): void
    {
        $available = (int) $product->productBatches()->sum('quantity');
        $product->quantity_left = $available;
        $product->total_quantity = $available + (int) $product->quantity_sold;
        $product->total_profit = $product->profit * (int) $product->total_quantity;
        $product->expiry_date = null;
        $product->save();
    }
}
