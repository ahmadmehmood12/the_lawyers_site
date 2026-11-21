<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;

/** Either party moves an appointment to a new time. Shared by the web controller and the mobile API so both validate identically. */
class RescheduleAppointmentRequest extends FormRequest
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
            'starts_at' => ['required', 'date', 'after:now'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
