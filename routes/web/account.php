<?php

use App\Http\Controllers\Account\AccountController;
use App\Http\Controllers\Account\FeedbackController;
use App\Http\Controllers\Account\HomeRedirectController;
use App\Http\Controllers\Account\NotificationController;
use App\Http\Controllers\Account\OnboardingController;
use App\Http\Controllers\Account\OrganizationSwitchController;
use App\Http\Controllers\Account\PreferenceController;
use App\Http\Controllers\Workspace\InvitationController;
use Illuminate\Support\Facades\Route;

Route::post('locale', [PreferenceController::class, 'locale'])->middleware('throttle:30,1')->name('locale.update');
Route::get('invitations/{token}', [InvitationController::class, 'show'])->name('invitations.show');

Route::middleware('auth')->group(function () {
    Route::get('home', HomeRedirectController::class)->name('home.redirect');
    Route::post('theme', [PreferenceController::class, 'theme'])->name('theme.update');
    Route::post('invitations/{token}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');

    Route::get('feedback', [FeedbackController::class, 'create'])->name('feedback.create');
    Route::post('feedback', [FeedbackController::class, 'store'])->middleware('throttle:6,1')->name('feedback.store');

    Route::get('account', [AccountController::class, 'edit'])->name('account.edit');
    Route::post('account/avatar', [AccountController::class, 'updateAvatar'])->name('account.avatar.update');
    Route::delete('account/avatar', [AccountController::class, 'removeAvatar'])->name('account.avatar.destroy');
    Route::post('account/sessions/logout-others', [AccountController::class, 'logoutOtherSessions'])->name('account.sessions.logout');
    Route::post('account/deletion', [AccountController::class, 'requestDeletion'])->name('account.deletion.request');
    Route::delete('account/deletion', [AccountController::class, 'cancelDeletion'])->name('account.deletion.cancel');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::get('notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');
    Route::put('notifications/preferences', [NotificationController::class, 'updatePreferences'])->name('notifications.preferences');

    Route::get('onboarding/organization', [OnboardingController::class, 'show'])->name('onboarding.organization');
    Route::post('onboarding/organization', [OnboardingController::class, 'store'])->name('onboarding.organization.store');
    Route::post('organizations/{organization}/switch', OrganizationSwitchController::class)->name('organizations.switch');
});
