<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Enums\AuditModule;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
        $categorie = Category::withCount('products')->get();
        // $categoriesData = Category::all();
        // dd($categoriesData);
        $categoriesData = $this->allCategories();

        return Inertia::render('categories/index', compact('categoriesData'));
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
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string|max:1000',
        ]);
        try {
            $category = new Category;
            $category->name = $request->name;
            $category->description = $request->description;
            $category->save();

            AuditLogger::record(
                eventType: 'product.category_created',
                module: AuditModule::Products,
                description: "Category created: {$category->name}",
                user: $request->user(),
                request: $request,
                resourceType: Category::class,
                resourceId: (string) $category->id,
                newValues: ['name' => $category->name],
            );

            return redirect()->route('admin.categories.index')->with('success', 'Category created successfully.');
        } catch (\Exception $e) {
            return redirect()->route('admin.categories.index')->with('error', 'Category creation failed:'.$e->getMessage());
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
    public function update(Request $request, string $id)
    {
        //
        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,'.$id,
            'description' => 'nullable|string',
        ]);
        $category = Category::findOrFail($id);
        $oldValues = ['name' => $category->name, 'description' => $category->description];
        $category->name = $request->name;
        $category->description = $request->description;
        $category->save();

        AuditLogger::record(
            eventType: 'product.category_updated',
            module: AuditModule::Products,
            description: "Category updated: {$category->name}",
            user: $request->user(),
            request: $request,
            resourceType: Category::class,
            resourceId: (string) $category->id,
            oldValues: $oldValues,
            newValues: ['name' => $category->name, 'description' => $category->description],
        );

        return redirect()->route('admin.categories.index')->with([
            'success' => 'Category updated successfully.',
            'data' => Category::all(),
        ]);

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $category = Category::findOrFail($id);

            AuditLogger::record(
                eventType: 'product.category_deleted',
                module: AuditModule::Products,
                description: "Category deleted: {$category->name}",
                user: request()->user(),
                request: request(),
                resourceType: Category::class,
                resourceId: (string) $category->id,
                oldValues: ['name' => $category->name],
            );

            $category->delete();

            return response()->json(['message' => 'Category deleted successfully.']);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Failed to delete category due to related records: '.$e->getMessage());

            return response()->json([
                'error' => 'Category cannot be deleted because it is linked to other records.',
            ], 409);
        } catch (\Exception $e) {
            Log::error('Failed to delete category: '.$e->getMessage());

            return response()->json(['error' => 'Something went wrong.'], 500);
        }
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids');
        Category::whereIn('id', $ids)->delete();

        return response()->json(['message' => 'Categories deleted successfully.']);
    }

    /**
     * Fetch categories data as JSON.
     */
    public function fetchCategories()
    {
        try {
            $categories = $this->allCategories();

            // Debug on backend
            Log::info('Fetching categories', [
                'count' => $categories->count(),
                'categories' => $categories->toArray(),
            ]);

            return response()->json($categories);
        } catch (\Exception $e) {
            Log::error('Failed to fetch categories: '.$e->getMessage());

            return response()->json([
                'error' => 'Failed to fetch categories',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function fetchAllCategories()
    {
        $categories = Category::all();

        // Debug on backend
        Log::info('Fetching categories', [
            'count' => $categories->count(),
            'categories' => $categories->toArray(),
        ]);

        $categoriesData = $categories->map(function ($category) {
            return [
                'value' => $category->id,
                'label' => $category->name,
            ];
        });

        return response()->json($categoriesData);
    }

    private function allCategories()
    {
        $categorie = Category::withCount('products')->get();
        // $categoriesData = Category::all();
        // dd($categoriesData);
        $categoriesData = $categorie->map(function ($category) {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'productCount' => $category->products_count,
            ];
        });

        return $categoriesData;
    }
}
