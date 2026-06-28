<?php

namespace App\Providers;

use App\Listeners\LogAuthenticationEvents;
use App\Models\CompanySetting;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        LogAuthenticationEvents::subscribe();

        Inertia::share([
            'company' => function () {
                // Store it in session only once
                if (!session()->has('company_info')) {
                    $company = CompanySetting::first();
                    session(['company_info' => $company]);
                }

                return session('company_info');
            }
        ]);
    }
}
