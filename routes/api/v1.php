<?php

use App\Http\Controllers\Account\DeviceTokenController;
use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ClientPortalController;
use App\Http\Controllers\Api\V1\DirectoryController;
use App\Http\Controllers\Api\V1\WorkspaceController;
use App\Http\Controllers\Portal\PortalController;
use App\Http\Controllers\Public\ReportedJudgmentController;
use App\Http\Controllers\Shared\ConversationController;
use App\Http\Controllers\Workspace\AiController;
use App\Http\Controllers\Workspace\CaseController;
use App\Http\Controllers\Workspace\ClientController;
use App\Http\Controllers\Workspace\DocumentController;
use App\Http\Controllers\Workspace\DraftController;
use App\Http\Controllers\Workspace\HearingController;
use App\Http\Controllers\Workspace\InvoiceController;
use App\Http\Controllers\Workspace\TaskController;
use Illuminate\Support\Facades\Route;

/*
| Mobile REST API v1 (prefix /api/v1, names api.v1.*). Sanctum bearer tokens.
| Same middleware stack as the web areas: verified email, account type, organization context.
| Swagger annotations live in app/Swagger; docs at /api/documentation.
*/

// Public: sign-in / sign-up / password reset (same throttles as the web forms).
Route::prefix('auth')->name('auth.')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
    Route::post('two-factor-challenge', [AuthController::class, 'twoFactorChallenge'])->middleware('throttle:6,1,v1-two-factor')->name('two-factor');
    Route::get('register/options', [AuthController::class, 'registrationOptions'])->name('register.options');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:6,1,v1-register')->name('register');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1,v1-password-email')->name('password.email');
    Route::post('forgot-password/verify-code', [AuthController::class, 'verifyResetCode'])->middleware('throttle:10,1,v1-password-code')->name('password.code');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1,v1-password-update')->name('password.update');
});

// Public discovery.
Route::middleware('throttle:120,1,v1-public')->group(function () {
    Route::get('home', [DirectoryController::class, 'home'])->name('home');
    Route::get('specializations', [DirectoryController::class, 'specializations'])->name('specializations');
    Route::get('lawyers/filters', [DirectoryController::class, 'filters'])->name('lawyers.filters');
    Route::get('lawyers', [DirectoryController::class, 'lawyers'])->name('lawyers.index');
    Route::get('lawyers/{lawyer:slug}', [DirectoryController::class, 'lawyer'])->name('lawyers.show');
    Route::get('lawyers/{lawyer:slug}/slots', [DirectoryController::class, 'slots'])->name('lawyers.slots');
    Route::get('firms', [DirectoryController::class, 'firms'])->name('firms.index');
    Route::get('firms/{firm:slug}', [DirectoryController::class, 'firm'])->name('firms.show');
});

// Any signed-in user (verification not required, like the web's allowed routes).
Route::middleware(['auth:sanctum', 'api.active'])->group(function () {
    Route::get('auth/me', [AuthController::class, 'me'])->name('auth.me');
    Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
    Route::post('auth/email/verify', [AuthController::class, 'verifyEmail'])->middleware('throttle:10,1,v1-auth-email-verify')->name('auth.email.verify');
    Route::post('auth/email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:6,1,v1-auth-email-resend')->name('auth.email.resend');

    Route::post('account/device-token', [DeviceTokenController::class, 'store'])->middleware('throttle:30,1,v1-device-token-store')->name('device-token.store');
    Route::delete('account/device-token', [DeviceTokenController::class, 'destroy'])->name('device-token.destroy');
});

