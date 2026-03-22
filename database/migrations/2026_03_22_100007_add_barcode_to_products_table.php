<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('products', 'barcode')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->string('barcode')->nullable()->unique()->after('supplier_id');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('products', 'barcode')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique('products_barcode_unique');
            $table->dropColumn('barcode');
        });
    }
};
