<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Judge;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Admin, Reference data, Judges (docs/Modules/Courts.md):
 *  - Transfer: post one judge to a new court, district and tehsil.
 *  - Swap: two judges exchange postings (court, district, tehsil, courtroom), e.g. on a transfer order.
 * Every move is kept in judge_transfers with the effective date and note. Cases keep their judge.
 */
class JudgeTransferController extends Controller
{
    public function transfer(Request $request, Judge $judge): RedirectResponse
    {
        $data = $request->validate([
            'court_id' => ['required', 'integer', Rule::exists('courts', 'id')],
            'district_id' => ['required', 'integer', Rule::exists('districts', 'id')],
            'tehsil_id' => ['nullable', 'integer', Rule::exists('tehsils', 'id')->where('district_id', $request->input('district_id'))],
            'courtroom' => ['nullable', 'string', 'max:50'],
            'designation' => ['nullable', 'string', 'max:255'],
            'effective_on' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
        ], ['tehsil_id.exists' => __('This tehsil is not in the chosen district.')]);

        $to = ['court_id' => (int) $data['court_id'], 'district_id' => (int) $data['district_id'], 'tehsil_id' => $data['tehsil_id'] ?? null, 'courtroom' => $data['courtroom'] ?? null];

        if ($to === $judge->posting() && ($data['designation'] ?? $judge->designation) === $judge->designation) {
            return back()->with('error', __('The new posting is the same as the current one.'));
        }

        DB::transaction(function () use ($request, $judge, $data, $to): void {
            $this->record($judge, $to, 'transfer', null, $data, $request->user()->id);
            $judge->forceFill([...$to, 'posted_on' => $data['effective_on'], ...(array_key_exists('designation', $data) && filled($data['designation']) ? ['designation' => $data['designation']] : [])])->save();
        });

        ReferenceOptions::flush();
        activity('admin')->causedBy($request->user())->performedOn($judge)->withProperties($to)->log('judge_transferred');

        return back()->with('success', __(':name transferred.', ['name' => $judge->name]));
    }

    public function swap(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'first_id' => ['required', 'integer', Rule::exists('judges', 'id')],
            'second_id' => ['required', 'integer', 'different:first_id', Rule::exists('judges', 'id')],
            'effective_on' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
        ], ['second_id.different' => __('Choose two different judges.')]);

        [$first, $second] = [Judge::query()->findOrFail($data['first_id']), Judge::query()->findOrFail($data['second_id'])];

        DB::transaction(function () use ($request, $first, $second, $data): void {
            [$firstPosting, $secondPosting] = [$first->posting(), $second->posting()];

            $this->record($first, $secondPosting, 'swap', $second->id, $data, $request->user()->id);
            $this->record($second, $firstPosting, 'swap', $first->id, $data, $request->user()->id);

            $first->forceFill([...$secondPosting, 'posted_on' => $data['effective_on']])->save();
            $second->forceFill([...$firstPosting, 'posted_on' => $data['effective_on']])->save();
        });

        ReferenceOptions::flush();
        activity('admin')->causedBy($request->user())->withProperties(['first' => $first->id, 'second' => $second->id])->log('judges_swapped');

        return back()->with('success', __(':first and :second swapped postings.', ['first' => $first->name, 'second' => $second->name]));
    }

    /**
     * @param  array{court_id: int|null, district_id: int|null, tehsil_id: int|null, courtroom: string|null}  $to
     * @param  array<string, mixed>  $data
     */
    private function record(Judge $judge, array $to, string $kind, ?int $swappedWith, array $data, int $userId): void
    {
        $from = $judge->posting();

        $judge->transfers()->create([
            'kind' => $kind, 'swapped_with_id' => $swappedWith,
            'from_court_id' => $from['court_id'], 'from_district_id' => $from['district_id'], 'from_tehsil_id' => $from['tehsil_id'], 'from_courtroom' => $from['courtroom'],
            'to_court_id' => $to['court_id'], 'to_district_id' => $to['district_id'], 'to_tehsil_id' => $to['tehsil_id'], 'to_courtroom' => $to['courtroom'],
            'effective_on' => $data['effective_on'], 'note' => $data['note'] ?? null, 'created_by' => $userId,
        ]);
    }
}
