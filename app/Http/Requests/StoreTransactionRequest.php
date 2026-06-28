<?php

namespace App\Http\Requests;

use App\Models\Sales;
use Illuminate\Foundation\Http\FormRequest;

class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Sales::class) ?? false;
    }

    public function rules()
    {
        return [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.subtotal' => 'required|numeric|min:0',
            'customer_name' => 'nullable|string|max:255',
            'subtotal' => 'required|numeric|min:0',
            'discount_amount' => 'required|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'total_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,card,momo',
            'amount_received' => 'required|numeric|min:0',
            'change_amount' => 'required|numeric|min:0',
        ];
    }

    public function messages()
    {
        return [
            'items.required' => 'At least one item is required for the transaction.',
            'items.*.product_id.exists' => 'One or more products do not exist.',
            'items.*.quantity.min' => 'Quantity must be at least 1.',
            'payment_method.in' => 'Payment method must be cash, card, or momo.',
        ];
    }
}
