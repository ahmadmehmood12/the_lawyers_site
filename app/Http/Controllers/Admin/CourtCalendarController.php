<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CourtHoliday;
use App\Models\Province;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Admin, Court calendar: holidays and vacations for the year (shown on dashboards, portal, home, calendars). */
class CourtCalendarController extends Controller
{
    public function index(Request $request): Response
    {
        $year = (int) ($request->integer('year') ?: now()->year);

        return Inertia::render('Admin/CourtCalendar', [
            'year' => $year,
            'holidays' => CourtHoliday::query()->with('province:id,name')
                ->where(fn ($q) => $q->whereYear('starts_on', $year)->orWhereYear('ends_on', $year))
                ->orderBy('starts_on')->get()
                ->map(fn (CourtHoliday $h) => [...$h->only(['id', 'title', 'title_ur', 'kind', 'province_id', 'notes', 'tentative', 'is_active']), 'starts_on' => $h->starts_on->toDateString(), 'ends_on' => $h->ends_on->toDateString(), 'province' => $h->province?->name]),
            'provinces' => Province::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name'])->map(fn ($p) => ['value' => $p->id, 'label' => $p->name]),
            'years' => range(now()->year - 1, now()->year + 2),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        CourtHoliday::query()->create($this->validated($request));
        CourtHoliday::flush();

        return back()->with('success', __('Added to the court calendar.'));
    }

    public function update(Request $request, CourtHoliday $holiday): RedirectResponse
    {
        $holiday->update($this->validated($request));
        CourtHoliday::flush();

        return back()->with('success', __('Court calendar updated.'));
    }

    public function destroy(CourtHoliday $holiday): RedirectResponse
    {
        $holiday->delete();
        CourtHoliday::flush();

        return back()->with('success', __('Removed from the court calendar.'));
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'title_ur' => ['nullable', 'string', 'max:160'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'kind' => ['required', Rule::in(CourtHoliday::KINDS)],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'notes' => ['nullable', 'string', 'max:500'],
            'tentative' => ['boolean'],
            'is_active' => ['boolean'],
        ]);
        $data['ends_on'] = $data['ends_on'] ?? $data['starts_on'];

        return $data;
    }
}
