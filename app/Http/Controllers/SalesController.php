<?php

namespace App\Http\Controllers;

use App\Exceptions\StockValidationException;
use App\Http\Requests\StoreTransactionRequest;
use App\Models\CompanySetting;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sales;
use App\Enums\AuditModule;
use App\Services\AuditLogger;
use App\Services\SalesService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SalesController extends Controller
{
    public function __construct(private readonly SalesService $salesService) {}

    public function index(Request $request)
    {
        $this->authorize('create', Sales::class);

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
            $sale = $this->salesService->processSale([
                'items' => $request->items,
                'subtotal' => $request->subtotal,
                'discount_amount' => $request->discount_amount,
                'discount_percentage' => $request->discount_percentage,
                'amount_paid' => $request->amount_received,
                'change_amount' => $request->change_amount,
                'payment_method' => $request->payment_method,
                'customer_name' => $request->customer_name,
            ], Auth::id());

            DB::commit();

            AuditLogger::record(
                eventType: 'sales.completed',
                module: AuditModule::Sales,
                description: "Sale completed: {$sale->transaction_id}",
                user: Auth::user(),
                request: $request,
                resourceType: Sales::class,
                resourceId: $sale->id,
                newValues: [
                    'transaction_id' => $sale->transaction_id,
                    'grand_total' => $sale->grand_total,
                    'payment_method' => $sale->payment_method,
                ],
            );

            return response()->json(['success' => true, 'message' => 'Transaction saved successfully.']);
        } catch (StockValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Stock validation failed',
                'errors' => $e->errors,
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Transaction failed: '.$e->getMessage(), [
                'user_id' => Auth::id(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Transaction failed. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    public function fetchAllProducts(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        return response()->json($this->paginateSalesProducts($request));
    }

    public function fetchProductByBarcode(string $barcode): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $product = Product::with(['category', 'inventory'])
            ->where('barcode', $barcode)
            ->first();

        if (! $product) {
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
                'available_batches' => $availableBatches->map(fn ($batch) => [
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
                ? Carbon::today()->diffInDays(Carbon::parse($expiryDate), false) <= 30 && ! $isExpired
                : false,
            'inventory_type' => $product->has_expiry ? 'perishable' : 'non-perishable',
            'selected_batch' => null,
            'available_batches' => [],
        ]);
    }

    /**
     * Sync offline sales from POS
     */
    public function syncOfflineSales(Request $request): JsonResponse
    {
        $this->authorize('syncOffline', Sales::class);

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
            'sales.*.offline_id' => 'required|string',
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
                    if ($this->salesService->isDuplicateOfflineSale($saleData['offline_id'])) {
                        Log::info('Duplicate offline sale detected', ['offline_id' => $saleData['offline_id']]);
                        $results['synced_count']++;

                        continue;
                    }

                    $this->salesService->processSale([
                        'items' => $saleData['items'],
                        'subtotal' => $saleData['subtotal'],
                        'discount_amount' => $saleData['discount_amount'] ?? 0,
                        'discount_percentage' => $saleData['discount_percentage'] ?? 0,
                        'grand_total' => $saleData['grand_total'],
                        'amount_paid' => $saleData['amount_paid'],
                        'payment_method' => $saleData['payment_method'],
                        'customer_name' => $saleData['customer_name'] ?? null,
                    ], Auth::id(), $saleData['offline_id']);

                    $results['synced_count']++;
                    Log::info('Offline sale synced successfully', ['offline_id' => $saleData['offline_id']]);
                } catch (StockValidationException $e) {
                    $results['failed_count']++;
                    $results['success'] = false;
                    $results['errors'][] = [
                        'offline_id' => $saleData['offline_id'] ?? 'unknown',
                        'message' => implode('; ', $e->errors),
                    ];
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
                'message' => 'Batch sync failed: '.$e->getMessage(),
            ], 500);
        }
    }
}
