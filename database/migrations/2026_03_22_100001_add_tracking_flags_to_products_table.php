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
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('has_expiry')->default(false)->after('product_image');
            $table->boolean('track_batch')->default(false)->after('has_expiry');
            $table->boolean('track_serial')->default(false)->after('track_batch');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->date('expiry_date')->nullable()->change();
        });

        DB::table('products')
            ->whereNotNull('expiry_date')
            ->update(['has_expiry' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['has_expiry', 'track_batch', 'track_serial']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->date('expiry_date')->nullable(false)->change();
        });
    }
};