Route::middleware(['auth:sanctum', 'api.active', 'verified'])->group(function () {
    Route::put('account/profile', [AccountController::class, 'updateProfile'])->name('account.profile');
    Route::put('account/password', [AccountController::class, 'updatePassword'])->middleware('throttle:6,1,v1-account-password')->name('account.password');
    Route::get('account/two-factor', [AccountController::class, 'twoFactor'])->name('two-factor.show');
    Route::post('account/two-factor', [AccountController::class, 'enableTwoFactor'])->middleware('throttle:6,1,v1-two-factor-enable')->name('two-factor.enable');
    Route::post('account/two-factor/confirm', [AccountController::class, 'confirmTwoFactor'])->middleware('throttle:6,1,v1-two-factor-confirm')->name('two-factor.confirm');
    Route::post('account/two-factor/recovery-codes', [AccountController::class, 'recoveryCodes'])->middleware('throttle:6,1,v1-two-factor-recovery-codes')->name('two-factor.recovery-codes');
    Route::post('account/two-factor/recovery-codes/regenerate', [AccountController::class, 'regenerateRecoveryCodes'])->middleware('throttle:6,1,v1-two-factor-recovery-codes-regenerate')->name('two-factor.recovery-codes.regenerate');
    Route::delete('account/two-factor', [AccountController::class, 'disableTwoFactor'])->middleware('throttle:6,1,v1-two-factor-disable')->name('two-factor.disable');

    Route::get('notifications', [AccountController::class, 'notifications'])->name('notifications.index');
    Route::post('notifications/read-all', [AccountController::class, 'readAllNotifications'])->name('notifications.read-all');
    Route::post('notifications/{id}/read', [AccountController::class, 'readNotification'])->name('notifications.read');
    Route::get('notifications/preferences', [AccountController::class, 'preferences'])->name('notifications.preferences');
    Route::put('notifications/preferences', [AccountController::class, 'updatePreferences'])->name('notifications.preferences.update');

    Route::post('lawyers/{lawyer:slug}/favourite', [DirectoryController::class, 'toggleFavourite'])->name('lawyers.favourite');
});

// Client portal.
Route::middleware(['auth:sanctum', 'api.active', 'verified', 'account:client'])->prefix('client')->name('client.')->group(function () {
    Route::get('dashboard', [ClientPortalController::class, 'dashboard'])->name('dashboard');
    Route::get('cases', [ClientPortalController::class, 'cases'])->name('cases.index');
    Route::get('cases/{case}', [ClientPortalController::class, 'showCase'])->whereNumber('case')->name('cases.show');
    Route::get('documents', [ClientPortalController::class, 'documents'])->name('documents');
    Route::get('invoices', [ClientPortalController::class, 'invoices'])->name('invoices.index');
    Route::get('invoices/{invoice}', [ClientPortalController::class, 'showInvoice'])->whereNumber('invoice')->name('invoices.show');
    Route::get('favourites', [ClientPortalController::class, 'favourites'])->name('favourites');
    Route::get('appointments', [ClientPortalController::class, 'appointments'])->name('appointments.index');
    Route::post('lawyers/{lawyer:slug}/book', [ClientPortalController::class, 'book'])->middleware('throttle:10,1,v1-book')->name('book');
    Route::post('appointments/{appointment}/cancel', [ClientPortalController::class, 'cancel'])->name('appointments.cancel');
    Route::get('appointments/{appointment}/slots', [ClientPortalController::class, 'slots'])->name('appointments.slots');
    Route::post('appointments/{appointment}/reschedule', [ClientPortalController::class, 'reschedule'])->middleware('throttle:10,1,v1-appointments-reschedule')->name('appointments.reschedule');
});

// Lawyer / law firm workspace.
Route::middleware(['auth:sanctum', 'api.active', 'verified', 'account:lawyer,staff', 'workspace'])->prefix('workspace')->name('workspace.')->group(function () {
    Route::get('dashboard', [WorkspaceController::class, 'dashboard'])->name('dashboard');
    Route::get('cases', [WorkspaceController::class, 'cases'])->name('cases.index');
    Route::get('cases/{case}', [WorkspaceController::class, 'showCase'])->whereNumber('case')->name('cases.show');
    Route::get('diary', [WorkspaceController::class, 'diary'])->name('diary');
    Route::get('clients', [WorkspaceController::class, 'clients'])->name('clients.index');
    Route::get('clients/{client}', [WorkspaceController::class, 'showClient'])->whereNumber('client')->name('clients.show');
    Route::get('invoices', [WorkspaceController::class, 'invoices'])->name('invoices.index');
    Route::get('invoices/{invoice}', [WorkspaceController::class, 'showInvoice'])->whereNumber('invoice')->name('invoices.show');
    Route::get('team', [WorkspaceController::class, 'team'])->name('team');
    Route::get('appointments', [WorkspaceController::class, 'appointments'])->name('appointments.index');
    Route::post('appointments', [WorkspaceController::class, 'storeAppointment'])->name('appointments.store');
    Route::get('appointments/{appointment}', [WorkspaceController::class, 'showAppointment'])->whereNumber('appointment')->name('appointments.show');
    Route::post('appointments/{appointment}/status', [WorkspaceController::class, 'transitionAppointment'])->name('appointments.transition');
    Route::post('appointments/{appointment}/reschedule', [WorkspaceController::class, 'rescheduleAppointment'])->name('appointments.reschedule');
    Route::get('availability', [WorkspaceController::class, 'availability'])->name('availability');
    Route::put('availability', [WorkspaceController::class, 'updateAvailability'])->name('availability.update');
});

