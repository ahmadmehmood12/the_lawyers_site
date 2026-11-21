<?php

namespace App\Http\Requests\Appointments;

use App\Enums\AppointmentMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** A lawyer adds an appointment to the diary. Shared by the web controller and the mobile API so both validate identically. */
class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['nullable', 'integer'],
            'contact_name' => ['required_without:client_id', 'nullable', 'string', 'max:160'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'lawyer_id' => ['nullable', 'integer'],
            'starts_at' => ['required', 'date', 'after:now'],
            'duration' => ['required', 'integer', 'between:15,240'],
            'mode' => ['required', Rule::enum(AppointmentMode::class)],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'meeting_link' => ['nullable', 'url:https', 'max:255'],
            'lawyer_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
