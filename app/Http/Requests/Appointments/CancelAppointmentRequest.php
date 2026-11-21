<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;

/** A client cancels their appointment. Shared by the web controller and the mobile API so both validate identically. */
class CancelAppointmentRequest extends FormRequest
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
            'reason' => ['required', 'string', 'max:255'],
        ];
    }
}
