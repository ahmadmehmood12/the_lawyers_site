<?php

use App\Http\Controllers\Admin\ContentController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\OrganizationController;
use App\Http\Controllers\Admin\PlatformController;
use App\Http\Controllers\Admin\ReferenceDataController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VerificationController;
use Illuminate\Support\Facades\Route;

/*
| Admin panel — platform staff only. Each group requires a specific Spatie
| permission (super-admin passes via Gate::before). View ≠ manage.
*/
Route::middleware(['auth', 'verified', 'account:platform'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');

    Route::middleware('permission:users.view')->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::put('users/{user}/status', [UserController::class, 'updateStatus'])->name('users.status');
        Route::put('users/{user}/roles', [UserController::class, 'updateRoles'])->name('users.roles');
        Route::post('users/staff', [UserController::class, 'storeStaff'])->name('users.staff.store');
    });

    Route::middleware('permission:verification.review')->group(function () {
        Route::get('verifications', [VerificationController::class, 'index'])->name('verifications.index');
        Route::get('verifications/{verification}', [VerificationController::class, 'show'])->name('verifications.show');
        Route::post('verifications/{verification}/transition', [VerificationController::class, 'transition'])->name('verifications.transition');
        Route::get('verification-documents/{document}', [VerificationController::class, 'document'])->name('verifications.document');
    });

    Route::middleware('permission:organizations.view')->group(function () {
        Route::get('organizations', [OrganizationController::class, 'index'])->name('organizations.index');
        Route::put('organizations/{organization}/plan', [OrganizationController::class, 'updatePlan'])->name('organizations.plan');
        Route::put('organizations/{organization}/status', [OrganizationController::class, 'updateStatus'])->name('organizations.status');
    });

    Route::middleware('permission:reference.manage')->group(function () {
        Route::get('courts', [ReferenceDataController::class, 'index'])->defaults('resource', 'courts')->name('courts.index');
        Route::get('judges', [ReferenceDataController::class, 'index'])->defaults('resource', 'judges')->name('judges.index');
        Route::get('specializations', [ReferenceDataController::class, 'index'])->defaults('resource', 'specializations')->name('specializations.index');
        Route::get('geography', [ReferenceDataController::class, 'index'])->defaults('resource', 'provinces')->name('geography.index');
        Route::get('reference/{resource}', [ReferenceDataController::class, 'index'])->name('reference.index');
        Route::post('reference/{resource}', [ReferenceDataController::class, 'store'])->name('reference.store');
        Route::put('reference/{resource}/{id}', [ReferenceDataController::class, 'update'])->whereNumber('id')->name('reference.update');
        Route::delete('reference/{resource}/{id}', [ReferenceDataController::class, 'destroy'])->whereNumber('id')->name('reference.destroy');
    });

    Route::middleware('permission:templates.manage')->group(function () {
        Route::get('templates', [ContentController::class, 'templates'])->name('templates.index');
        Route::post('templates', [ContentController::class, 'saveTemplate'])->name('templates.store');
        Route::put('templates/{template}', [ContentController::class, 'saveTemplate'])->name('templates.update');
    });

    Route::middleware('permission:content.moderate')->group(function () {
        Route::get('moderation', [ContentController::class, 'moderation'])->name('articles.index');
        Route::get('moderation/reviews', [ContentController::class, 'moderation'])->defaults('tab', 'reviews')->name('reviews.index');
        Route::put('articles/{article}', [ContentController::class, 'moderateArticle'])->name('articles.moderate');
        Route::put('reviews/{review}', [ContentController::class, 'moderateReview'])->name('reviews.moderate');
        Route::put('comments/{comment}', [ContentController::class, 'moderateComment'])->name('comments.moderate');
        Route::get('pages', [ContentController::class, 'pages'])->name('pages.index');
        Route::put('pages/{page}', [ContentController::class, 'savePage'])->name('pages.update');
    });

    Route::middleware('permission:support.manage')->group(function () {
        Route::get('complaints', [ContentController::class, 'complaints'])->name('complaints.index');
        Route::put('complaints/{complaint}', [ContentController::class, 'updateComplaint'])->name('complaints.update');
        Route::post('contact-messages/{message}/toggle', [ContentController::class, 'handleContact'])->name('contact.toggle');
    });

    Route::middleware('permission:billing.manage')->group(function () {
        Route::get('plans', [PlatformController::class, 'plans'])->name('plans.index');
        Route::post('plans', [PlatformController::class, 'savePlan'])->name('plans.store');
        Route::put('plans/{plan}', [PlatformController::class, 'savePlan'])->name('plans.update');
    });

    Route::middleware('permission:settings.manage')->group(function () {
        Route::get('notifications', [PlatformController::class, 'notifications'])->name('notifications.index');
        Route::post('whatsapp-templates', [PlatformController::class, 'saveWhatsAppTemplate'])->name('whatsapp-templates.store');
        Route::put('whatsapp-templates/{template}', [PlatformController::class, 'saveWhatsAppTemplate'])->name('whatsapp-templates.update');
        Route::get('settings', [PlatformController::class, 'settings'])->name('settings.edit');
        Route::put('settings', [PlatformController::class, 'saveSettings'])->name('settings.update');
    });

    Route::get('audit', [PlatformController::class, 'audit'])->middleware('permission:audit.view')->name('audit.index');
});
