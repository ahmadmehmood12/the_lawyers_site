@php
    try {
        $siteName = \App\Models\Setting::get('site_name') ?: config('app.name');
        $theme = \App\Models\Setting::get('site_theme', 'navy-gold');
    } catch (\Throwable) {
        $siteName = config('app.name');
        $theme = 'navy-gold';
    }
    $green = $theme === 'white-green';
    $ink = $green ? '#0f2c1e' : '#0f1e36';
    $accent = $green ? '#b8892b' : '#cfa33b';
    $paper = $green ? '#ffffff' : '#faf8f3';
    $night = $green ? '#081a11' : '#091325';
    $nightPanel = $green ? '#0f2c1e' : '#0f1e36';
    $nightRule = $green ? '#193426' : '#1b2b45';
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ app()->getLocale() === 'ur' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $status }}, {{ __($title) }} | {{ $siteName }}</title>
    <style>
        :root { --ink: {{ $ink }}; --accent: {{ $accent }}; --paper: {{ $paper }}; }
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 2rem 1.25rem;
            background: var(--paper); color: var(--ink);
            font-family: "Inter", "Inter Fallback", Arial, sans-serif;
        }
        .wrap { width: 100%; max-width: 34rem; text-align: center; }
        .brand { display: inline-flex; align-items: center; gap: .6rem; color: var(--ink); text-decoration: none; }
        .mark { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: .6rem; background: var(--ink); color: var(--accent); }
        .name { font-family: inherit; font-size: 1.25rem; font-weight: 600; letter-spacing: -.02em; }
        .code { margin: 2.75rem 0 0; font-size: clamp(4.5rem, 18vw, 7rem); line-height: 1; font-weight: 600; letter-spacing: -.05em; }
        h1 { margin: .5rem 0 0; font-family: inherit; font-size: 1.6rem; }
        p { margin: .9rem auto 0; max-width: 26rem; color: color-mix(in srgb, var(--ink) 72%, white); line-height: 1.65; font-size: .95rem; }
        .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .7rem; margin-top: 2rem; }
        .btn { display: inline-flex; align-items: center; gap: .45rem; height: 2.5rem; padding: 0 1rem; border-radius: .55rem; border: 1px solid color-mix(in srgb, var(--ink) 18%, white); background: #fff; color: var(--ink); font-size: .875rem; font-weight: 500; text-decoration: none; cursor: pointer; }
        .btn.primary { background: var(--ink); border-color: var(--ink); color: #fff; }
        .btn:hover { filter: brightness(.97); }
        .help { margin-top: 2.5rem; font-size: .75rem; color: color-mix(in srgb, var(--ink) 55%, white); }
        .help a { color: var(--ink); }
        @media (prefers-color-scheme: dark) {
            body { background: {{ $night }}; color: #f4f7f5; }
            .brand, .btn { color: #f4f7f5; }
            .btn { background: {{ $nightPanel }}; border-color: {{ $nightRule }}; }
            .btn.primary { background: var(--accent); border-color: var(--accent); color: {{ $night }}; }
            p, .help { color: #a8b8b0; }
            .help a { color: #f4f7f5; }
        }
    </style>
</head>
<body>
    <main class="wrap">
        <a class="brand" href="{{ url('/') }}" aria-label="{{ $siteName }}">
            <span class="mark" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                    <path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
                </svg>
            </span>
            <span class="name">{{ $siteName }}</span>
        </a>
        <p class="code">{{ $status }}</p>
        <h1>{{ __($title) }}</h1>
        <p>{{ __($message) }}</p>
        <div class="actions">
            <button type="button" class="btn" onclick="window.history.back()">{{ __('Go back') }}</button>
            <a class="btn primary" href="{{ url('/') }}">{{ __('Home') }}</a>
        </div>
        <p class="help">{{ __('Need help?') }} <a href="{{ url('/contact') }}">{{ __('Contact support') }}</a></p>
    </main>
</body>
</html>
