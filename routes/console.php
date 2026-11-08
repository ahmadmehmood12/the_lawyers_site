<?php

use Illuminate\Support\Facades\Schedule;

/*
| Scheduler (docs/Deployment/Deployment-Guide.md): run `php artisan schedule:work`
| or a cron for `schedule:run`, plus a queue worker for notifications.
*/
Schedule::command('reminders:dispatch')->dailyAt('07:00')->timezone('Asia/Karachi')->withoutOverlapping()->onOneServer();
Schedule::command('subscriptions:expire')->hourly()->withoutOverlapping();
Schedule::command('queue:prune-failed --hours=720')->daily();
Schedule::command('activitylog:clean')->monthly();
