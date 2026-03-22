<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id', // This should be UUID
        'product_id',
        'product_batch_id',
        'category_id',
        'product_name',
        'quantity',
        'price',
        'total_amount',
        'quantity_left',
        'quantity_sold',
        'profit',
        'expiry_date'
    ];

    // Cast sale_id as string for UUID
    protected $casts = [
        'sale_id' => 'string',
    ];

    // Relationship to Sale
    public function sale()
    {
        return $this->belongsTo(Sales::class, 'sale_id');
    }

    // Relationship to Category
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    // Relationship to Product
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function productBatch()
    {
        return $this->belongsTo(ProductBatch::class, 'product_batch_id');
    }
}
