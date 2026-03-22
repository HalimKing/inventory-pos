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
        Schema::create('inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity')->default(0);
            $table->date('expiry_date')->nullable();
            $table->timestamps();

            $table->unique('product_id');
            $table->index('expiry_date');
        });

        $products = DB::table('products')->select('id', 'quantity_left', 'expiry_date')->get();

        foreach ($products as $product) {
            DB::table('inventory')->insert([
                'product_id' => $product->id,
                'quantity' => max(0, (int) ($product->quantity_left ?? 0)),
                'expiry_date' => $product->expiry_date,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};
