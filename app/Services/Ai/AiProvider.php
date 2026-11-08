<?php

namespace App\Services\Ai;

/**
 * Provider abstraction for AI assistance (docs/Modules/AI-Assistant.md).
 * Implementations must never be called with unredacted confidential data —
 * callers pass text through App\Services\Ai\Redactor first.
 */
interface AiProvider
{
    public function isEnabled(): bool;

    public function name(): string;

    /**
     * @return array{text: string, input_tokens: int|null, output_tokens: int|null, model: string|null}
     */
    public function complete(string $system, string $prompt): array;
}
