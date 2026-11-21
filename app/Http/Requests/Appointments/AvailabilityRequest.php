<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** A lawyer's weekly working hours. Shared by the web controller and the mobile API so both validate identically. */
class AvailabilityRequest extends FormRequest
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
            'slots' => ['array', 'max:50'],
            'slots.*.weekday' => ['required', 'integer', 'between:0,6'],
            'slots.*.starts_at' => ['required', 'date_format:H:i'],
            'slots.*.ends_at' => ['required', 'date_format:H:i', 'after:slots.*.starts_at'],
            'slots.*.mode' => ['required', Rule::in(['online', 'in_person', 'both'])],
        ];
    }
}
