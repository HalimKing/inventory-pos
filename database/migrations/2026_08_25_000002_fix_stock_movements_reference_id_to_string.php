<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex(['reference_type', 'reference_id']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('reference_id', 36)->nullable()->change();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex(['reference_type', 'reference_id']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->unsignedBigInteger('reference_id')->nullable()->change();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['reference_type', 'reference_id']);
        });
    }
};
