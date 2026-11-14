<?php

namespace Database\Seeders;

use App\Models\ReportedJudgment;
use Illuminate\Database\Seeder;

/**
 * Local starter rows: the Lahore High Court "Judgments Approved for Reporting" list as published in
 * November 2026 (no PDFs). Add the rest in Admin, Reported judgments, or import a CSV there.
 */
class ReportedJudgmentSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        $rows = [
            ['Regular First Appeal (R.F.A) (Final Decree)', '21229/26', 'Muhammad Irfan Vs Muhammad Akram', 'Mr. Justice Muhammad Sajid Mehmood Sethi', null, '2026-11-13'],
            ['Writ Petition, Civil Proceedings, Rent', '6712/26', 'Habib Ullah Vs ADJ etc.', 'Mr. Justice Syed Ahsan Raza Kazmi', 'The mere fact that the ownership of a property vests in a Waqf estate or that its rental income is...', '2026-11-13'],
            ['Jail Revision', '383/25', 'Shah Nawaz Vs The State', 'Mr. Justice Tariq Saleem Sheikh', null, '2026-11-12'],
            ['Crl. Misc.', '63222/25', 'Qaiser Ali Vs The State etc.', 'Mr. Justice Tariq Saleem Sheikh', null, '2026-11-12'],
            ['COS(B)', '13280/25', 'Habib Metropolitan Bank Ltd Vs Ms Infinity Engineering Pvt Ltd etc', 'Mr. Justice Muhammad Sajid Mehmood Sethi', null, '2026-11-12'],
            ['Writ Petition, Miscellaneous, Consumer Courts', '14044/26', 'United Insurance Company thr. Rizwan Safdar Vs Dr. Asma Malik etc', 'Mr. Justice Jawad Hassan', null, '2026-11-12'],
            ['Regular Second Appeal', '22843/26', 'Gulzar Ahmad (deceased) through LRs & 2 others Vs Muzaffar Riaz etc', 'Mr. Justice Muhammad Sajid Mehmood Sethi', null, '2026-11-12'],
            ['Civil Revision', '27111/19', 'Jannat Begum etc Vs Province of the Punjab through Collector etc', 'Mr. Justice Muhammad Sajid Mehmood Sethi', null, '2026-11-12'],
            ['Civil Revision', '73512/25', 'Waseem Arshad Vs Muhammad Irfan Rafique etc', 'Mr. Justice Muhammad Sajid Mehmood Sethi', null, '2026-11-12'],
        ];

        foreach ($rows as [$type, $number, $title, $judge, $tag, $uploaded]) {
            ReportedJudgment::query()->updateOrCreate(
                ['court' => 'lhc', 'case_number' => $number, 'title' => $title],
                ['case_type' => $type, 'judges' => $judge, 'tag_line' => $tag, 'uploaded_on' => $uploaded, 'is_published' => true],
            );
        }
    }
}
