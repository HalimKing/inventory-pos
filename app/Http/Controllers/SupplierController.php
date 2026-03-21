<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SupplierController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
        $suppliersData = $this->fetchSuppliers(); // Fixed: Added $this->
        return Inertia::render('suppliers/Index', compact('suppliersData'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function updateStatus(String $id)
    {
        //
        $supplier = Supplier::find($id);
        $supplier->status = $supplier->status == 'active' ? 'inactive' : 'active';
        $supplier->save();
        return redirect()->route('admin.suppliers.index')
            ->with('success', 'Supplier status updated Successfully!');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
        $request->validate([
            'companyName' => 'required|string|max:255',
            'email' => 'required|email|unique:suppliers,email',
            'address' => 'string|nullable',
            'phone' => 'required|string|max:20',
            'contactPerson' => 'required|string',
            'status' => 'required|string'
        ]);

        $supplier = new Supplier();
        $supplier->name = $request->contactPerson;
        $supplier->company_name = $request->companyName;
        $supplier->email = $request->phone;
        $supplier->address = $request->address;
        $supplier->phone = $request->phone;
        $supplier->status = $request->status;
        $supplier->save();
        return redirect()->route('admin.suppliers.index')
            ->with('success', 'Supplier created Successfully!');
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
            'companyName' => 'required|string|max:255',
            'email' => 'required|email|unique:suppliers,email,' . $id,
            'address' => 'string|nullable',
            'phone' => 'required|string|max:20',
            'contactPerson' => 'required|string',
            'status' => 'required|string'
        ]);


        $supplier = Supplier::find($id);
        $supplier->name = $request->contactPerson;
        $supplier->company_name = $request->companyName;
        $supplier->email = $request->phone;
        $supplier->address = $request->address;
        $supplier->phone = $request->phone;
        $supplier->status = $request->status;
        $supplier->save();
        return redirect()->route('admin.suppliers.index')
            ->with('success', 'Supplier updated Successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $supplier = Supplier::findOrFail($id);
            $supplier->delete();

            return response()->json(['message' => 'Supplier deleted successfully.']);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Failed to delete supplier due to related records: ' . $e->getMessage());

            return response()->json([
                'error' => 'Supplier cannot be deleted because it is linked to other records.'
            ], 409);
        } catch (\Exception $e) {
            Log::error('Failed to delete supplier: ' . $e->getMessage());

            return response()->json(['error' => 'Something went wrong.'], 500);
        }
    }

    private function fetchSuppliers()
    {
        $suppliers = Supplier::all();
        $suppliersData = $suppliers->map(function ($supplier) {
            return [
                'id' => $supplier->id,
                'contactPerson' => $supplier->name, // Make sure 'name' field exists
                'companyName' => $supplier->company_name, // Make sure 'company_name' field exists
                'email' => $supplier->email,
                'phone' => $supplier->phone,
                'address' => $supplier->address,
                'status' => $supplier->status,
            ];
        });

        return $suppliersData;
    }

    public function fetchAllSuppliers()
    {
        $suppliers = Supplier::all();
        $suppliersData = $suppliers->map(function ($supplier) {
            return [
                'id' => $supplier->id,
                'contactPerson' => $supplier->name, // Make sure 'name' field exists
                'companyName' => $supplier->company_name, // Make sure 'company_name' field exists
                'email' => $supplier->email,
                'phone' => $supplier->phone,
                'address' => $supplier->address,
                'status' => $supplier->status,
            ];
        });

        return response()->json($this->fetchSuppliers());
    }

    public function fetchSuppliersData()
    {
        $suppliers = Supplier::all();

        // Debug on backend
        Log::info('Fetching categories', [
            'count' => $suppliers->count(),
            'categories' => $suppliers->toArray()
        ]);

        $suppliersData = $suppliers->map(function ($supplier) {
            return [
                'value' => $supplier->id,
                'label' => $supplier->company_name
            ];
        });

        return response()->json($suppliersData);
    }
}
