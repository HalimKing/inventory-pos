<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement(
            "UPDATE products SET track_batch = 1 WHERE has_expiry = 1 AND id IN (SELECT DISTINCT product_id FROM product_batches)"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This is a data-fix migration; no safe automatic rollback.
    }
};
