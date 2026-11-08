<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\DocumentCategory;
use App\Enums\HearingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\HearingOutcomeRequest;
use App\Http\Requests\Workspace\HearingRequest;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Services\Access\OrganizationAccess;
use App\Services\Documents\DocumentVault;
use App\Services\Hearings\HearingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

/**
 * Hearing scheduling and outcomes. History is append-only — see HearingService.
 */
class HearingController extends Controller
{
    public function store(HearingRequest $request, LegalCase $case, HearingService $hearings): RedirectResponse
    {
        $this->authorize('manageWithin', [$case, 'hearings.manage']);

        $data = $request->validated();
        $data['assigned_lawyer_id'] ??= $request->user()->id;
        $hearing = $hearings->schedule($case, $data, $request->user());

        return back()->with('success', $this->withConflictWarning(__('Hearing scheduled.'), $hearings, $hearing));
    }

    public function update(HearingRequest $request, Hearing $hearing, HearingService $hearings): RedirectResponse
    {
        $this->authorize('update', $hearing);

        if ($hearing->status !== HearingStatus::Scheduled) {
            return back()->with('error', __('Only upcoming hearings can be edited. Record a correction through the outcome form.'));
        }

        $data = $request->validated();
        $dateChanged = $data['hearing_date'] !== $hearing->hearing_date->toDateString();

        if ($dateChanged) {
            return back()->with('error', __('Use “Reschedule” to change the hearing date so the original date is kept in history.'));
        }

        $hearing->update(Arr::except($data, ['hearing_date']));
        $hearings->refreshNextHearing($hearing->legalCase);

        return back()->with('success', $this->withConflictWarning(__('Hearing updated.'), $hearings, $hearing));
    }

    public function reschedule(Request $request, Hearing $hearing, HearingService $hearings): RedirectResponse
    {
        $this->authorize('update', $hearing);
        $validated = $request->validate([
            'hearing_date' => ['required', 'date'],
            'hearing_time' => ['nullable', 'date_format:H:i'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $replacement = $hearings->reschedule($hearing, $validated['hearing_date'], $validated['hearing_time'] ?? null, $validated['reason'], $request->user());

        return back()->with('success', $this->withConflictWarning(__('Hearing rescheduled. The original date is kept in history.'), $hearings, $replacement));
    }

    public function cancel(Request $request, Hearing $hearing, HearingService $hearings): RedirectResponse
    {
        $this->authorize('update', $hearing);
        $validated = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:255']]);

        $hearings->cancel($hearing, $validated['reason']);

        return back()->with('success', __('Hearing cancelled.'));
    }

    public function outcome(HearingOutcomeRequest $request, Hearing $hearing, HearingService $hearings, DocumentVault $vault): RedirectResponse
    {
        $this->authorize('recordOutcome', $hearing);

        $result = $hearings->recordOutcome($hearing, $request->validated(), $request->user());

        if ($request->hasFile('order_photo') && $request->user()->can('manageWithin', [$hearing->legalCase, 'documents.upload'])) {
            $vault->store($hearing->organization, $request->user(), $request->file('order_photo'), [
                'title' => __('Court order — :date', ['date' => $hearing->held_on->toDateString()]),
                'category' => DocumentCategory::CourtOrder->value,
                'legal_case_id' => $hearing->legal_case_id,
                'hearing_id' => $hearing->id,
            ]);
        }

        $message = $result['next']
            ? __('Proceedings saved and next hearing scheduled for :date.', ['date' => $result['next']->hearing_date->translatedFormat('d M Y')])
            : __('Proceedings saved.');

        return back()->with('success', $result['next'] ? $this->withConflictWarning($message, $hearings, $result['next']) : $message);
    }

    /** Live conflict check used by the scheduling forms (JSON, same authorization as the diary). */
    public function conflicts(Request $request, HearingService $hearings): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'time' => ['nullable', 'date_format:H:i'],
            'lawyer_id' => ['nullable', 'integer'],
            'ignore' => ['nullable', 'integer'],
        ]);
        $organization = $this->organization();
        $lawyerId = (int) ($validated['lawyer_id'] ?? $request->user()->id);

        abort_unless($lawyerId === $request->user()->id || app(OrganizationAccess::class)->allows($request->user(), $organization, 'diary.view_all'), 403);

        $conflicts = $hearings->conflicts($organization->id, $lawyerId, $validated['date'], $validated['time'] ?? null, $validated['ignore'] ?? null)
            ->where('organization_id', $organization->id)
            ->map(fn (Hearing $h) => ['id' => $h->id, 'time' => $h->hearing_time ? substr($h->hearing_time, 0, 5) : null, 'case' => $h->legalCase->title, 'court' => $h->court?->name])
            ->values();

        return response()->json(['conflicts' => $conflicts]);
    }

    private function withConflictWarning(string $message, HearingService $hearings, Hearing $hearing): string
    {
        $count = $hearings->conflicts($hearing->organization_id, $hearing->assigned_lawyer_id, $hearing->hearing_date->toDateString(), $hearing->hearing_time ? substr($hearing->hearing_time, 0, 5) : null, $hearing->id)->count();

        return $count > 0 ? $message.' '.trans_choice('Note: the assigned lawyer has :count other hearing around this time.|Note: the assigned lawyer has :count other hearings around this time.', $count, ['count' => $count]) : $message;
    }
}
