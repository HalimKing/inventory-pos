<?php

namespace App\Services;

use App\Exceptions\StockValidationException;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\SaleItem;
use App\Models\Sales;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SalesService
{
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

    /**
     * @param  array<string, mixed>  $item
     */
    private function processLineItem(Sales $sale, array $item): void
    {
        $product = Product::with('inventory')->findOrFail($item['product_id']);
        $requestedQuantity = (int) $item['quantity'];
        $remaining = $requestedQuantity;

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
