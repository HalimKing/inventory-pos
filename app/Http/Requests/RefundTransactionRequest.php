<?php

namespace App\Http\Requests;

use App\Models\Sales;
use Illuminate\Foundation\Http\FormRequest;

class RefundTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('refund', Sales::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'reason' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.sale_item_id' => 'required|exists:sale_items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ];
    }
}
