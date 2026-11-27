<?php

use App\Http\Controllers\Api\AppConfigController;
use App\Http\Controllers\Api\JudgmentImportController;
use App\Http\Controllers\Api\JudgmentNeedsTextController;
use App\Http\Controllers\Api\JudgmentPdfController;
use App\Http\Controllers\Api\JudgmentTextController;
use App\Http\Controllers\Webhooks\GreenApiWebhookController;
use App\Http\Controllers\Webhooks\PaymentWebhookController;
use App\Http\Controllers\Webhooks\StripeWebhookController;
use App\Http\Controllers\Webhooks\WhatsAppWebhookController;
use App\Http\Middleware\EnsureJudgmentImportToken;
use App\Http\Middleware\SetApiLocale;
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

/*
| Python scrapers (judgements-scrapers/*-scraper) import judgment metadata.
| Protected by JUDGMENTS_IMPORT_TOKEN; see docs/judgment-automation.md.
*/
Route::post('judgments/import', JudgmentImportController::class)
    ->middleware([EnsureJudgmentImportToken::class, 'throttle:600,1'])
    ->name('api.judgments.import');

// The scrapers' PDF text indexer sends extracted page text + keywords (phrase/keyword search).
Route::post('judgments/text', JudgmentTextController::class)
    ->middleware([EnsureJudgmentImportToken::class, 'throttle:600,1'])
    ->name('api.judgments.text');

// Judgments whose text is partial / waiting for OCR, so the scrapers can re-read them (--reindex-scanned).
Route::get('judgments/needs-text', JudgmentNeedsTextController::class)
    ->middleware([EnsureJudgmentImportToken::class, 'throttle:60,1,judgments-needs-text'])
    ->name('api.judgments.needs-text');

// The scrapers upload the downloaded PDF file so the site can store and serve it itself.
Route::post('judgments/pdf', JudgmentPdfController::class)
    ->middleware([EnsureJudgmentImportToken::class, 'throttle:300,1'])
    ->name('api.judgments.pdf');

/*
| Public configuration the companion mobile apps fetch on launch
| (app name/icon, iOS/Android versions + store links, flags). No secrets.
*/
Route::get('app/config', AppConfigController::class)->middleware('throttle:120,1')->name('api.app.config');

/*
| Mobile apps REST API v1 (Sanctum). See routes/api/v1.php and /api/documentation.
*/
Route::prefix('v1')->name('api.v1.')->middleware(SetApiLocale::class)->group(base_path('routes/api/v1.php'));
