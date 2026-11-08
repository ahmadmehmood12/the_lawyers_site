<?php

namespace App\Http\Requests\Workspace;

use App\Enums\CaseStatus;
use App\Enums\CaseType;
use App\Enums\PartyRole;
use App\Enums\Priority;
use App\Models\LegalCase;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Create/update a case. Organization ownership of client_ids and lawyer_ids is
 * enforced in CaseService (they must belong to the current organization).
 */
class CaseRequest extends FormRequest
{
    public function authorize(): Response
    {
        $case = $this->route('case');

        return $case instanceof LegalCase ? Gate::inspect('update', $case) : Gate::inspect('create', LegalCase::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $creating = $this->isMethod('post');

        return [
            'title' => ['required', 'string', 'max:255'],
            'case_number' => ['nullable', 'string', 'max:100'],
            'case_type' => ['required', Rule::enum(CaseType::class)],
            'specialization_id' => ['nullable', 'integer', 'exists:specializations,id'],
            'description' => ['nullable', 'string', 'max:10000'],
            'filing_date' => ['nullable', 'date', 'before_or_equal:today'],
            'filing_year' => ['nullable', 'integer', 'between:1947,'.(now()->year + 1)],
            'court_id' => ['nullable', 'integer', 'exists:courts,id'],
            'jurisdiction' => ['nullable', Rule::in(['original', 'appellate', 'revisional', 'writ', 'execution'])],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'district_id' => ['nullable', 'integer', 'exists:districts,id'],
            'judge_id' => ['nullable', 'integer', Rule::exists('judges', 'id')->where('court_id', $this->input('court_id'))],
            'judge_name' => ['nullable', 'string', 'max:160'],
            'courtroom' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::enum(CaseStatus::class)],
            'stage' => ['nullable', 'string', 'max:160'],
            'priority' => ['required', Rule::enum(Priority::class)],
            'professional_fee' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'fee_type' => ['nullable', Rule::in(['fixed', 'installments', 'per_hearing', 'retainer'])],
            'fir_number' => ['nullable', 'required_with:police_station', 'string', 'max:60'],
            'police_station' => ['nullable', 'string', 'max:160'],
            'fir_date' => ['nullable', 'date', 'before_or_equal:today'],
            'legal_sections' => ['nullable', 'string', 'max:255'],
            'bail_status' => ['nullable', Rule::in(['not_applicable', 'not_applied', 'applied', 'pre_arrest_granted', 'post_arrest_granted', 'refused', 'cancelled'])],
            'investigation_notes' => ['nullable', 'string', 'max:10000'],
            'strategy_notes' => ['nullable', 'string', 'max:10000'],
            'client_summary' => ['nullable', 'string', 'max:5000'],
            'share_with_client' => ['boolean'],
            'client_ids' => [$creating ? 'required' : 'sometimes', 'array', 'min:1'],
            'client_ids.*' => ['integer', 'distinct'],
            'lawyer_ids' => ['sometimes', 'array'],
            'lawyer_ids.*' => ['integer', 'distinct'],
            'lead_lawyer_id' => ['sometimes', 'nullable', 'integer'],
            'parties' => ['sometimes', 'array', 'max:50'],
            'parties.*.role' => ['required', Rule::enum(PartyRole::class)],
            'parties.*.name' => ['required', 'string', 'max:160'],
            'parties.*.father_name' => ['nullable', 'string', 'max:160'],
            'parties.*.address' => ['nullable', 'string', 'max:255'],
            'parties.*.counsel_name' => ['nullable', 'string', 'max:160'],
            'parties.*.is_our_side' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['client_ids' => __('clients'), 'parties.*.name' => __('party name'), 'parties.*.role' => __('party role')];
    }
}
