<?php

namespace App\Enums;

enum AuditStatus: string
{
    case Success = 'success';
    case Failed = 'failed';
    case Warning = 'warning';
}