/*
| Web actions reused as-is (middleware `api.web`, App\Support\ApiBridge): the SAME controller method,
| FormRequest, policy, service and notifications as the web route of the same name, with the web
| route's own middleware and throttles. Page reads return the page props; writes return the flash
| message + where the web would go next ({route, params}); files stream as on the web.
*/
Route::middleware(['auth:sanctum', 'api.active', 'verified', 'account:lawyer,staff', 'workspace', 'api.web'])->prefix('workspace')->name('web.')->group(function () {
    // Clients
    Route::get('clients/create', [ClientController::class, 'create'])->name('clients.create');
    Route::post('clients', [ClientController::class, 'store'])->name('clients.store');
    Route::get('clients/{client}/edit', [ClientController::class, 'edit'])->name('clients.edit');
    Route::put('clients/{client}', [ClientController::class, 'update'])->name('clients.update');
    Route::delete('clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');
    Route::post('clients/{client}/portal-invite', [ClientController::class, 'invitePortal'])->middleware('throttle:10,1,v1-portal-invite')->name('clients.portal-invite');
    // Cases
    Route::get('cases/create', [CaseController::class, 'create'])->name('cases.create');
    Route::post('cases', [CaseController::class, 'store'])->name('cases.store');
    Route::get('cases/{case}/edit', [CaseController::class, 'edit'])->name('cases.edit');
    Route::put('cases/{case}', [CaseController::class, 'update'])->name('cases.update');
    Route::post('cases/{case}/archive', [CaseController::class, 'archive'])->name('cases.archive');
    // Hearings
    Route::post('cases/{case}/hearings', [HearingController::class, 'store'])->name('cases.hearings.store');
    Route::put('hearings/{hearing}', [HearingController::class, 'update'])->name('hearings.update');
    Route::post('hearings/{hearing}/reschedule', [HearingController::class, 'reschedule'])->name('hearings.reschedule');
    Route::post('hearings/{hearing}/cancel', [HearingController::class, 'cancel'])->name('hearings.cancel');
    Route::post('hearings/{hearing}/outcome', [HearingController::class, 'outcome'])->name('hearings.outcome');
    // Tasks
    Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
    Route::post('tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::put('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::post('tasks/{task}/toggle', [TaskController::class, 'toggle'])->name('tasks.toggle');
    Route::post('tasks/{task}/status', [TaskController::class, 'status'])->name('tasks.status');
    // Documents
    Route::get('documents', [DocumentController::class, 'index'])->name('documents.index');
    Route::post('documents', [DocumentController::class, 'store'])->middleware('throttle:60,1,v1-documents-store')->name('documents.store');
    Route::get('documents/{document}', [DocumentController::class, 'show'])->name('documents.show');
    Route::put('documents/{document}', [DocumentController::class, 'update'])->name('documents.update');
    Route::delete('documents/{document}', [DocumentController::class, 'destroy'])->name('documents.destroy');
    Route::post('documents/{document}/versions', [DocumentController::class, 'addVersion'])->name('documents.versions.store');
    Route::get('documents/{document}/download/{version?}', [DocumentController::class, 'download'])->name('documents.download');
    Route::post('documents/{document}/shares', [DocumentController::class, 'share'])->name('documents.shares.store');
    // Drafting
    Route::get('drafts', [DraftController::class, 'index'])->name('drafts.index');
    Route::get('drafts/create', [DraftController::class, 'create'])->name('drafts.create');
    Route::post('drafts', [DraftController::class, 'store'])->name('drafts.store');
    Route::get('drafts/{draft}', [DraftController::class, 'edit'])->name('drafts.edit');
    Route::put('drafts/{draft}', [DraftController::class, 'update'])->name('drafts.update');
    Route::post('drafts/{draft}/status', [DraftController::class, 'status'])->name('drafts.status');
    Route::get('drafts/{draft}/export/{format}', [DraftController::class, 'export'])->name('drafts.export');
    // Messages
    Route::get('messages', [ConversationController::class, 'index'])->name('messages.index');
    Route::post('messages', [ConversationController::class, 'store'])->name('messages.store');
    Route::get('messages/lawyers', [ConversationController::class, 'searchLawyers'])->middleware('throttle:120,1,v1-messages-lawyers')->name('messages.lawyers');
    Route::post('messages/direct', [ConversationController::class, 'startDirect'])->middleware('throttle:30,1,v1-messages-direct')->name('messages.direct');
    Route::post('messages/read-all', [ConversationController::class, 'markAllRead'])->name('messages.read-all');
    Route::get('messages/{conversation}', [ConversationController::class, 'show'])->name('messages.show');
    Route::post('messages/{conversation}', [ConversationController::class, 'send'])->middleware('throttle:60,1,v1-messages-send')->name('messages.send');
    Route::post('messages/{conversation}/read', [ConversationController::class, 'markRead'])->name('messages.read');
    Route::post('messages/{conversation}/archive', [ConversationController::class, 'archive'])->name('messages.archive');
    Route::get('messages/{conversation}/attachments/{message}', [ConversationController::class, 'attachment'])->name('messages.attachment');
    // Invoices & payments
    Route::get('invoices/create', [InvoiceController::class, 'create'])->name('invoices.create');
    Route::post('invoices', [InvoiceController::class, 'store'])->name('invoices.store');
    Route::get('invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('invoices.edit');
    Route::put('invoices/{invoice}', [InvoiceController::class, 'update'])->name('invoices.update');
    Route::post('invoices/{invoice}/issue', [InvoiceController::class, 'issue'])->name('invoices.issue');
    Route::post('invoices/{invoice}/void', [InvoiceController::class, 'void'])->name('invoices.void');
    Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'recordPayment'])->middleware('throttle:30,1,v1-invoice-payments')->name('invoices.payments.store');
    Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->name('invoices.pdf');
    Route::get('payments/{payment}/receipt', [InvoiceController::class, 'receipt'])->name('payments.receipt');
    // AI assistant
    Route::get('ai', [AiController::class, 'index'])->name('ai.index');
    Route::post('ai/run', [AiController::class, 'run'])->middleware('throttle:20,1,v1-ai-run')->name('ai.run');
});

