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
        Schema::table('sales', function (Blueprint $table) {
            // Add offline sync ID for duplicate prevention
            if (!Schema::hasColumn('sales', 'offline_sync_id')) {
                $table->string('offline_sync_id')->nullable()->unique()->after('transaction_id');
            }

            // Add synced timestamp
            if (!Schema::hasColumn('sales', 'synced_at')) {
                $table->timestamp('synced_at')->nullable()->after('updated_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'offline_sync_id')) {
                $table->dropUnique(['offline_sync_id']);
                $table->dropColumn('offline_sync_id');
            }

            if (Schema::hasColumn('sales', 'synced_at')) {
                $table->dropColumn('synced_at');
            }
        });
    }
};
