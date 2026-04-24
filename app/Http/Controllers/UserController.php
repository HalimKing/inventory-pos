<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
        $usersData = $this->allUsers();
        // dd($usersData);
        return Inertia::render('users/index', compact('usersData'));
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
        // dd($request->all());
        //
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string',
            'role' => 'required|string|in:supper admin,admin,cashier,inventory',
            'status' => 'required|string|in:active,inactive',
        ]);
        try {
            $isRole = Role::where('name', $request->role)->first();
            if (empty($isRole)) {
                return redirect()->route('users.index')->with('error', 'This role is not in the role list.');
            }

            $user = new User();
            $user->name = $request->name;
            $user->email = $request->email;
            $user->phone = $request->phone;
            $user->status = $request->status;
            $user->password = bcrypt('password'); // default password
            $user->role_id = $isRole->id; // default role as 'User'
            $user->save();
            return redirect()->route('admin.users.index')->with('success', 'User created successfully.');

        } catch (Exception $e) {
            return redirect()->route('admin.users.index')->with('error', 'Sorry, something went wrong');
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
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'phone' => 'required|string',
            'role' => 'required|string|in:supper admin,admin,cachier,inventory',
        ]);
        try {
            $isRole = Role::where('name', $request->role)->first();
            if (empty($isRole)) {
                return redirect()->route('admin.users.index')->with('error', 'This role is not in the role list.');
            }

            $user = User::find($id);
            $user->name = $request->name;
            $user->email = $request->email;
            $user->phone = $request->phone;
            $user->role_id = $isRole->id; // default role as 'User'
            $user->save();
            return redirect()->route('admin.users.index')->with('success', 'User updated successfully.');

        } catch (Exception $e) {
            return redirect()->route('admin.users.index')->with('error', 'Sorry, something went wrong');
        }
    }

    /**
     * Update the specified resource status.
     */

    public function updateStatus(string $id)
    {
        //
        try {
            $user = User::find($id);
            if ($user->status === 'active') {
                $user->status = 'inactive';
            } else {
                $user->status = 'active';
            }
            $user->save();
           return response()->json(['message' => 'User status updated successfully', 'status' => $user->status]);

        } catch (Exception $e) {
            return response()->json(['message' => 'Sorry, something went wrong'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
        try {
            $user = User::find($id);
            $user->delete();
            return response()->json(['message' => 'User deleted successfully']);
        } catch (Exception $e) {
            return response()->json(['message' => 'Sorry, something went wrong'], 500);
        }
    }

    public function allUsers ()
    {
        $users = User::with('role')->get();
        $usersData = $users->map(function($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'role' => $user->role->name,
                'createdAt' => Carbon::parse($user->created_at)->format('Y-m-d'),
                'phone' => $user->phone,
            ];
        });

        return $usersData;
    }

    public function fetchAllUsers()
    {
        return response()->json($this->allUsers());
    }

    /**
     * Reset password
     */
    public function resetPassword(Request $request, User $user)
    {
        $request->validate([
            'newPassword' => 'required|string|min:6',
            'confirmPassword' => 'required|string|min:6|same:newPassword',
        ]);
        try {
            $user->password = bcrypt($request->newPassword);
            $user->save();
            return redirect()->route('admin.users.index')->with('success', 'Password reset successfully.');
        } catch (Exception $e) {
            return redirect()->route('admin.users.index')->with('error', 'Sorry, something went wrong');
        }
    }
    
}
