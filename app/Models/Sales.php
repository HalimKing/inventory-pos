<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Sales extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'customer_name',
        'subtotal',
        'user_id',
        'amount_paid',
        'change_amount',
        'payment_method',
        'discount_percentage',
        'discount_amount',
        'grand_total',
        'status',
        'offline_sync_id',
        'synced_at',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function saleItems()
    {
        // Explicitly specify the foreign key column name
        return $this->hasMany(SaleItem::class, 'sale_id');
    }
}
