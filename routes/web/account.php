<?php

use App\Http\Controllers\Account\AccountController;
use App\Http\Controllers\Account\FeedbackController;
use App\Http\Controllers\Account\HomeRedirectController;
use App\Http\Controllers\Account\NotificationController;
use App\Http\Controllers\Account\OnboardingController;
use App\Http\Controllers\Account\OrganizationSwitchController;
use App\Http\Controllers\Account\PreferenceController;
use App\Http\Controllers\Auth\OneTimeCodeController;
use App\Http\Controllers\Shared\CalendarController;
use App\Http\Controllers\Shared\ConversationController;
use App\Http\Controllers\Workspace\InvitationController;
use Illuminate\Support\Facades\Route;

Route::post('locale', [PreferenceController::class, 'locale'])->middleware('throttle:30,1')->name('locale.update');
Route::get('invitations/{token}', [InvitationController::class, 'show'])->name('invitations.show');

Route::middleware('guest')->group(function () {
    // Password reset by six-digit code (docs/Modules/Authentication.md).
    Route::get('forgot-password/code', [OneTimeCodeController::class, 'showReset'])->name('password.code');
    Route::post('forgot-password/code', [OneTimeCodeController::class, 'verifyReset'])->middleware('throttle:10,1')->name('password.code.verify');
});

Route::middleware('auth')->group(function () {
    Route::post('email/verify-code', [OneTimeCodeController::class, 'verifyEmail'])->middleware('throttle:10,1')->name('verification.code');
    Route::get('home', HomeRedirectController::class)->name('home.redirect');
    Route::post('theme', [PreferenceController::class, 'theme'])->name('theme.update');
    Route::post('invitations/{token}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');

    // Calendar for every account type (docs/Modules/Calendar.md).
    Route::get('calendar', [CalendarController::class, 'index'])->name('calendar.index');
    Route::get('calendar/events', [CalendarController::class, 'events'])->middleware('throttle:120,1')->name('calendar.events');
    Route::post('calendar/events', [CalendarController::class, 'store'])->middleware('throttle:30,1')->name('calendar.store');
    Route::put('calendar/events/{event}', [CalendarController::class, 'update'])->name('calendar.update');
    Route::post('calendar/events/{event}/reschedule', [CalendarController::class, 'reschedule'])->name('calendar.reschedule');
    Route::post('calendar/events/{event}/cancel', [CalendarController::class, 'cancel'])->name('calendar.cancel');
    Route::post('calendar/events/{event}/complete', [CalendarController::class, 'complete'])->name('calendar.complete');
    Route::get('calendar/history/{source}/{id}', [CalendarController::class, 'history'])->whereIn('source', ['event', 'hearing', 'appointment'])->whereNumber('id')->name('calendar.history');

    // Header messages menu (workspace and portal).
    Route::get('inbox/recent', [ConversationController::class, 'recent'])->middleware('throttle:120,1')->name('inbox.recent');
    Route::post('inbox/{conversation}/read', [ConversationController::class, 'markReadJson'])->name('inbox.read');

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
