<?php

use App\Http\Controllers\Shared\ConversationController;
use App\Http\Controllers\Workspace\ActivityController;
use App\Http\Controllers\Workspace\AiController;
use App\Http\Controllers\Workspace\AnalyticsController;
use App\Http\Controllers\Workspace\AppointmentController;
use App\Http\Controllers\Workspace\ArticleController;
use App\Http\Controllers\Workspace\CaseController;
use App\Http\Controllers\Workspace\ClientController;
use App\Http\Controllers\Workspace\DashboardController;
use App\Http\Controllers\Workspace\DiaryController;
use App\Http\Controllers\Workspace\DocumentController;
use App\Http\Controllers\Workspace\DraftController;
use App\Http\Controllers\Workspace\ExpenseController;
use App\Http\Controllers\Workspace\HearingController;
use App\Http\Controllers\Workspace\InvoiceController;
use App\Http\Controllers\Workspace\LawyerProfileController;
use App\Http\Controllers\Workspace\OrganizationSettingsController;
use App\Http\Controllers\Workspace\TaskController;
use App\Http\Controllers\Workspace\TeamController;
use App\Http\Controllers\Workspace\VerificationController;
use Illuminate\Support\Facades\Route;

/*
| Workspace: lawyers and firm staff. `workspace` resolves the current
| organization; every controller then authorizes per record via policies.
*/
Route::middleware(['auth', 'verified', 'account:lawyer,staff', 'workspace'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('activity', [ActivityController::class, 'index'])->name('activity.index');
    Route::get('activity/recent', [ActivityController::class, 'recent'])->name('activity.recent');

    Route::resource('clients', ClientController::class);

    Route::resource('cases', CaseController::class)->except('destroy')->parameters(['cases' => 'case']);
    Route::put('cases/{case}/lawyers', [CaseController::class, 'updateLawyers'])->name('cases.lawyers.update');
    Route::post('cases/{case}/archive', [CaseController::class, 'archive'])->name('cases.archive');
    Route::post('cases/{case}/hearings', [HearingController::class, 'store'])->name('cases.hearings.store');
    Route::post('cases/{case}/expenses', [ExpenseController::class, 'store'])->name('cases.expenses.store');
    Route::delete('expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');

    Route::put('hearings/{hearing}', [HearingController::class, 'update'])->name('hearings.update');
    Route::post('hearings/{hearing}/reschedule', [HearingController::class, 'reschedule'])->name('hearings.reschedule');
    Route::post('hearings/{hearing}/cancel', [HearingController::class, 'cancel'])->name('hearings.cancel');
    Route::post('hearings/{hearing}/outcome', [HearingController::class, 'outcome'])->name('hearings.outcome');
    Route::get('hearings-conflicts', [HearingController::class, 'conflicts'])->name('hearings.conflicts');

    Route::get('diary', [DiaryController::class, 'index'])->name('diary.index');
    Route::get('diary/pdf', [DiaryController::class, 'pdf'])->name('diary.pdf');
    Route::post('diary/entries', [DiaryController::class, 'storeEntry'])->name('diary.entries.store');
    Route::delete('diary/entries/{entry}', [DiaryController::class, 'destroyEntry'])->name('diary.entries.destroy');

    Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
    Route::post('tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::put('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::post('tasks/{task}/toggle', [TaskController::class, 'toggle'])->name('tasks.toggle');

    Route::get('documents', [DocumentController::class, 'index'])->name('documents.index');
    Route::post('documents', [DocumentController::class, 'store'])->middleware('throttle:60,1')->name('documents.store');
    Route::get('documents/{document}', [DocumentController::class, 'show'])->name('documents.show');
    Route::put('documents/{document}', [DocumentController::class, 'update'])->name('documents.update');
    Route::delete('documents/{document}', [DocumentController::class, 'destroy'])->name('documents.destroy');
    Route::post('documents/{document}/versions', [DocumentController::class, 'addVersion'])->name('documents.versions.store');
    Route::get('documents/{document}/download/{version?}', [DocumentController::class, 'download'])->name('documents.download');
    Route::post('documents/{document}/shares', [DocumentController::class, 'share'])->name('documents.shares.store');
    Route::delete('document-shares/{share}', [DocumentController::class, 'revokeShare'])->name('documents.shares.destroy');
});

Route::middleware(['auth', 'verified', 'account:lawyer,staff', 'workspace'])->group(function () {
    Route::get('team', [TeamController::class, 'index'])->name('team.index');
    Route::post('team/invitations', [TeamController::class, 'invite'])->middleware('throttle:20,1')->name('team.invite');
    Route::delete('team/invitations/{invitation}', [TeamController::class, 'revokeInvitation'])->name('team.invitations.destroy');
    Route::put('team/members/{member}', [TeamController::class, 'update'])->name('team.members.update');
});

Route::middleware(['auth', 'verified', 'account:lawyer', 'workspace'])->prefix('profile')->name('lawyer.')->group(function () {
    Route::get('/', [LawyerProfileController::class, 'edit'])->name('profile.edit');
    Route::put('steps/{step}', [LawyerProfileController::class, 'update'])->name('profile.update');
    Route::post('photo', [LawyerProfileController::class, 'photo'])->name('profile.photo');
    Route::get('verification', [VerificationController::class, 'show'])->name('verification.show');
    Route::post('verification/documents', [VerificationController::class, 'upload'])->middleware('throttle:30,1')->name('verification.upload');
    Route::delete('verification/documents/{document}', [VerificationController::class, 'destroyDocument'])->name('verification.documents.destroy');
    Route::get('verification/documents/{document}', [VerificationController::class, 'download'])->name('verification.documents.download');
    Route::post('verification/submit', [VerificationController::class, 'submit'])->name('verification.submit');
});

Route::middleware(['auth', 'verified', 'account:lawyer,staff', 'workspace'])->group(function () {
    Route::get('messages', [ConversationController::class, 'index'])->name('messages.index');
    Route::post('messages', [ConversationController::class, 'store'])->name('messages.store');
    Route::get('messages/{conversation}', [ConversationController::class, 'show'])->name('messages.show');
    Route::post('messages/{conversation}', [ConversationController::class, 'send'])->middleware('throttle:60,1')->name('messages.send');
    Route::post('messages/{conversation}/archive', [ConversationController::class, 'archive'])->name('messages.archive');
    Route::get('messages/{conversation}/attachments/{message}', [ConversationController::class, 'attachment'])->name('messages.attachment');
});

Route::middleware(['auth', 'verified', 'account:lawyer,staff', 'workspace'])->group(function () {
    Route::get('appointments', [AppointmentController::class, 'index'])->name('appointments.index');
    Route::post('appointments', [AppointmentController::class, 'store'])->name('appointments.store');
    Route::post('appointments/{appointment}/status', [AppointmentController::class, 'transition'])->name('appointments.transition');
    Route::post('appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule'])->name('appointments.reschedule');
    Route::put('availability', [AppointmentController::class, 'updateAvailability'])->name('availability.update');
    Route::post('availability/holidays', [AppointmentController::class, 'storeHoliday'])->name('availability.holidays.store');
    Route::delete('availability/holidays/{holiday}', [AppointmentController::class, 'destroyHoliday'])->name('availability.holidays.destroy');
});

