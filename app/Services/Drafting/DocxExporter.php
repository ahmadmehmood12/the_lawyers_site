<?php

namespace App\Services\Drafting;

use App\Models\Draft;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Shared\Html;

/** Converts a draft's sanitized HTML into a .docx (headers/footers, page breaks, Urdu RTL). */
class DocxExporter
{
    public function export(Draft $draft): string
    {
        $word = new PhpWord;
        $rtl = $draft->language === 'ur';
        $word->setDefaultFontName($rtl ? 'Jameel Noori Nastaleeq' : 'Times New Roman');
        $word->setDefaultFontSize(12);

        $pages = preg_split('/<div class="page-break"><\/div>|<hr class="page-break"\s*\/?>/', $draft->body) ?: [$draft->body];

        foreach ($pages as $html) {
            $section = $word->addSection(['marginTop' => 1200, 'marginBottom' => 1200, 'marginLeft' => 1300, 'marginRight' => 1300]);
            if ($draft->header_text) {
                $section->addHeader()->addText($draft->header_text, ['size' => 9, 'rtl' => $rtl], ['alignment' => 'center']);
            }
            $footer = $section->addFooter();
            $footer->addPreserveText(($draft->footer_text ? $draft->footer_text.' — ' : '').'{PAGE}', ['size' => 9], ['alignment' => 'center']);

            $clean = str_replace(['<br>', 'class="placeholder"'], ['<br/>', ''], $html);
            Html::addHtml($section, $clean, false, false);
        }

        $path = storage_path('app/private/tmp-'.uniqid().'.docx');
        IOFactory::createWriter($word, 'Word2007')->save($path);

        return $path;
    }
}
