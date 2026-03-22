<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->foreignId('product_batch_id')->nullable()->after('product_id')->constrained('product_batches')->nullOnDelete();
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->date('expiry_date')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_batch_id');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->date('expiry_date')->nullable(false)->change();
        });
    }
};
