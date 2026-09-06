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
            if (! Schema::hasColumn('sales', 'is_refund')) {
                $table->boolean('is_refund')->default(false)->after('status');
            }

            if (! Schema::hasColumn('sales', 'refund_of_sale_id')) {
                $table->foreignUuid('refund_of_sale_id')->nullable()->after('status')->constrained('sales')->nullOnDelete();
            }

            if (! Schema::hasColumn('sales', 'refund_reason')) {
                $table->text('refund_reason')->nullable()->after('refund_of_sale_id');
            }

            if (! Schema::hasColumn('sales', 'refunded_amount')) {
                $table->decimal('refunded_amount', 10, 2)->default(0)->after('refund_reason');
            }

            if (! Schema::hasColumn('sales', 'refunded_at')) {
                $table->timestamp('refunded_at')->nullable()->after('refunded_amount');
            }
        });

        Schema::table('sale_items', function (Blueprint $table) {
            if (! Schema::hasColumn('sale_items', 'refunded_quantity')) {
                $table->integer('refunded_quantity')->default(0)->after('quantity');
            }

            if (! Schema::hasColumn('sale_items', 'refund_amount')) {
                $table->decimal('refund_amount', 10, 2)->default(0)->after('refunded_quantity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            if (Schema::hasColumn('sale_items', 'refund_amount')) {
                $table->dropColumn('refund_amount');
            }

            if (Schema::hasColumn('sale_items', 'refunded_quantity')) {
                $table->dropColumn('refunded_quantity');
            }
        });

        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'refunded_at')) {
                $table->dropColumn('refunded_at');
            }

            if (Schema::hasColumn('sales', 'refunded_amount')) {
                $table->dropColumn('refunded_amount');
            }

            if (Schema::hasColumn('sales', 'refund_reason')) {
                $table->dropColumn('refund_reason');
            }

            if (Schema::hasColumn('sales', 'refund_of_sale_id')) {
                $table->dropConstrainedForeignId('refund_of_sale_id');
                $table->dropColumn('refund_of_sale_id');
            }

            if (Schema::hasColumn('sales', 'is_refund')) {
                $table->dropColumn('is_refund');
            }
        });
    }
};
