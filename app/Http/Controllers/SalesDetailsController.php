<?php

namespace App\Http\Controllers;

use App\Models\SaleItem;
use App\Models\Sales;
use Carbon\Carbon;

class SalesDetailsController extends Controller
{
    public function salesDetails()
    {
        $this->authorize('viewAny', Sales::class);

        $query = SaleItem::with(['product', 'category', 'sale', 'sale.user'])->get();

        $sales = $query->map(function ($sale) {
            return [
                'id' => $sale->id,
                'saleDate' => date(Carbon::parse($sale->created_at)->format('Y-m-d')),
                'productName' => $sale->product_name,
                'category' => $sale->category->name,
                'customerName' => $sale->sale->customer_name,
                'quantity' => (int) $sale->quantity,
                'sellingPrice' => abs((float) $sale->price),
                'totalAmount' => (float) $sale->total_amount,
                'profit' => (float) $sale->profit,
                'paymentMethod' => $sale->sale->payment_method,
                'salesPerson' => $sale->sale->user->name,
                'profitMargin' => $sale->price != 0 ? round((($sale->profit) / abs((float) $sale->price)) * 100, 2) : 0,
                'transactionId' => $sale->sale->transaction_id,
            ];
        });

        return response()->json($sales);
    }

    public function transactions()
    {
        $this->authorize('viewAny', Sales::class);

        $query = SaleItem::with(['sale'])->get()->groupBy('sale_id');
        $data = $query->map(function ($items, $saleId) {
            $sale = $items->first()->sale;

            return [
                'saleId' => $sale->id,
                'transactionId' => $sale->transaction_id,
                'customerName' => $sale->customer_name,
                'totalItems' => (int) abs($items->sum('quantity')),
                'subTotal' => (float) $sale->sub_total,
                'discountAmount' => (float) $sale->discount_amount,
                'amountPaid' => (float) $sale->amount_paid,
                'changeAmount' => (float) $sale->change_amount,
                'grandTotal' => (float) $sale->grand_total,
                'paymentMethod' => $sale->payment_method,
                'salesPerson' => $sale->user ? $sale->user->name : 'N/A',
                'date' => $sale->created_at,
                'status' => $sale->status,
            ];
        })->values();

        return response()->json($data);
    }

    public function saleItems(string $id)
    {
        $sale = Sales::findOrFail($id);
        $this->authorize('view', $sale);

        $saleItems = SaleItem::with(['product', 'category'])->where('sale_id', $id)->get();

        return response()->json($saleItems);
    }

    public function transactionDetails(string $id)
    {
        $sale = Sales::findOrFail($id);
        $this->authorize('view', $sale);

        $saleItem = SaleItem::with(['sale.user', 'sale'])->where('sale_id', $id)->first();

        return response()->json($saleItem);
    }
}
