<?php

use App\Http\Controllers\Public\ArticleController;
use App\Http\Controllers\Public\DocumentationController;
use App\Http\Controllers\Public\FirmDirectoryController;
use App\Http\Controllers\Public\HomeController;
use App\Http\Controllers\Public\LawyerDirectoryController;
use App\Http\Controllers\Public\PageController;
use App\Http\Controllers\Public\SeoController;
use App\Http\Controllers\Public\SpecializationController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('sitemap.xml', [SeoController::class, 'sitemap'])->name('sitemap');
Route::get('robots.txt', [SeoController::class, 'robots'])->name('robots');

Route::get('lawyers', [LawyerDirectoryController::class, 'index'])->name('lawyers.index');
Route::get('lawyers/{lawyer:slug}', [LawyerDirectoryController::class, 'show'])->name('lawyers.show');
Route::post('lawyers/{lawyer:slug}/favourite', [LawyerDirectoryController::class, 'toggleFavourite'])->middleware('auth')->name('lawyers.favourite');

Route::get('law-firms', [FirmDirectoryController::class, 'index'])->name('firms.index');
Route::get('law-firms/{firm:slug}', [FirmDirectoryController::class, 'show'])->name('firms.show');

Route::get('practice-areas', [SpecializationController::class, 'index'])->name('specializations.index');
Route::get('practice-areas/{specialization:slug}', [SpecializationController::class, 'show'])->name('specializations.show');

Route::get('articles', [ArticleController::class, 'index'])->name('articles.index');
Route::get('articles/{article:slug}', [ArticleController::class, 'show'])->name('articles.show');
Route::post('articles/{article:slug}/comments', [ArticleController::class, 'comment'])->middleware(['auth', 'throttle:10,1'])->name('articles.comments.store');

Route::get('documentation', DocumentationController::class)->name('documentation');

Route::get('pricing', [PageController::class, 'pricing'])->name('pricing');
Route::get('contact', [PageController::class, 'contact'])->name('contact');
Route::post('contact', [PageController::class, 'submitContact'])->middleware('throttle:5,1')->name('contact.submit');

foreach (['about' => 'about', 'faqs' => 'faqs', 'terms' => 'terms', 'privacy' => 'privacy', 'legal-resources' => 'resources'] as $slug => $name) {
    Route::get($slug, [PageController::class, 'show'])->defaults('slug', $slug)->name($name);
}
