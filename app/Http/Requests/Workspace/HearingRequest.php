<?php

namespace App\Http\Requests\Workspace;

use App\Enums\HearingType;
use App\Models\Hearing;
use App\Models\LegalCase;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class HearingRequest extends FormRequest
{
    public function authorize(): Response|bool
    {
        $hearing = $this->route('hearing');
        $case = $this->route('case');

        return match (true) {
            $hearing instanceof Hearing => Gate::inspect('update', $hearing),
            $case instanceof LegalCase => Gate::inspect('manageWithin', [$case, 'hearings.manage']),
            default => Response::deny(),
        };
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'hearing_date' => ['required', 'date'],
            'hearing_time' => ['nullable', 'date_format:H:i'],
            'hearing_type' => ['required', Rule::enum(HearingType::class)],
            'purpose' => ['nullable', 'string', 'max:255'],
            'court_id' => ['nullable', 'integer', 'exists:courts,id'],
            'judge_id' => ['nullable', 'integer', Rule::exists('judges', 'id')->where('court_id', $this->input('court_id'))],
            'judge_name' => ['nullable', 'string', 'max:160'],
            'courtroom' => ['nullable', 'string', 'max:50'],
            'assigned_lawyer_id' => ['nullable', 'integer', 'exists:users,id'],
            'preparation_notes' => ['nullable', 'string', 'max:5000'],
            'visible_to_client' => ['boolean'],
        ];
    }
}
