<?php

namespace App\Services\Ai;

use Anthropic\Client;
use RuntimeException;

/**
 * Claude via the official Anthropic PHP SDK. Adaptive thinking is on by default
 * on current models; effort "medium" keeps drafting help responsive.
 * Refusals (stop_reason "refusal") surface as an error to the user.
 */
class AnthropicProvider implements AiProvider
{
    public function __construct(private string $apiKey, private string $model, private int $maxTokens) {}

    public function isEnabled(): bool
    {
        return $this->apiKey !== '';
    }

    public function name(): string
    {
        return 'anthropic';
    }

    public function complete(string $system, string $prompt): array
    {
        $client = new Client(apiKey: $this->apiKey);

        $message = $client->messages->create(
            maxTokens: max(1024, $this->maxTokens),
            messages: [['role' => 'user', 'content' => $prompt]],
            model: $this->model,
            system: $system,
            outputConfig: ['effort' => 'medium'],
        );

        if ($message->stopReason === 'refusal') {
            throw new RuntimeException(__('The AI assistant declined this request.'));
        }

        $text = '';
        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                $text .= $block->text;
            }
        }

        return [
            'text' => $text,
            'input_tokens' => $message->usage->inputTokens,
            'output_tokens' => $message->usage->outputTokens,
            'model' => $message->model,
        ];
    }
}
