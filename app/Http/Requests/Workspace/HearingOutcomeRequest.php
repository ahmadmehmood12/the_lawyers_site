<?php

namespace App\Http\Requests\Workspace;

use App\Enums\Attendance;
use App\Enums\HearingType;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class HearingOutcomeRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('recordOutcome', $this->route('hearing'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'held_on' => ['required', 'date', 'before_or_equal:today'],
            'lawyer_attendance' => ['nullable', Rule::enum(Attendance::class)],
            'client_attendance' => ['nullable', Rule::enum(Attendance::class)],
            'opposing_counsel_attendance' => ['nullable', Rule::enum(Attendance::class)],
            'proceedings' => ['nullable', 'string', 'max:10000'],
            'arguments' => ['nullable', 'string', 'max:10000'],
            'evidence' => ['nullable', 'string', 'max:10000'],
            'documents_submitted' => ['nullable', 'string', 'max:5000'],
            'order_passed' => ['nullable', 'string', 'max:10000'],
            'adjournment_reason' => ['nullable', 'string', 'max:255'],
            'internal_notes' => ['nullable', 'string', 'max:10000'],
            'client_note' => ['nullable', 'string', 'max:2000'],
            'schedule_next' => ['boolean'],
            'next_hearing_date' => ['nullable', 'required_if:schedule_next,true', 'date', 'after:held_on'],
            'next_hearing_time' => ['nullable', 'date_format:H:i'],
            'next_hearing_purpose' => ['nullable', 'string', 'max:255'],
            'next_hearing_type' => ['nullable', Rule::enum(HearingType::class)],
            'order_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
        ];
    }
}
