<?php

namespace App\Http\Controllers;

use App\Models\SaleItem;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesReportController extends Controller
{
    //
    public function index()
    {
        $this->authorize('viewReports', \App\Models\Sales::class);

        $salesByCategoryData = $this->salesCategories();
        $topProductsData = $this->topProducts();

        return Inertia::render('sales-report/index', compact('topProductsData', 'salesByCategoryData'));
    }

    private function topProducts()
    {
        //
        $query = SaleItem::join('categories', 'sale_items.category_id', '=', 'categories.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id');

        $topProducts = $query->select(
            'product_name as productName',
            'categories.name as category',
            DB::raw('SUM(quantity) as totalQuantity'),
            DB::raw('SUM(total_amount) as totalSales'),
            DB::raw('SUM(sale_items.profit) as totalProfit')
        )
            ->groupBy('productName', 'category')
            ->orderByDesc('totalSales')
            ->limit(5)
            ->get();

        return $topProducts;

    }

    private function salesCategories()
    {
        //
        $query = SaleItem::join('categories', 'sale_items.category_id', '=', 'categories.id');

        $salesCategories = $query->select(
            'categories.name as category',
            DB::raw('SUM(sale_items.total_amount) as totalSales'),
            DB::raw('SUM(sale_items.profit) as totalProfit')
        )
            ->groupBy('category')
            ->orderByDesc('totalSales')
            ->get();

        return $salesCategories;
    }
}
