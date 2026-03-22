<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    protected $fillable = [
        'name',
        'category_id',
        'supplier_id',
        'barcode',
        'quantity',
        'selling_price',
        'cost_price',
        'total_quantity',
        'profit',
        'total_profit',
        'image',
        'expiry_date',
        'quantity_left',
        'quantity_sold',
        'reorder_level',
        'has_expiry',
        'track_batch',
        'track_serial',
    ];

    protected $casts = [
        'has_expiry' => 'boolean',
        'track_batch' => 'boolean',
        'track_serial' => 'boolean',
        'expiry_date' => 'date',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class);
    }

    public function productBatches(): HasMany
    {
        return $this->hasMany(ProductBatch::class);
    }
}
