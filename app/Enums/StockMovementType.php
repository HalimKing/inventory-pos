<?php

namespace App\Enums;

enum StockMovementType: string
{
    case Initial = 'initial';
    case StockIn = 'stock_in';
    case Sale = 'sale';
    case Refund = 'refund';
    case Adjustment = 'adjustment';
}