Route::middleware(['auth:sanctum', 'api.active', 'verified', 'account:client', 'api.web'])->prefix('client')->name('web.portal.')->group(function () {
    Route::post('documents', [PortalController::class, 'upload'])->middleware('throttle:20,1,v1-portal-upload')->name('documents.store');
    Route::get('documents/{document}/download', [PortalController::class, 'download'])->name('documents.download');
    Route::get('invoices/{invoice}/pdf', [PortalController::class, 'invoicePdf'])->name('invoices.pdf');
    Route::get('receipts/{payment}', [PortalController::class, 'receipt'])->name('receipts.show');
    Route::post('lawyers/{lawyer:slug}/reviews', [PortalController::class, 'review'])->middleware('throttle:5,1,v1-portal-review')->name('reviews.store');
    Route::get('messages', [ConversationController::class, 'index'])->name('messages.index');
    Route::post('messages', [ConversationController::class, 'store'])->name('messages.store');
    Route::post('messages/read-all', [ConversationController::class, 'markAllRead'])->name('messages.read-all');
    Route::get('messages/{conversation}', [ConversationController::class, 'show'])->name('messages.show');
    Route::post('messages/{conversation}', [ConversationController::class, 'send'])->middleware('throttle:60,1,v1-portal-messages-send')->name('messages.send');
    Route::post('messages/{conversation}/read', [ConversationController::class, 'markRead'])->name('messages.read');
    Route::get('messages/{conversation}/attachments/{message}', [ConversationController::class, 'attachment'])->name('messages.attachment');
});

// Reported judgments: public (a signed-in user's plan decides PDF download, as on the web).
Route::middleware(['throttle:120,1,v1-judgments', 'api.web'])->name('web.')->group(function () {
    Route::get('judgments', [ReportedJudgmentController::class, 'index'])->name('judgments.index');
    Route::get('judgments/{judgment:slug}', [ReportedJudgmentController::class, 'show'])->name('judgments.show');
    Route::get('judgments/{judgment:slug}/pdf', [ReportedJudgmentController::class, 'viewPdf'])->name('judgments.pdf');
    Route::get('judgments/{judgment:slug}/pdf/download', [ReportedJudgmentController::class, 'downloadPdf'])->middleware('throttle:60,1,v1-judgments-download')->name('judgments.pdf.download');
});
