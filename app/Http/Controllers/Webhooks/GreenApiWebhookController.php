<?php

namespace App\Http\Controllers\Webhooks;

use App\Enums\DeliveryStatus;
use App\Http\Controllers\Controller;
use App\Models\NotificationDelivery;
use App\Services\WhatsApp\WhatsAppClient;
use App\Services\WhatsApp\WhatsAppConsent;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Green-API webhook (docs/Features/WhatsApp.md#green-api). Set the instance webhookUrl to this endpoint
 * and webhookUrlToken to the token saved in Admin, Settings, WhatsApp; Green-API then sends
 * "Authorization: Bearer <token>". Handles outgoingMessageStatus (delivery ticks) and
 * incomingMessageReceived (STOP replies withdraw consent). Always answers 200 for valid calls so
 * Green-API does not keep retrying.
 */
class GreenApiWebhookController extends Controller
{
    public function __invoke(Request $request, WhatsAppClient $client, WhatsAppConsent $consent): Response
    {
        if (! $client->greenApi()->webhookAuthorized($request->header('Authorization'))) {
            return response('Unauthorized', 401);
        }

        $configured = (string) $client->greenApi()->settings()['id_instance'];
        $instance = (string) data_get($request->all(), 'instanceData.idInstance', '');
        if ($configured !== '' && $instance !== '' && $instance !== $configured) {
            return response('Unknown instance', 200);
        }

        match ((string) $request->input('typeWebhook')) {
            'outgoingMessageStatus' => $this->status((string) $request->input('idMessage'), (string) $request->input('status'), (string) $request->input('description', '')),
            'incomingMessageReceived' => $this->incoming($request, $consent),
            default => null,
        };

        return response('OK', 200);
    }

    private function status(string $messageId, string $status, string $description): void
    {
        $delivery = $messageId !== '' ? NotificationDelivery::query()->where('provider', 'green_api')->where('provider_message_id', $messageId)->first() : null;

        if (! $delivery) {
            return;
        }

        match ($status) {
            'delivered' => $delivery->update(['status' => DeliveryStatus::Delivered, 'delivered_at' => now()]),
            'read' => $delivery->update(['status' => DeliveryStatus::Read, 'read_at' => now()]),
            'failed', 'noAccount', 'notInGroup', 'suspended', 'yellowCard' => $delivery->update([
                'status' => DeliveryStatus::Failed,
                'error' => mb_substr($status === 'noAccount' ? 'no_whatsapp_account' : trim($status.' '.$description), 0, 500),
            ]),
            default => null,
        };
    }

    private function incoming(Request $request, WhatsAppConsent $consent): void
    {
        $chatId = (string) data_get($request->all(), 'senderData.chatId', '');
        $text = (string) (data_get($request->all(), 'messageData.textMessageData.textMessage')
            ?? data_get($request->all(), 'messageData.extendedTextMessageData.text', ''));

        if (str_ends_with($chatId, '@c.us') && WhatsAppConsent::isOptOut($text)) {
            $consent->optOutByNumber(strstr($chatId, '@', true) ?: '');
        }
    }
}
