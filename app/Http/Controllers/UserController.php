<?php

namespace App\Http\Controllers;

use App\Enums\AuditModule;
use App\Enums\AuditSeverity;
use App\Enums\AuditStatus;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
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
        $this->authorize('viewAny', User::class);

        $usersData = $this->allUsers();
<<<<<<< HEAD
        // dd($usersData);
=======

>>>>>>> 67f5ce7 (updating the login and other pages UI)
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
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string',
            'role' => 'required|string|in:supper admin,admin,cashier,inventory',
            'status' => 'required|string|in:active,inactive',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $this->authorize('createWithRole', [User::class, $request->role]);

        try {
            $isRole = Role::where('name', $request->role)->first();
            if (empty($isRole)) {
                return redirect()->route('users.index')->with('error', 'This role is not in the role list.');
            }

            $user = new User;
            $user->name = $request->name;
            $user->email = $request->email;
            $user->phone = $request->phone;
            $user->status = $request->status;
            $user->password = $request->password;
            $user->role_id = $isRole->id;
            $user->save();

            AuditLogger::record(
                eventType: 'user.created',
                module: AuditModule::Users,
                description: "User account created: {$user->name}",
                user: $request->user(),
                request: $request,
                resourceType: User::class,
                resourceId: (string) $user->id,
                newValues: [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $request->role,
                    'status' => $user->status,
                ],
            );

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
        $user = User::with('role')->findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$id,
            'phone' => 'required|string',
            'role' => 'required|string|in:supper admin,admin,cashier,inventory',
        ]);

        $this->authorize('updateWithRole', [$user, $request->role]);

        try {
            $isRole = Role::where('name', $request->role)->first();
            if (empty($isRole)) {
                return redirect()->route('admin.users.index')->with('error', 'This role is not in the role list.');
            }

            $oldValues = [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role?->name,
            ];

            $user->name = $request->name;
            $user->email = $request->email;
            $user->phone = $request->phone;
            $user->role_id = $isRole->id; // default role as 'User'
            $user->save();

            AuditLogger::record(
                eventType: 'user.updated',
                module: AuditModule::Users,
                description: "User account updated: {$user->name}",
                user: $request->user(),
                request: $request,
                resourceType: User::class,
                resourceId: (string) $user->id,
                oldValues: $oldValues,
                newValues: [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $request->role,
                ],
            );

            if (($oldValues['role'] ?? null) !== $request->role) {
                AuditLogger::record(
                    eventType: 'role.changed',
                    module: AuditModule::Roles,
                    description: "Role changed for {$user->name}",
                    user: $request->user(),
                    request: $request,
                    resourceType: User::class,
                    resourceId: (string) $user->id,
                    oldValues: ['role' => $oldValues['role'] ?? null],
                    newValues: ['role' => $request->role],
                    severity: AuditSeverity::Warning,
                );
            }

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
        $user = User::with('role')->findOrFail($id);
        $this->authorize('updateStatus', $user);

        try {
            $previousStatus = $user->status;

            if ($user->status === 'active') {
                $user->status = 'inactive';
            } else {
                $user->status = 'active';
            }
            $user->save();

            AuditLogger::record(
                eventType: $user->status === 'active' ? 'user.activated' : 'user.deactivated',
                module: AuditModule::Users,
                description: "User status changed for {$user->name}",
                user: request()->user(),
                request: request(),
                resourceType: User::class,
                resourceId: (string) $user->id,
                oldValues: ['status' => $previousStatus],
                newValues: ['status' => $user->status],
                severity: AuditSeverity::Warning,
            );

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
        $user = User::with('role')->findOrFail($id);
        $this->authorize('delete', $user);

        try {
            AuditLogger::record(
                eventType: 'user.deleted',
                module: AuditModule::Users,
                description: "User account deleted: {$user->name}",
                user: request()->user(),
                request: request(),
                resourceType: User::class,
                resourceId: (string) $user->id,
                oldValues: [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role?->name,
                ],
                severity: AuditSeverity::Warning,
            );

            $user->delete();

            return response()->json(['message' => 'User deleted successfully']);
        } catch (Exception $e) {
            return response()->json(['message' => 'Sorry, something went wrong'], 500);
        }
    }

    public function allUsers()
    {
<<<<<<< HEAD
        $users = User::with('role')->get();
        $usersData = $users->map(function($user) {
=======
        $this->authorize('viewAny', User::class);

        $users = User::with('role')->get();
        $usersData = $users->map(function ($user) {
>>>>>>> 67f5ce7 (updating the login and other pages UI)
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
        $this->authorize('resetPassword', $user);

        $request->validate([
            'newPassword' => 'required|string|min:6',
            'confirmPassword' => 'required|string|min:6|same:newPassword',
        ]);
        try {
            $user->password = bcrypt($request->newPassword);
            $user->save();

            AuditLogger::record(
                eventType: 'user.password_reset',
                module: AuditModule::Users,
                description: "Admin reset password for {$user->name}",
                user: $request->user(),
                request: $request,
                resourceType: User::class,
                resourceId: (string) $user->id,
                severity: AuditSeverity::Warning,
            );

            return redirect()->route('admin.users.index')->with('success', 'Password reset successfully.');
        } catch (Exception $e) {
            return redirect()->route('admin.users.index')->with('error', 'Sorry, something went wrong');
        }
    }
}
