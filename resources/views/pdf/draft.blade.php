@php($rtl = $draft->language === 'ur')
<html dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $draft->language }}">
<head><meta charset="utf-8">
<style>
    @page { margin: 22mm 20mm; @if ($draft->header_text) header: html_hdr; @endif footer: html_ftr; }
    body { font-family: {{ $rtl ? 'xbriyaz' : 'dejavuserif' }}; font-size: 12pt; line-height: 1.6; color: #000; }
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; margin: 4mm 0; }
    h2 { font-size: 13pt; } h3 { font-size: 12pt; }
    table { width: 100%; border-collapse: collapse; } td, th { border: 0.5pt solid #555; padding: 2mm; vertical-align: top; }
    .text-center { text-align: center; } .text-right { text-align: right; }
    .signature { margin-top: 10mm; text-align: {{ $rtl ? 'left' : 'right' }}; }
    .placeholder { background: #fff3c4; }
</style></head>
<body>
@if ($draft->header_text)<htmlpageheader name="hdr"><div style="text-align:center; font-size:9pt">{{ $draft->header_text }}</div></htmlpageheader>@endif
<htmlpagefooter name="ftr"><div style="text-align:center; font-size:9pt">{{ $draft->footer_text }} {PAGENO}</div></htmlpagefooter>
{!! str_replace('<div class="page-break"></div>', '<pagebreak />', \App\Support\HtmlSanitizer::clean($draft->body)) !!}
</body></html>
