<?php

namespace App\Exceptions;

use Exception;

class StockValidationException extends Exception
{
    /**
     * @param  array<int, string>  $errors
     */
    public function __construct(public array $errors)
    {
        parent::__construct(implode('; ', $errors));
    }
}
