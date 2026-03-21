<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //
         User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Supper Admin',
                'password' => bcrypt('admin12345'),
                'role_id' => 1, 
                'phone' => '0123456789',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
    }
}
