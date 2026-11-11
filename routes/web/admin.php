<?php

use App\Http\Controllers\Admin\AppointmentOverviewController;
use App\Http\Controllers\Admin\ContentController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EmailTemplateController;
use App\Http\Controllers\Admin\OrganizationController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\PlatformController;
use App\Http\Controllers\Admin\ReferenceDataController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\ShowcaseController;
use App\Http\Controllers\Admin\SupportInboxController;
use App\Http\Controllers\Admin\TypographyController;
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
        Route::post('pages', [ContentController::class, 'storePage'])->name('pages.store');
        Route::put('pages/{page}', [ContentController::class, 'savePage'])->name('pages.update');
        Route::delete('pages/{page}', [ContentController::class, 'destroyPage'])->name('pages.destroy');
    });

    // Homepage showcase: testimonials (text and video), team and designations (docs/Modules/Showcase.md).
    Route::middleware('permission:content.moderate')->group(function () {
        Route::get('testimonials', [ShowcaseController::class, 'testimonials'])->name('testimonials.index');
        Route::get('video-reviews', [ShowcaseController::class, 'videoReviews'])->name('video-reviews.index');
        Route::post('testimonials', [ShowcaseController::class, 'storeTestimonial'])->name('testimonials.store');
        Route::post('testimonials/{testimonial}', [ShowcaseController::class, 'updateTestimonial'])->name('testimonials.update');
        Route::put('testimonials/{testimonial}/toggle', [ShowcaseController::class, 'toggleTestimonial'])->name('testimonials.toggle');
        Route::delete('testimonials/{testimonial}', [ShowcaseController::class, 'destroyTestimonial'])->name('testimonials.destroy');
        Route::get('team', [ShowcaseController::class, 'team'])->name('team.index');
        Route::post('team', [ShowcaseController::class, 'storeMember'])->name('team.store');
        Route::post('team/{member}', [ShowcaseController::class, 'updateMember'])->name('team.update');
        Route::delete('team/{member}', [ShowcaseController::class, 'destroyMember'])->name('team.destroy');
        Route::post('team-designations', [ShowcaseController::class, 'storeDesignation'])->name('team-designations.store');
        Route::put('team-designations/{designation}', [ShowcaseController::class, 'updateDesignation'])->name('team-designations.update');
        Route::delete('team-designations/{designation}', [ShowcaseController::class, 'destroyDesignation'])->name('team-designations.destroy');
    });

    Route::middleware('permission:support.manage')->group(function () {
        Route::get('complaints', [ContentController::class, 'complaints'])->name('complaints.index');
        Route::put('complaints/{complaint}', [ContentController::class, 'updateComplaint'])->name('complaints.update');
        Route::get('feedback', [SupportInboxController::class, 'index'])->name('feedback.index');
        Route::put('feedback/{message}', [SupportInboxController::class, 'update'])->name('feedback.update');
    });

    Route::middleware('permission:roles.manage')->group(function () {
        Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
        Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
        Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
    });

    Route::middleware('permission:billing.manage')->group(function () {
        Route::get('plans', [PlatformController::class, 'plans'])->name('plans.index');
        Route::post('plans', [PlatformController::class, 'savePlan'])->name('plans.store');
        Route::put('plans/{plan}', [PlatformController::class, 'savePlan'])->name('plans.update');

        Route::get('payment-methods', [PaymentController::class, 'methods'])->name('payment-methods.index');
        Route::post('payment-methods', [PaymentController::class, 'storeMethod'])->name('payment-methods.store');
        Route::put('payment-methods/{paymentMethod}', [PaymentController::class, 'updateMethod'])->name('payment-methods.update');
        Route::get('plan-payments', [PaymentController::class, 'index'])->name('payments.index');
        Route::post('plan-payments/{planPayment}/approve', [PaymentController::class, 'approve'])->name('payments.approve');
        Route::post('plan-payments/{planPayment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
        Route::get('plan-payments/{planPayment}/screenshot', [PaymentController::class, 'screenshot'])->name('payments.screenshot');
    });

    Route::middleware('permission:settings.manage')->group(function () {
        Route::get('notifications', [PlatformController::class, 'notifications'])->name('notifications.index');
        Route::post('whatsapp-templates', [PlatformController::class, 'saveWhatsAppTemplate'])->name('whatsapp-templates.store');
        Route::put('whatsapp-templates/{template}', [PlatformController::class, 'saveWhatsAppTemplate'])->name('whatsapp-templates.update');
        Route::get('email-templates', [EmailTemplateController::class, 'index'])->name('email-templates.index');
        Route::put('email-templates/{key}', [EmailTemplateController::class, 'save'])->name('email-templates.save');
        Route::delete('email-templates/{key}/{language}', [EmailTemplateController::class, 'reset'])->whereIn('language', ['en', 'ur'])->name('email-templates.reset');
        Route::get('email-templates/{key}/preview', [EmailTemplateController::class, 'preview'])->name('email-templates.preview');
        Route::get('settings', [PlatformController::class, 'settings'])->name('settings.edit');
        Route::put('settings', [PlatformController::class, 'saveSettings'])->name('settings.update');
        Route::put('settings/whatsapp', [PlatformController::class, 'saveWhatsAppSettings'])->name('whatsapp-settings.update');
        Route::put('settings/mail', [PlatformController::class, 'saveMailSettings'])->name('mail-settings.update');
        Route::post('settings/mail/test', [PlatformController::class, 'sendTestMail'])->middleware('throttle:6,1')->name('mail-settings.test');
        Route::post('settings/branding', [PlatformController::class, 'saveBrandingSettings'])->name('branding-settings.update');
        Route::post('settings/auth-media', [PlatformController::class, 'saveAuthMediaSettings'])->name('auth-media-settings.update');
        Route::put('settings/fonts', [TypographyController::class, 'update'])->name('font-settings.update');
        Route::post('settings/fonts/library', [TypographyController::class, 'store'])->middleware('throttle:20,1')->name('fonts.store');
        Route::delete('settings/fonts/library/{font}', [TypographyController::class, 'destroy'])->name('fonts.destroy');
    });

    Route::get('appointments', [AppointmentOverviewController::class, 'index'])->middleware('permission:organizations.view')->name('appointments.index');
    Route::get('audit', [PlatformController::class, 'audit'])->middleware('permission:audit.view')->name('audit.index');
});
