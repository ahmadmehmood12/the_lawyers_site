@php($locale = app()->getLocale())
@php($siteTheme = \App\Models\Setting::get('site_theme', 'navy-gold'))
@php($siteName = \App\Models\Setting::get('site_name') ?: config('app.name'))
@php($favicon = \App\Models\Setting::get('site_favicon_path'))
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', $locale) }}" dir="{{ $locale === 'ur' ? 'rtl' : 'ltr' }}"
      class="{{ (auth()->user()?->theme ?? 'system') === 'dark' ? 'dark' : '' }}"
      data-theme-preference="{{ auth()->user()?->theme ?? 'system' }}"
      data-site-theme="{{ $siteTheme === 'white-green' ? 'white-green' : 'navy-gold' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" href="{{ \App\Support\PublicFile::url($favicon) ?? asset('favicon.ico') }}">
        <meta name="application-name" content="{{ $siteName }}">
        <meta name="theme-color" content="{{ $siteTheme === 'white-green' ? '#0f2c1e' : '#0f1e36' }}">
        <script>
            (function () {
                var pref = document.documentElement.dataset.themePreference || localStorage.getItem('theme') || 'system';
                if (pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                }
            })();
        </script>
        @routes
        @fonts
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        <x-inertia::head>
            <title>{{ $siteName }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
