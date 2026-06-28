<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Enums\AuditModule;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SettingsController extends Controller
{
    //

    public function index()
    {
        $companySettings = CompanySetting::first();
        
        $companySettingsData =  [
                'companyName' => $companySettings->company_name,
                'email' => $companySettings->email,
                'phone' => $companySettings->phone,
                'address' => $companySettings->address,
                'country' => $companySettings->country,
                'returnPolicy' => $companySettings->return_policy,
                'thankYouMessage' => $companySettings->thank_you_message,
                'website' => $companySettings->website,
                'logo' => $companySettings->logo,
            ];
        
        return Inertia::render('settings/index', [
            'companySettings' => $companySettingsData,
        ]);
    }

    // update company settings
    public function update(Request $request)
    {
        $validatedData = $request->validate([
            'companyName' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'address' => 'required|string|max:500',
            'country' => 'required|string|max:100',
            'returnPolicy' => 'nullable|string',
            'thankYouMessage' => 'nullable|string',
            'website' => 'nullable|url|max:255',
            'logoFile' => 'nullable|file|max:255',
        ]);
        // dd($validatedData);
        // Log::info('logo File: ' . print_r($request->file('logoFile'), true));

        $companySettings = CompanySetting::first();

        if ($companySettings) {
            $oldValues = $companySettings->only([
                'company_name', 'email', 'phone', 'address', 'country',
                'return_policy', 'thank_you_message', 'website',
            ]);

             if ($request->hasFile('logoFile')) {
                 if (file_exists($companySettings->logo)) {
                    Storage::disk('public')->delete($companySettings->logo);
                }
                $file = $request->file('logoFile');
                $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $filePath = $file->storeAs('uploads/logos', $fileName, 'public');
                 $companySettings->logo = $filePath;
                // dd($filePath);
            // Delete old logo if exists
               
                
                // $companySettings->logo = $filePath;
            }

            $companySettings->company_name = $validatedData['companyName'];
            $companySettings->email = $validatedData['email'];
            $companySettings->phone = $validatedData['phone'];
            $companySettings->address = $validatedData['address'];
            $companySettings->country = $validatedData['country'];
            $companySettings->return_policy = $validatedData['returnPolicy'];
            $companySettings->thank_you_message = $validatedData['thankYouMessage'];
            $companySettings->website = $validatedData['website'];
            $companySettings->save();
             session(['company_info' => $companySettings]);

            AuditLogger::record(
                eventType: 'system.settings_updated',
                module: AuditModule::System,
                description: 'Company settings updated',
                user: $request->user(),
                request: $request,
                resourceType: CompanySetting::class,
                resourceId: (string) $companySettings->id,
                oldValues: $oldValues,
                newValues: [
                    'company_name' => $companySettings->company_name,
                    'email' => $companySettings->email,
                    'phone' => $companySettings->phone,
                    'address' => $companySettings->address,
                    'country' => $companySettings->country,
                    'return_policy' => $companySettings->return_policy,
                    'thank_you_message' => $companySettings->thank_you_message,
                    'website' => $companySettings->website,
                ],
            );

    return redirect()->back()->with('success', 'Company settings updated successfully.');
        } else {
            CompanySetting::create($validatedData);
            return redirect()->route('admin.settings.index')->with('success', 'Company settings created successfully.');
        }
    }
}
