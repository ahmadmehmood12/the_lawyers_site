<?php

namespace App\Http\Controllers\Webhooks;

use App\Enums\DeliveryStatus;
use App\Http\Controllers\Controller;
use App\Models\NotificationDelivery;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Meta webhook: verification handshake + message status callbacks (signature verified). */
class WhatsAppWebhookController extends Controller
{
    public function verify(Request $request): Response
    {
        $token = config('services.whatsapp.verify_token');

        if ($token && $request->query('hub_mode') === 'subscribe' && hash_equals($token, (string) $request->query('hub_verify_token'))) {
            return response((string) $request->query('hub_challenge'), 200);
        }

        return response('Forbidden', 403);
    }

    public function handle(Request $request, WhatsAppClient $client): Response
    {
        if (! $client->signatureIsValid($request->getContent(), $request->header('X-Hub-Signature-256'))) {
            return response('Invalid signature', 401);
        }

        foreach ((array) $request->input('entry', []) as $entry) {
            foreach ((array) ($entry['changes'] ?? []) as $change) {
                foreach ((array) data_get($change, 'value.statuses', []) as $status) {
                    $this->applyStatus((string) ($status['id'] ?? ''), (string) ($status['status'] ?? ''), $status);
                }
            }
        }

        return response('OK', 200);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function applyStatus(string $messageId, string $status, array $payload): void
    {
        $delivery = $messageId !== '' ? NotificationDelivery::query()->where('provider_message_id', $messageId)->first() : null;

        if (! $delivery) {
            return;
        }

        match ($status) {
            'delivered' => $delivery->update(['status' => DeliveryStatus::Delivered, 'delivered_at' => now()]),
            'read' => $delivery->update(['status' => DeliveryStatus::Read, 'read_at' => now()]),
            'failed' => $delivery->update(['status' => DeliveryStatus::Failed, 'error' => mb_substr(json_encode(data_get($payload, 'errors')), 0, 500)]),
            default => null,
        };
    }
}