Route::middleware(['auth', 'verified', 'account:lawyer,staff', 'workspace'])->group(function () {
    Route::get('invoices/export', [InvoiceController::class, 'export'])->name('invoices.export');
    Route::resource('invoices', InvoiceController::class)->except('destroy');
    Route::post('invoices/{invoice}/issue', [InvoiceController::class, 'issue'])->name('invoices.issue');
    Route::post('invoices/{invoice}/void', [InvoiceController::class, 'void'])->name('invoices.void');
    Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'recordPayment'])->middleware('throttle:30,1')->name('invoices.payments.store');
    Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->name('invoices.pdf');
    Route::post('payments/{payment}/refunds', [InvoiceController::class, 'refund'])->name('payments.refunds.store');
    Route::get('payments/{payment}/receipt', [InvoiceController::class, 'receipt'])->name('payments.receipt');
});

Route::middleware(['auth', 'verified', 'account:lawyer,staff', 'workspace'])->group(function () {
    Route::get('drafts', [DraftController::class, 'index'])->name('drafts.index');
    Route::get('drafts/create', [DraftController::class, 'create'])->name('drafts.create');
    Route::post('drafts', [DraftController::class, 'store'])->name('drafts.store');
    Route::get('drafts/{draft}', [DraftController::class, 'edit'])->name('drafts.edit');
    Route::put('drafts/{draft}', [DraftController::class, 'update'])->name('drafts.update');
    Route::post('drafts/{draft}/status', [DraftController::class, 'status'])->name('drafts.status');
    Route::post('drafts/{draft}/versions/{version}/restore', [DraftController::class, 'restore'])->whereNumber('version')->name('drafts.restore');
    Route::get('drafts/{draft}/export/{format}', [DraftController::class, 'export'])->name('drafts.export');
    Route::post('drafts/{draft}/attach', [DraftController::class, 'attach'])->name('drafts.attach');
});

Route::middleware(['auth', 'verified', 'account:lawyer,staff', 'workspace'])->group(function () {
    Route::get('ai', [AiController::class, 'index'])->name('ai.index');
    Route::post('ai/run', [AiController::class, 'run'])->middleware('throttle:20,1')->name('ai.run');
    Route::get('analytics', AnalyticsController::class)->name('analytics.index');
    Route::get('settings/organization', [OrganizationSettingsController::class, 'show'])->name('settings.organization');
    Route::put('settings/organization', [OrganizationSettingsController::class, 'update'])->name('settings.organization.update');
    Route::post('settings/organization/logo', [OrganizationSettingsController::class, 'updateLogo'])->name('settings.organization.logo.update');
    Route::delete('settings/organization/logo', [OrganizationSettingsController::class, 'removeLogo'])->name('settings.organization.logo.destroy');
    Route::put('settings/reminders', [OrganizationSettingsController::class, 'updateReminders'])->name('settings.reminders.update');
    Route::post('settings/plan', [OrganizationSettingsController::class, 'changePlan'])->name('settings.plan');
});

Route::middleware(['auth', 'verified', 'account:lawyer', 'workspace'])->group(function () {
    Route::get('my-articles', [ArticleController::class, 'index'])->name('lawyer.articles.index');
    Route::post('my-articles', [ArticleController::class, 'save'])->name('lawyer.articles.store');
    Route::put('my-articles/{article}', [ArticleController::class, 'save'])->name('lawyer.articles.update');
    Route::post('reviews/{review}/respond', [ArticleController::class, 'respond'])->name('lawyer.reviews.respond');
});
