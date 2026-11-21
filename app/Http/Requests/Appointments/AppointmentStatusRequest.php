<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** A lawyer accepts, declines, cancels, completes or marks an appointment missed. Shared by the web controller and the mobile API so both validate identically. */
class AppointmentStatusRequest extends FormRequest
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
            'status' => ['required', Rule::in(['confirmed', 'declined', 'cancelled', 'completed', 'no_show'])],
            'reason' => ['nullable', 'required_if:status,declined,cancelled', 'string', 'max:255'],
            'meeting_link' => ['nullable', 'url:https', 'max:255'],
        ];
    }
}
