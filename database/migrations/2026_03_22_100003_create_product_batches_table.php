<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('product_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('batch_number')->unique();
            $table->integer('quantity');
            $table->date('expiry_date')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'expiry_date']);
        });

        if (Schema::hasTable('batches')) {
            $legacyBatches = DB::table('batches')
                ->select('product_id', 'batch_number', 'quantity_left', 'quantity', 'expiry_date', 'created_at', 'updated_at')
                ->get();

            foreach ($legacyBatches as $batch) {
                DB::table('product_batches')->insert([
                    'product_id' => $batch->product_id,
                    'batch_number' => $batch->batch_number,
                    'quantity' => (int) ($batch->quantity_left ?? $batch->quantity ?? 0),
                    'expiry_date' => $batch->expiry_date,
                    'created_at' => $batch->created_at ?? now(),
                    'updated_at' => $batch->updated_at ?? now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_batches');
    }
};
