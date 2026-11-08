<?php

namespace App\Services\Pdf;

use Mpdf\Mpdf;
use Mpdf\Output\Destination;
use Symfony\Component\HttpFoundation\Response;

/**
 * Renders Blade views to PDF with mPDF, which shapes Arabic-script text so
 * Urdu renders correctly (autoScriptToLang + autoLangToFont → XB Riyaz).
 * See docs/Features/PDF-DOCX.md.
 */
class PdfRenderer
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function render(string $view, array $data = []): string
    {
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_top' => 16,
            'margin_bottom' => 18,
            'margin_left' => 16,
            'margin_right' => 16,
            'tempDir' => storage_path('app/private/mpdf'),
            'default_font' => 'dejavusans',
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
            'directionality' => app()->getLocale() === 'ur' ? 'rtl' : 'ltr',
        ]);
        $mpdf->SetTitle((string) ($data['title'] ?? config('app.name')));
        $mpdf->SetCreator(config('app.name'));
        $mpdf->WriteHTML(view($view, $data)->render());

        return $mpdf->Output('', Destination::STRING_RETURN);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function download(string $view, array $data, string $filename, bool $inline = false): Response
    {
        return response($this->render($view, $data), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.addslashes($filename).'"',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
