<?php

namespace App\Console\Commands;

use App\Models\ReportedJudgment;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Fills an empty citation from the court PDF link (2026LHC8777.pdf -> "2026 LHC 8777") for judgments
 * saved before citations were read. Case law cited inside the PDF comes from the scraper
 * (lhc-scraper/scraper.py), which reads the PDF text. Safe to re-run; never overwrites a citation.
 */
#[Signature('judgments:fill-citations')]
#[Description('Fill empty reported judgment citations from their court PDF file names')]
class FillJudgmentCitations extends Command
{
    public function handle(): int
    {
        $filled = 0;

        ReportedJudgment::query()->whereNull('citation')->whereNotNull('pdf_path')->select(['id', 'pdf_path', 'citation'])
            ->chunkById(500, function ($judgments) use (&$filled): void {
                foreach ($judgments as $judgment) {
                    if ($citation = ReportedJudgment::citationFromPdfUrl($judgment->pdf_path)) {
                        $judgment->forceFill(['citation' => $citation])->save();
                        $filled++;
                    }
                }
            });

        $this->info("Filled {$filled} citations.");

        return self::SUCCESS;
    }
}
