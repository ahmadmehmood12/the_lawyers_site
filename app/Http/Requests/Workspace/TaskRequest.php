<?php

namespace App\Http\Requests\Workspace;

use App\Enums\Priority;
use App\Enums\TaskStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TaskRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'legal_case_id' => ['nullable', 'integer'],
            'hearing_id' => ['nullable', 'integer'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'priority' => ['required', Rule::enum(Priority::class)],
            'status' => ['sometimes', Rule::enum(TaskStatus::class)],
        ];
    }
}
