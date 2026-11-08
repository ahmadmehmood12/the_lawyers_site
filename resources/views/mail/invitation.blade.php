<x-mail::message>
# {{ __('Join :name', ['name' => $organization]) }}

{{ __('You have been invited to join :name as :role.', ['name' => $organization, 'role' => $role]) }}

<x-mail::button :url="$url">
{{ __('View invitation') }}
</x-mail::button>

{{ __('This invitation expires on :date.', ['date' => $expires]) }}

{{ config('app.name') }}
</x-mail::message>
