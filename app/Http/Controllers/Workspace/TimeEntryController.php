<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\LegalCase;
use App\Models\TimeEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Case time tracker (docs/Modules/Cases.md#time). Anyone who can open the case can log time on it.
 * Starting a timer stops the user's other running timer, so only one runs at a time.
 */
class TimeEntryController extends Controller
{
    public function start(Request $request, LegalCase $case): RedirectResponse
    {
        $this->authorize('view', $case);
        $data = $request->validate(['description' => ['nullable', 'string', 'max:255']]);
        $user = $request->user();

        self::stopRunning($user->id);

        TimeEntry::query()->create([
            'organization_id' => $case->organization_id, 'legal_case_id' => $case->id, 'user_id' => $user->id,
            'description' => $data['description'] ?? null, 'started_at' => now(),
        ]);

        return back()->with('success', __('Timer started.'));
    }

    public function stop(Request $request, TimeEntry $entry): RedirectResponse
    {
        abort_unless($entry->user_id === $request->user()->id, 404);
        $data = $request->validate(['description' => ['nullable', 'string', 'max:255']]);

        if ($entry->ended_at === null) {
            $entry->forceFill([
                'ended_at' => now(),
                'seconds' => (int) $entry->started_at->diffInSeconds(now()),
                'description' => array_key_exists('description', $data) && filled($data['description']) ? $data['description'] : $entry->description,
            ])->save();
        }

        return back()->with('success', __('Logged :time on this case.', ['time' => self::human($entry->seconds)]));
    }

    /** Add time worked earlier (for example in court, without the app open). */
    public function store(Request $request, LegalCase $case): RedirectResponse
    {
        $this->authorize('view', $case);
        $data = $request->validate([
            'date' => ['required', 'date', 'before_or_equal:today'],
            'hours' => ['required', 'integer', 'min:0', 'max:23'],
            'minutes' => ['required', 'integer', 'min:0', 'max:59'],
            'description' => ['nullable', 'string', 'max:255'],
            'billable' => ['boolean'],
        ]);
        $seconds = ($data['hours'] * 3600) + ($data['minutes'] * 60);

        if ($seconds < 60) {
            return back()->withErrors(['minutes' => __('Enter at least one minute.')]);
        }

        $start = Carbon::parse($data['date'])->setTime(9, 0);
        TimeEntry::query()->create([
            'organization_id' => $case->organization_id, 'legal_case_id' => $case->id, 'user_id' => $request->user()->id,
            'description' => $data['description'] ?? null, 'started_at' => $start, 'ended_at' => $start->copy()->addSeconds($seconds),
            'seconds' => $seconds, 'billable' => $request->boolean('billable', true),
        ]);

        return back()->with('success', __('Time added.'));
    }

    public function update(Request $request, TimeEntry $entry): RedirectResponse
    {
        $this->authorizeEntry($request, $entry);
        $entry->update($request->validate(['description' => ['nullable', 'string', 'max:255'], 'billable' => ['boolean']]));

        return back();
    }

    public function destroy(Request $request, TimeEntry $entry): RedirectResponse
    {
        $this->authorizeEntry($request, $entry);
        $entry->delete();

        return back()->with('success', __('Time entry removed.'));
    }

    /** Own entries, or anyone allowed to update the case. */
    private function authorizeEntry(Request $request, TimeEntry $entry): void
    {
        if ($entry->user_id !== $request->user()->id) {
            $this->authorize('update', $entry->legalCase);
        }
    }

    public static function stopRunning(int $userId): void
    {
        TimeEntry::query()->where('user_id', $userId)->whereNull('ended_at')->get()
            ->each(fn (TimeEntry $e) => $e->forceFill(['ended_at' => now(), 'seconds' => (int) $e->started_at->diffInSeconds(now())])->save());
    }

    public static function human(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);

        return $h > 0 ? sprintf('%dh %02dm', $h, $m) : sprintf('%dm', max(1, $m));
    }
}
