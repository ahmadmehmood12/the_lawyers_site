<?php

use App\Http\Controllers\Webhooks\GreenApiWebhookController;
use App\Http\Controllers\Webhooks\PaymentWebhookController;
use App\Http\Controllers\Webhooks\StripeWebhookController;
use App\Http\Controllers\Webhooks\WhatsAppWebhookController;
use Illuminate\Support\Facades\Route;

/*
| Machine-to-machine endpoints. Every webhook verifies the provider
| signature itself — see docs/Features/WhatsApp.md and Finance-and-Receipts.md.
*/

Route::get('webhooks/whatsapp', [WhatsAppWebhookController::class, 'verify'])->name('webhooks.whatsapp.verify');
Route::post('webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle'])->middleware('throttle:120,1')->name('webhooks.whatsapp');
Route::post('webhooks/green-api', GreenApiWebhookController::class)->middleware('throttle:240,1')->name('webhooks.green-api');
Route::post('webhooks/payments/{provider}', PaymentWebhookController::class)->middleware('throttle:120,1')->name('webhooks.payments');
Route::post('webhooks/stripe', StripeWebhookController::class)->middleware('throttle:120,1')->name('webhooks.stripe');
