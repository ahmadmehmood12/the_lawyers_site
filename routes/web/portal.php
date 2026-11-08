<?php

use App\Http\Controllers\Portal\PortalController;
use App\Http\Controllers\Shared\ConversationController;
use Illuminate\Support\Facades\Route;

/* Client portal — clients only; every query is scoped to the user's own client records. */
Route::middleware(['auth', 'verified', 'account:client'])->prefix('portal')->name('portal.')->group(function () {
    Route::get('/', [PortalController::class, 'dashboard'])->name('dashboard');
    Route::get('cases', [PortalController::class, 'listCases'])->name('cases.index');
    Route::get('cases/{case}', [PortalController::class, 'showCase'])->name('cases.show');
    Route::get('documents', [PortalController::class, 'documents'])->name('documents.index');
    Route::post('documents', [PortalController::class, 'upload'])->middleware('throttle:20,1')->name('documents.store');
    Route::get('documents/{document}/download', [PortalController::class, 'download'])->name('documents.download');
    Route::get('invoices', [PortalController::class, 'invoices'])->name('invoices.index');
    Route::get('invoices/{invoice}', [PortalController::class, 'showInvoice'])->name('invoices.show');
    Route::get('invoices/{invoice}/pdf', [PortalController::class, 'invoicePdf'])->name('invoices.pdf');
    Route::get('receipts/{payment}', [PortalController::class, 'receipt'])->name('receipts.show');
    Route::get('appointments', [PortalController::class, 'appointments'])->name('appointments.index');
    Route::post('appointments/{appointment}/cancel', [PortalController::class, 'cancelAppointment'])->name('appointments.cancel');
    Route::get('book/{lawyer:slug}', [PortalController::class, 'book'])->name('book');
    Route::post('book/{lawyer:slug}', [PortalController::class, 'storeBooking'])->middleware('throttle:10,1')->name('book.store');
    Route::post('lawyers/{lawyer:slug}/reviews', [PortalController::class, 'review'])->middleware('throttle:5,1')->name('reviews.store');
    Route::get('favourites', [PortalController::class, 'favourites'])->name('favourites');

    Route::get('messages', [ConversationController::class, 'index'])->name('messages.index');
    Route::post('messages', [ConversationController::class, 'store'])->name('messages.store');
    Route::get('messages/{conversation}', [ConversationController::class, 'show'])->name('messages.show');
    Route::post('messages/{conversation}', [ConversationController::class, 'send'])->middleware('throttle:60,1')->name('messages.send');
    Route::post('messages/{conversation}/archive', [ConversationController::class, 'archive'])->name('messages.archive');
    Route::get('messages/{conversation}/attachments/{message}', [ConversationController::class, 'attachment'])->name('messages.attachment');
});
