<?php

namespace App\Services;

use App\Enums\AuditModule;
use App\Enums\StockMovementType;
use App\Exceptions\StockValidationException;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\SaleItem;
use App\Models\Sales;
use App\Models\User;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SalesService
{
    public function __construct(private readonly StockService $stockService) {}
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, string>
     */
    public function validateStock(array $items, bool $lockForUpdate = false): array
    {
        $stockErrors = [];

        foreach ($items as $item) {
            $product = Product::with('inventory')->find($item['product_id'] ?? null);

            if (! $product) {
                $stockErrors[] = 'Product with ID '.($item['product_id'] ?? 'unknown').' not found.';

                continue;
            }

            $quantity = (int) ($item['quantity'] ?? 0);

            if ($product->track_batch && $product->has_expiry) {
                $expiredBatchStock = (int) ProductBatch::query()
                    ->where('product_id', $product->id)
                    ->where('quantity', '>', 0)
                    ->whereDate('expiry_date', '<', Carbon::today())
                    ->sum('quantity');

                $batchQuery = ProductBatch::query()
                    ->where('product_id', $product->id)
                    ->where('quantity', '>', 0)
                    ->whereDate('expiry_date', '>=', Carbon::today())
                    ->orderBy('expiry_date');

                if ($lockForUpdate) {
                    $batchQuery->lockForUpdate();
                }

                $availableStock = (int) $batchQuery->get()->sum('quantity');

                if ($availableStock <= 0 && $expiredBatchStock > 0) {
                    $stockErrors[] = "{$product->name} has only expired batches and cannot be sold.";

                    continue;
                }

                if ($availableStock < $quantity) {
                    $stockErrors[] = "Insufficient stock for {$product->name}. Available: {$availableStock}, Requested: {$quantity}";
                }

                continue;
            }

            $inventoryQuery = Inventory::query()->where('product_id', $product->id);

            if ($lockForUpdate) {
                $inventoryQuery->lockForUpdate();
            }

            $inventory = $inventoryQuery->first();
            $availableStock = (int) ($inventory?->quantity ?? $product->quantity_left ?? 0);

            if ($product->has_expiry) {
                $expiryDate = $inventory?->expiry_date ?? $product->expiry_date;
                if ($expiryDate && Carbon::parse($expiryDate)->isPast()) {
                    $stockErrors[] = "{$product->name} is expired and cannot be sold.";

                    continue;
                }
            }

            if ($availableStock < $quantity) {
                $stockErrors[] = "Insufficient stock for {$product->name}. Available: {$availableStock}, Requested: {$quantity}";
            }
        }

        return $stockErrors;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function processSale(array $payload, int $userId, ?string $offlineSyncId = null): Sales
    {
        $items = $payload['items'] ?? [];
        $stockErrors = $this->validateStock($items, lockForUpdate: true);

        if ($stockErrors !== []) {
            throw new StockValidationException($stockErrors);
        }

        $discountAmount = (float) ($payload['discount_amount'] ?? 0);
        $subtotal = (float) ($payload['subtotal'] ?? 0);
        $grandTotal = array_key_exists('grand_total', $payload)
            ? (float) $payload['grand_total']
            : round($subtotal - $discountAmount, 2);

        $sale = new Sales;
        $sale->transaction_id = 'TNX-'.uniqid('', false);
        $sale->user_id = $userId;
        $sale->sub_total = $subtotal;
        $sale->discount_amount = $discountAmount;
        $sale->discount_percentage = $payload['discount_percentage'] ?? 0;
        $sale->grand_total = $grandTotal;
        $sale->status = 'completed';
        $sale->amount_paid = (float) ($payload['amount_paid'] ?? 0);
        $sale->change_amount = (float) ($payload['change_amount'] ?? 0);
        $sale->payment_method = $payload['payment_method'] ?? 'cash';
        $sale->customer_name = $payload['customer_name'] ?? null;

        if ($offlineSyncId !== null) {
            $sale->offline_sync_id = $offlineSyncId;
            $sale->synced_at = now();
        }

        $sale->save();

        foreach ($items as $item) {
            $this->processLineItem($sale, $item);
        }

        Log::info('Sale processed', [
            'sale_id' => $sale->id,
            'user_id' => $userId,
            'offline_sync_id' => $offlineSyncId,
        ]);

        return $sale;
    }

    public function isDuplicateOfflineSale(string $offlineSyncId): bool
    {
        return Sales::query()
            ->where('offline_sync_id', $offlineSyncId)
            ->exists();
    }

    public function availableStock(Product $product): int
    {
        if ($product->track_batch && $product->has_expiry) {
            return (int) ProductBatch::query()
                ->where('product_id', $product->id)
                ->where('quantity', '>', 0)
                ->whereDate('expiry_date', '>=', Carbon::today())
                ->sum('quantity');
        }

        return (int) ($product->inventory?->quantity ?? $product->quantity_left ?? 0);
    }

    public function refundSale(Sales $sale, array $payload, User $user): Sales
    {
        if ($sale->is_refund) {
            throw new \InvalidArgumentException('Refunds cannot be refunded again.');
        }

        if ($sale->status === 'refunded' || $sale->status === 'partially_refunded') {
            throw new \InvalidArgumentException('This transaction has already been refunded.');
        }

        $items = $payload['items'] ?? [];
        if ($items === []) {
            throw new \InvalidArgumentException('At least one line item is required for a refund.');
        }

        $refundSale = new Sales;
        $refundSale->transaction_id = 'RFD-'.uniqid('', false);
        $refundSale->user_id = $user->id;
        $refundSale->customer_name = $sale->customer_name;
        $refundSale->sub_total = 0;
        $refundSale->discount_amount = 0;
        $refundSale->discount_percentage = 0;
        $refundSale->grand_total = 0;
        $refundSale->status = 'completed';
        $refundSale->is_refund = true;
        $refundSale->refund_of_sale_id = $sale->id;
        $refundSale->refund_reason = $payload['reason'] ?? null;
        $refundSale->amount_paid = 0;
        $refundSale->change_amount = 0;
        $refundSale->payment_method = $sale->payment_method;
        $refundSale->save();

        $refundAmount = 0.0;
        $refundedItems = [];

        foreach ($items as $itemPayload) {
            $saleItem = $sale->saleItems()->find($itemPayload['sale_item_id'] ?? null);
            if (! $saleItem) {
                throw new \InvalidArgumentException('One of the selected items could not be found.');
            }

            $requestedQuantity = max(1, (int) ($itemPayload['quantity'] ?? 0));
            $availableQuantity = max(0, (int) $saleItem->quantity - (int) $saleItem->refunded_quantity);
            if ($requestedQuantity > $availableQuantity) {
                throw new \InvalidArgumentException('Refund quantity exceeds the refundable quantity for one or more items.');
            }

            $refundLineAmount = round((float) $saleItem->price * $requestedQuantity, 2);
            $refundAmount += $refundLineAmount;

            $this->restoreInventoryForRefund(
                productId: (string) $saleItem->product_id,
                quantity: $requestedQuantity,
                productBatchId: $saleItem->product_batch_id ? (string) $saleItem->product_batch_id : null,
                user: $user,
                sale: $refundSale,
            );

            $saleItem->refunded_quantity += $requestedQuantity;
            $saleItem->refund_amount += $refundLineAmount;
            $saleItem->save();

            $refundedUnitProfit = $saleItem->quantity > 0
                ? round(((float) $saleItem->profit / (int) $saleItem->quantity) * $requestedQuantity, 2)
                : 0.0;

            $refundSale->saleItems()->create([
                'product_id' => $saleItem->product_id,
                'product_batch_id' => $saleItem->product_batch_id,
                'category_id' => $saleItem->category_id,
                'product_name' => $saleItem->product_name,
                'quantity' => -$requestedQuantity,
                'refunded_quantity' => 0,
                'refund_amount' => $refundLineAmount,
                'price' => $saleItem->price,
                'total_amount' => -$refundLineAmount,
                'quantity_left' => 0,
                'quantity_sold' => 0,
                'profit' => -$refundedUnitProfit,
                'expiry_date' => $saleItem->expiry_date,
            ]);

            $refundedItems[] = [
                'product_id' => $saleItem->product_id,
                'quantity' => $requestedQuantity,
            ];
        }

        $sale->refresh();
        $sale->status = (int) $sale->saleItems()->sum('refunded_quantity') >= (int) $sale->saleItems()->sum('quantity')
            ? 'refunded'
            : 'partially_refunded';
        $sale->refunded_amount = round((float) $sale->refunded_amount + $refundAmount, 2);
        $sale->refunded_at = now();
        $sale->save();

        $refundSale->sub_total = -$refundAmount;
        $refundSale->grand_total = -$refundAmount;
        $refundSale->amount_paid = -$refundAmount;
        $refundSale->change_amount = 0;
        $refundSale->save();

        $this->refreshProductStockForRefund($refundedItems);

        AuditLogger::record(
            eventType: 'sales.refunded',
            module: AuditModule::Sales,
            description: 'Refund processed for sale '.$sale->transaction_id,
            user: $user,
            resourceType: Sales::class,
            resourceId: $sale->id,
            newValues: [
                'refund_id' => $refundSale->id,
                'refund_reason' => $refundSale->refund_reason,
                'refund_amount' => $refundAmount,
                'refunded_items' => $refundedItems,
            ],
        );

        return $refundSale;
    }

    private function restoreInventoryForRefund(
        string $productId,
        int $quantity,
        ?string $productBatchId,
        User $user,
        Sales $sale,
    ): void {
        $product = Product::findOrFail($productId);
        $before = $this->stockService->availableQuantity($product);

        if ($product->track_batch && $product->has_expiry) {
            $batch = ProductBatch::query()->find($productBatchId);
            if ($batch) {
                $batch->quantity = (int) $batch->quantity + $quantity;
                $batch->save();
            }

            $product->refresh();
            $product->quantity_left = $this->availableStock($product);
            $product->save();

            $afterProduct = $product->fresh();
            $this->stockService->recordMovement(
                product: $afterProduct,
                type: StockMovementType::Refund,
                quantityDelta: $quantity,
                quantityBefore: $before,
                quantityAfter: $this->stockService->availableQuantity($afterProduct),
                user: $user,
                productBatchId: $batch?->id,
                notes: 'Stock restored from refund',
                referenceType: Sales::class,
                referenceId: (string) $sale->id,
            );

            return;
        }

        $inventory = Inventory::query()->where('product_id', $product->id)->lockForUpdate()->first();
        if ($inventory) {
            $inventory->quantity = (int) $inventory->quantity + $quantity;
            $inventory->save();
        }

        $product->refresh();
        $product->quantity_left = $this->availableStock($product);
        $product->save();

        $afterProduct = $product->fresh(['inventory']);
        $this->stockService->recordMovement(
            product: $afterProduct,
            type: StockMovementType::Refund,
            quantityDelta: $quantity,
            quantityBefore: $before,
            quantityAfter: $this->stockService->availableQuantity($afterProduct),
            user: $user,
            notes: 'Stock restored from refund',
            referenceType: Sales::class,
            referenceId: (string) $sale->id,
        );
    }

    private function refreshProductStockForRefund(array $refundedItems): void
    {
        foreach ($refundedItems as $refundedItem) {
            $product = Product::find($refundedItem['product_id']);
            if ($product) {
                $product->refresh();
                $product->load('inventory');
                $product->quantity_left = $this->availableStock($product);
                $product->save();
            }
        }
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function processLineItem(Sales $sale, array $item): void
    {
        $product = Product::with('inventory')->findOrFail($item['product_id']);
        $requestedQuantity = (int) $item['quantity'];
        $remaining = $requestedQuantity;
        $before = $this->stockService->availableQuantity($product);

        if ($product->track_batch && $product->has_expiry) {
            $batches = ProductBatch::query()
                ->where('product_id', $product->id)
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

                $this->createSaleItem($sale, $product, [
                    'quantity' => $deductQty,
                    'total_amount' => $deductQty * $product->selling_price,
                    'profit' => $product->profit * $deductQty,
                    'product_batch_id' => $batch->id,
                    'expiry_date' => $batch->expiry_date,
                    'line_quantity' => $requestedQuantity,
                ]);

                $this->stockService->recordMovement(
                    product: $product,
                    type: StockMovementType::Sale,
                    quantityDelta: -$deductQty,
                    quantityBefore: $before,
                    quantityAfter: max(0, $before - $deductQty),
                    user: $sale->user,
                    productBatchId: $batch->id,
                    notes: 'Sold via '.$sale->transaction_id,
                    referenceType: Sales::class,
                    referenceId: (string) $sale->id,
                );

                $before = max(0, $before - $deductQty);
            }

            $this->refreshProductStock($product, $requestedQuantity);

            return;
        }

        $inventory = Inventory::query()
            ->where('product_id', $product->id)
            ->lockForUpdate()
            ->first();

        if ($inventory) {
            $inventory->quantity = max(0, (int) $inventory->quantity - $remaining);
            if (! $product->has_expiry) {
                $inventory->expiry_date = null;
            }
            $inventory->save();
        }

        $expiryDate = $inventory?->expiry_date ?? $product->expiry_date;
        $lineTotal = array_key_exists('subtotal', $item)
            ? (float) $item['subtotal']
            : $requestedQuantity * $product->selling_price;

        $this->createSaleItem($sale, $product, [
            'quantity' => $requestedQuantity,
            'total_amount' => $lineTotal,
            'profit' => $product->profit * $requestedQuantity,
            'expiry_date' => $expiryDate,
            'line_quantity' => $requestedQuantity,
        ]);

        $this->refreshProductStock($product, $requestedQuantity);

        $after = $this->stockService->availableQuantity($product->fresh(['inventory']));

        $this->stockService->recordMovement(
            product: $product,
            type: StockMovementType::Sale,
            quantityDelta: -$requestedQuantity,
            quantityBefore: $before,
            quantityAfter: $after,
            user: $sale->user,
            notes: 'Sold via '.$sale->transaction_id,
            referenceType: Sales::class,
            referenceId: (string) $sale->id,
        );
    }

    /**
     * @param  array<string, mixed>  $lineData
     */
    private function createSaleItem(Sales $sale, Product $product, array $lineData): void
    {
        $lineQuantity = (int) ($lineData['line_quantity'] ?? $lineData['quantity']);

        $saleItem = new SaleItem;
        $saleItem->product_id = $product->id;
        $saleItem->product_batch_id = $lineData['product_batch_id'] ?? null;
        $saleItem->category_id = $product->category_id;
        $saleItem->sale_id = $sale->id;
        $saleItem->product_name = $product->name;
        $saleItem->quantity = (int) $lineData['quantity'];
        $saleItem->price = $product->selling_price;
        $saleItem->total_amount = (float) $lineData['total_amount'];
        $saleItem->quantity_left = max(0, (int) ($product->quantity_left - $lineQuantity));
        $saleItem->quantity_sold = (int) $product->quantity_sold + $lineQuantity;
        $saleItem->profit = (float) $lineData['profit'];
        $saleItem->expiry_date = $lineData['expiry_date'] ?? null;
        $saleItem->save();
    }

    private function refreshProductStock(Product $product, int $soldQuantity): void
    {
        $product->refresh();
        $product->load('inventory');
        $product->quantity_left = $this->availableStock($product);
        $product->quantity_sold += $soldQuantity;
        $product->save();
    }
}
