<?php

namespace App\Services\Ai;

use RuntimeException;

/** Used when no AI provider key is configured. */
class DisabledProvider implements AiProvider
{
    public function isEnabled(): bool
    {
        return false;
    }

    public function name(): string
    {
        return 'disabled';
    }

    public function complete(string $system, string $prompt): array
    {
        throw new RuntimeException('AI assistant is not configured.');
    }
}
