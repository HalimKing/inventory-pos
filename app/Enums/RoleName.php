<?php

namespace App\Enums;

enum RoleName: string
{
    case SuperAdmin = 'supper admin';
    case Admin = 'admin';
    case Cashier = 'cashier';
    case Inventory = 'inventory';
}
