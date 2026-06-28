<?php

namespace App\Enums;

enum AuditModule: string
{
    case Auth = 'auth';
    case Users = 'users';
    case Roles = 'roles';
    case Products = 'products';
    case Inventory = 'inventory';
    case Sales = 'sales';
    case System = 'system';
    case Api = 'api';
    case Errors = 'errors';
}
