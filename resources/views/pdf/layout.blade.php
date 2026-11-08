@php($rtl = app()->getLocale() === 'ur')
<html dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ app()->getLocale() }}">
<head>
<meta charset="utf-8">
<style>
    body { font-family: dejavusans; font-size: 10pt; color: #0f1e36; }
    h1 { font-size: 16pt; margin: 0 0 2mm; color: #0f1e36; }
    h2 { font-size: 12pt; margin: 6mm 0 2mm; color: #0f1e36; }
    .muted { color: #5b6b85; }
    .small { font-size: 8.5pt; }
    .brand { border-bottom: 1.5pt solid #b8892b; padding-bottom: 3mm; margin-bottom: 5mm; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0f1e36; color: #fff; font-weight: bold; font-size: 8.5pt; text-align: {{ $rtl ? 'right' : 'left' }}; padding: 2mm; }
    td { border-bottom: 0.5pt solid #c3d0e3; padding: 2mm; vertical-align: top; font-size: 9pt; }
    .right { text-align: {{ $rtl ? 'left' : 'right' }}; }
    .total td { font-weight: bold; border-top: 1pt solid #0f1e36; border-bottom: none; }
    .badge { padding: 0.5mm 2mm; border: 0.5pt solid #b8892b; color: #774f1f; font-size: 8pt; }
    .box { border: 0.5pt solid #c3d0e3; padding: 3mm; }
    .stamp { border: 1.5pt solid #1b754b; color: #1b754b; padding: 2mm 4mm; font-weight: bold; font-size: 12pt; }
</style>
</head>
<body>
@yield('content')
</body>
</html>
