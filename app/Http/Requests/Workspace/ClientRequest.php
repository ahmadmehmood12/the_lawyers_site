<?php

namespace App\Http\Requests\Workspace;

use App\Models\Client;
use App\Rules\Cnic;
use App\Rules\PakistaniPhone;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ClientRequest extends FormRequest
{
    public function authorize(): Response
    {
        $client = $this->route('client');

        return $client instanceof Client ? Gate::inspect('update', $client) : Gate::inspect('create', Client::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['individual', 'business'])],
            'name' => ['required', 'string', 'max:160'],
            'company_name' => ['nullable', 'required_if:type,business', 'string', 'max:160'],
            'cnic' => ['nullable', new Cnic],
            'ntn' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', new PakistaniPhone],
            'whatsapp' => ['nullable', new PakistaniPhone],
            'address' => ['nullable', 'string', 'max:255'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'preferred_locale' => ['required', Rule::in(['en', 'ur'])],
            'notes' => ['nullable', 'string', 'max:5000'],
            'whatsapp_consent' => ['boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function clientData(): array
    {
        $data = $this->safe()->except(['whatsapp_consent']);
        $data['phone'] = PakistaniPhone::normalize($data['phone'] ?? null);
        $data['whatsapp'] = PakistaniPhone::normalize($data['whatsapp'] ?? null);
        $data['cnic'] = Cnic::normalize($data['cnic'] ?? null);

        return $data;
    }
}
