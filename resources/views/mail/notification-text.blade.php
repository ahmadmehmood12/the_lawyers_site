{{ $heading }}

@if ($greeting){{ $greeting }}

@endif
@foreach ((array) $intro as $line){{ $line }}
@endforeach
@if (! empty($code))

{{ $code }}

@endif

@foreach ($details as $label => $value)@if (filled($value)){{ $label }}: {{ $value }}
@endif
@endforeach
@if ($action_url)

{{ $action_label }}: {{ $action_url }}
@endif
@if ($notice)

{{ $notice }}
@endif

@foreach ((array) $outro as $line){{ $line }}
@endforeach

{{ __('Regards,') }}
{{ $site }}
