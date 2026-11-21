<?php

use App\Http\Controllers\Account\DeviceTokenController;
use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ClientPortalController;
use App\Http\Controllers\Api\V1\DirectoryController;
use App\Http\Controllers\Api\V1\WorkspaceController;
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
    Route::get('cases/{case}', [ClientPortalController::class, 'showCase'])->name('cases.show');
    Route::get('documents', [ClientPortalController::class, 'documents'])->name('documents');
    Route::get('invoices', [ClientPortalController::class, 'invoices'])->name('invoices.index');
    Route::get('invoices/{invoice}', [ClientPortalController::class, 'showInvoice'])->name('invoices.show');
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
    Route::get('cases/{case}', [WorkspaceController::class, 'showCase'])->name('cases.show');
    Route::get('diary', [WorkspaceController::class, 'diary'])->name('diary');
    Route::get('clients', [WorkspaceController::class, 'clients'])->name('clients.index');
    Route::get('clients/{client}', [WorkspaceController::class, 'showClient'])->name('clients.show');
    Route::get('invoices', [WorkspaceController::class, 'invoices'])->name('invoices.index');
    Route::get('invoices/{invoice}', [WorkspaceController::class, 'showInvoice'])->name('invoices.show');
    Route::get('team', [WorkspaceController::class, 'team'])->name('team');
    Route::get('appointments', [WorkspaceController::class, 'appointments'])->name('appointments.index');
    Route::post('appointments', [WorkspaceController::class, 'storeAppointment'])->name('appointments.store');
    Route::get('appointments/{appointment}', [WorkspaceController::class, 'showAppointment'])->name('appointments.show');
    Route::post('appointments/{appointment}/status', [WorkspaceController::class, 'transitionAppointment'])->name('appointments.transition');
    Route::post('appointments/{appointment}/reschedule', [WorkspaceController::class, 'rescheduleAppointment'])->name('appointments.reschedule');
    Route::get('availability', [WorkspaceController::class, 'availability'])->name('availability');
    Route::put('availability', [WorkspaceController::class, 'updateAvailability'])->name('availability.update');
});
