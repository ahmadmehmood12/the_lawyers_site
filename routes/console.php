<?php

use App\Models\PageVisit;
use Illuminate\Support\Facades\Schedule;

/*
| Scheduler (docs/Deployment/Deployment-Guide.md): run `php artisan schedule:work`
| or a cron for `schedule:run`, plus a queue worker for notifications.
*/
Schedule::command('reminders:dispatch')->dailyAt('07:00')->timezone('Asia/Karachi')->withoutOverlapping()->onOneServer();
Schedule::command('subscriptions:expire')->hourly()->withoutOverlapping();
Schedule::command('subscriptions:remind')->dailyAt('10:00')->timezone('Asia/Karachi')->withoutOverlapping();
Schedule::command('queue:prune-failed --hours=720')->daily();
Schedule::command('activitylog:clean')->monthly();
Schedule::command('model:prune', ['--model' => [PageVisit::class]])->dailyAt('03:30');
Schedule::command('disposable:update')->weekly();

// Compact the judgment full-text search index (judgment_pages.body) once a week at a quiet hour.
// MySQL keeps every index current on each insert; this only merges the FULLTEXT index's pieces and
// clears entries marked deleted by re-indexing. See docs/Database/Judgment-Search-Indexes.md.
Schedule::command('judgments:optimize-search-index')->weeklyOn(0, '04:00')->timezone('Asia/Karachi')->withoutOverlapping()->onOneServer();
