<?php

namespace App\Services;

use App\Enums\AuditModule;
use App\Enums\StockMovementType;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockService
{
    public function usesBatchTracking(Product $product): bool
    {
        return (bool) $product->track_batch && (bool) $product->has_expiry;
    }

    public function availableQuantity(Product $product): int
    {
        if ($this->usesBatchTracking($product)) {
            return (int) ProductBatch::query()
                ->where('product_id', $product->id)
                ->sum('quantity');
        }

        $product->loadMissing('inventory');

        return (int) ($product->inventory?->quantity ?? $product->quantity_left ?? 0);
    }

    /**
     * Add incoming stock to an existing product (does not create a new product).
     *
     * @return array{product: Product, movement: StockMovement, batch: ?ProductBatch}
     */
    public function addStock(
        Product $product,
        int $quantity,
        User $user,
        ?string $notes = null,
        ?string $expiryDate = null,
        ?string $batchNumber = null,
    ): array {
        if ($quantity < 1) {
            throw ValidationException::withMessages([
                'quantity' => 'Quantity to add must be at least 1.',
            ]);
        }

        return DB::transaction(function () use ($product, $quantity, $user, $notes, $expiryDate, $batchNumber) {
            $product = Product::query()->lockForUpdate()->findOrFail($product->id);
            $before = $this->availableQuantity($product);
            $batch = null;

            if ($this->usesBatchTracking($product)) {
                if (empty($expiryDate)) {
                    throw ValidationException::withMessages([
                        'expiryDate' => 'Expiry date is required when adding stock to a batch-tracked product.',
                    ]);
                }

                $resolvedBatchNumber = $batchNumber ?: $this->generateBatchNumber($product);

                if (ProductBatch::query()->where('batch_number', $resolvedBatchNumber)->exists()) {
                    throw ValidationException::withMessages([
                        'batchNumber' => 'This batch number is already in use.',
                    ]);
                }

                $batch = ProductBatch::create([
                    'product_id' => $product->id,
                    'batch_number' => $resolvedBatchNumber,
                    'quantity' => $quantity,
                    'expiry_date' => $expiryDate,
                ]);

                $this->recalculateBatchTrackedProduct($product);
            } else {
                if ($product->has_expiry && empty($expiryDate) && empty($product->expiry_date) && empty($product->inventory?->expiry_date)) {
                    throw ValidationException::withMessages([
                        'expiryDate' => 'Expiry date is required for perishable products.',
                    ]);
                }

                $inventory = Inventory::query()
                    ->where('product_id', $product->id)
                    ->lockForUpdate()
                    ->first();

                if (! $inventory) {
                    $inventory = new Inventory(['product_id' => $product->id]);
                }

                $inventory->quantity = (int) $inventory->quantity + $quantity;

                if ($product->has_expiry) {
                    $inventory->expiry_date = $expiryDate ?: ($inventory->expiry_date ?? $product->expiry_date);
                    $product->expiry_date = $inventory->expiry_date;
                } else {
                    $inventory->expiry_date = null;
                    $product->expiry_date = null;
                }

                $inventory->save();

                $product->quantity_left = (int) $inventory->quantity;
                $product->total_quantity = (int) $product->quantity_left + (int) $product->quantity_sold;
                $product->total_profit = $product->profit * (int) $product->total_quantity;
                $product->save();
            }

            $product->refresh();
            $after = $this->availableQuantity($product);

            $movement = $this->recordMovement(
                product: $product,
                type: StockMovementType::StockIn,
                quantityDelta: $quantity,
                quantityBefore: $before,
                quantityAfter: $after,
                user: $user,
                productBatchId: $batch?->id,
                notes: $notes,
            );

            AuditLogger::record(
                eventType: 'inventory.stock_added',
                module: AuditModule::Inventory,
                description: "Added {$quantity} unit(s) to {$product->name}",
                user: $user,
                request: request(),
                resourceType: Product::class,
                resourceId: (string) $product->id,
                oldValues: ['quantity_left' => $before],
                newValues: [
                    'quantity_left' => $after,
                    'quantity_added' => $quantity,
                    'batch_id' => $batch?->id,
                    'notes' => $notes,
                ],
            );

            return [
                'product' => $product->fresh(['inventory', 'productBatches']),
                'movement' => $movement,
                'batch' => $batch,
            ];
        });
    }

    public function recordMovement(
        Product $product,
        StockMovementType $type,
        int $quantityDelta,
        int $quantityBefore,
        int $quantityAfter,
        ?User $user = null,
        ?int $productBatchId = null,
        ?string $notes = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
    ): StockMovement {
        return StockMovement::create([
            'product_id' => $product->id,
            'product_batch_id' => $productBatchId,
            'user_id' => $user?->id,
            'type' => $type,
            'quantity_delta' => $quantityDelta,
            'quantity_before' => max(0, $quantityBefore),
            'quantity_after' => max(0, $quantityAfter),
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes,
        ]);
    }

    public function recordInitialStock(Product $product, int $quantity, ?User $user = null): ?StockMovement
    {
        if ($quantity <= 0) {
            return null;
        }

        return $this->recordMovement(
            product: $product,
            type: StockMovementType::Initial,
            quantityDelta: $quantity,
            quantityBefore: 0,
            quantityAfter: $quantity,
            user: $user,
            notes: 'Initial stock on product creation',
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function historyForProduct(Product $product, int $limit = 50): array
    {
        return StockMovement::query()
            ->with(['user:id,name', 'batch:id,batch_number'])
            ->where('product_id', $product->id)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'type' => $movement->type->value,
                'typeLabel' => $this->typeLabel($movement->type),
                'quantityDelta' => $movement->quantity_delta,
                'quantityBefore' => $movement->quantity_before,
                'quantityAfter' => $movement->quantity_after,
                'notes' => $movement->notes,
                'batchNumber' => $movement->batch?->batch_number,
                'userName' => $movement->user?->name ?? 'System',
                'referenceType' => $movement->reference_type,
                'referenceId' => $movement->reference_id,
                'createdAt' => $movement->created_at?->toIso8601String(),
            ])
            ->all();
    }

    public function typeLabel(StockMovementType $type): string
    {
        return match ($type) {
            StockMovementType::Initial => 'Initial stock',
            StockMovementType::StockIn => 'Stock added',
            StockMovementType::Sale => 'Sale',
            StockMovementType::Refund => 'Refund restock',
            StockMovementType::Adjustment => 'Adjustment',
        };
    }

    private function recalculateBatchTrackedProduct(Product $product): void
    {
        $available = (int) $product->productBatches()->sum('quantity');
        $product->quantity_left = $available;
        $product->total_quantity = $available + (int) $product->quantity_sold;
        $product->total_profit = $product->profit * (int) $product->total_quantity;
        $product->expiry_date = null;
        $product->save();

        Inventory::updateOrCreate(
            ['product_id' => $product->id],
            ['quantity' => 0, 'expiry_date' => null]
        );
    }

    private function generateBatchNumber(Product $product): string
    {
        return 'B-'.$product->id.'-'.Carbon::now()->format('YmdHis').'-'.random_int(100, 999);
    }
}
