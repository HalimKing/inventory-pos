<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
        $products = $this->fetchProducts();
        return Inertia::render('products/index', compact('products'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
        $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|integer|max:255|exists:categories,id',
            'supplier' => 'required|integer|max:255|exists:suppliers,id',
            'totalQuantity' => 'required|integer',
            'sellingPrice' => 'required|numeric|min:1|max:1000000.00',
            'costPrice' => 'required|numeric|min:1|max:10000000.00',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'expiryDate' => 'required|date',
            'reorderLevel' => 'required|integer|min:1|max:10000',
        ]);

        // Upload image
        try {

            $product = new Product();

            $product->name = $request->name;
            $product->category_id = $request->category;
            $product->supplier_id = $request->supplier;
            $product->total_quantity = $request->totalQuantity;
            $product->selling_price = $request->sellingPrice;
            $product->cost_price = $request->costPrice;
            $product->expiry_date = $request->expiryDate;
            $product->profit = $request->sellingPrice - $request->costPrice;
            $product->total_profit = $product->profit * $product->total_quantity;
            $product->quantity_left = $product->total_quantity;
            $product->quantity_sold = 0;
            $product->reorder_level = $request->reorderLevel;

            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $path = $image->store('images', 'public'); // stores in storage/app/public/images
                $product->product_image = $path;
            }

            // dd($imageName);


            $product->save();

            return redirect()->route('admin.products.index')
                ->with('success', 'Product created Successfully!');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            // dd($e->getMessage());
            // delete image
            if ($request->hasFile('image')) {
                unlink(public_path('images/' . $request->image));
            }
            return redirect()->route('admin.products.index')
                ->with('error', 'Something went wrong!');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        //
        $request->validate([
            'name' => 'required|string|max:255|unique:products,name,' . $product->id,
            'category' => 'required|integer|max:255|exists:categories,id',
            'supplier' => 'required|integer|max:255|exists:suppliers,id',
            'totalQuantity' => 'required|integer',
            'sellingPrice' => 'required|numeric|min:1|max:1000000.00',
            'costPrice' => 'required|numeric|min:1|max:10000000.00',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'expiryDate' => 'required|date',
            'reorderLevel' => 'required|integer|min:1|max:100',
        ]);

        $product->name = $request->name;
        $product->category_id = $request->category;
        $product->supplier_id = $request->supplier;
        $product->selling_price = $request->sellingPrice;
        $product->cost_price = $request->costPrice;
        $product->expiry_date = $request->expiryDate;
        $product->profit = $request->sellingPrice - $request->costPrice;
        $product->quantity_left = $product->quantity_left + ($request->totalQuantity - $product->total_quantity);
        $product->total_quantity = $request->totalQuantity;
        $product->total_profit = $product->profit * $product->total_quantity;
        $product->reorder_level = $request->reorderLevel;


        if ($request->hasFile('image')) {
            $this->deleteProductImageIfExists($product->product_image);

            $image = $request->file('image');
            $path = $image->store('images', 'public'); // stores in storage/app/public/images
            $product->product_image = $path;
        }

        $product->save();

        return redirect()->route('admin.products.index')
            ->with('success', 'Product updated Successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        //
        // delete image
        try {
            $this->deleteProductImageIfExists($product->product_image);

            $product->delete();

            return response()->json(['message' => 'Product deleted successfully.']);
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return response()->json(['error' => 'Something went wrong.'], 500);
        }
    }

    private function deleteProductImageIfExists(?string $relativePath): void
    {
        if (empty($relativePath)) {
            return;
        }

        $fullPath = public_path('storage/' . ltrim($relativePath, '/'));

        if (is_file($fullPath)) {
            unlink($fullPath);
        }
    }

    private function fetchProducts()
    {
        $products = Product::with('category', 'supplier')->get();
        $productsData = $products->map(function ($product) {
            if ($product->quantity_left == 0) {
                $status = 'out-of-stock';
            } elseif ($product->expiry_date && now()->greaterThan($product->expiry_date)) {
                $status = 'expired';
            } elseif ($product->quantity_left <= $product->reorder_level) {
                $status = 'low-stock';
            } else {
                $status = 'in-stock';
            }
            return [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category->name,
                'category_id' => $product->category_id,
                'supplier' => $product->supplier->name,
                'supplier_id' => $product->supplier_id,
                'totalQuantity' => $product->total_quantity,
                'quantityLeft' => $product->quantity_left,
                'quantitySold' => $product->quantity_sold,
                'sellingPrice' => $product->selling_price,
                'initialAmount' => $product->cost_price,
                'profit' => $product->profit,
                'unitProfit' => $product->total_profit,
                'image' => $product->product_image,
                'expiryDate' => $product->expiry_date,
                'reorderLevel' => $product->reorder_level,
                'status' => $status,
            ];
        });
        return $productsData;
    }

    public function fetchProductsData()
    {
        return response()->json($this->fetchProducts());
    }
}
