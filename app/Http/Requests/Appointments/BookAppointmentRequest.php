<?php

namespace App\Http\Requests\Appointments;

use App\Enums\AppointmentMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** A client books a consultation with a lawyer. Shared by the web controller and the mobile API so both validate identically. */
class BookAppointmentRequest extends FormRequest
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
            'mode' => ['required', Rule::enum(AppointmentMode::class)],
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
