<?php

namespace Database\Seeders;

use App\Models\CourtHoliday;
use Illuminate\Database\Seeder;

/**
 * Starter court calendar for 2026 and 2027: federal public holidays and the usual superior court
 * vacations. Islamic dates are approximate and marked tentative (moon sighting). Check every year
 * against the official notification and edit in Admin, Court calendar. Safe to re-run.
 */
class CourtHolidaySeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // [title, title_ur, starts, ends, kind, tentative]
            ['Kashmir Solidarity Day', 'یوم یکجہتی کشمیر', '2026-02-05', '2026-02-05', 'public_holiday', false],
            ['Eid ul Fitr', 'عید الفطر', '2026-03-20', '2026-03-23', 'public_holiday', true],
            ['Pakistan Day', 'یوم پاکستان', '2026-03-23', '2026-03-23', 'public_holiday', false],
            ['Labour Day', 'یوم مزدور', '2026-05-01', '2026-05-01', 'public_holiday', false],
            ['Eid ul Adha', 'عید الاضحیٰ', '2026-05-27', '2026-05-29', 'public_holiday', true],
            ['Youm e Takbeer', 'یوم تکبیر', '2026-05-28', '2026-05-28', 'public_holiday', false],
            ['Summer vacation (superior courts)', 'موسم گرما کی تعطیلات (اعلیٰ عدالتیں)', '2026-06-01', '2026-08-31', 'court_vacation', false],
            ['Ashura (9th and 10th Muharram)', 'عاشورہ (9 اور 10 محرم)', '2026-06-25', '2026-06-26', 'public_holiday', true],
            ['Independence Day', 'یوم آزادی', '2026-08-14', '2026-08-14', 'public_holiday', false],
            ['Eid Milad un Nabi', 'عید میلاد النبی ﷺ', '2026-08-26', '2026-08-26', 'public_holiday', true],
            ['Iqbal Day', 'یوم اقبال', '2026-11-09', '2026-11-09', 'public_holiday', false],
            ['Winter vacation', 'موسم سرما کی تعطیلات', '2026-12-24', '2026-12-31', 'court_vacation', false],
            ['Quaid e Azam Day and Christmas', 'یوم قائد اعظم اور کرسمس', '2026-12-25', '2026-12-25', 'public_holiday', false],
            ['Kashmir Solidarity Day', 'یوم یکجہتی کشمیر', '2027-02-05', '2027-02-05', 'public_holiday', false],
            ['Eid ul Fitr', 'عید الفطر', '2027-03-10', '2027-03-12', 'public_holiday', true],
            ['Pakistan Day', 'یوم پاکستان', '2027-03-23', '2027-03-23', 'public_holiday', false],
            ['Labour Day', 'یوم مزدور', '2027-05-01', '2027-05-01', 'public_holiday', false],
            ['Eid ul Adha', 'عید الاضحیٰ', '2027-05-17', '2027-05-19', 'public_holiday', true],
            ['Youm e Takbeer', 'یوم تکبیر', '2027-05-28', '2027-05-28', 'public_holiday', false],
            ['Summer vacation (superior courts)', 'موسم گرما کی تعطیلات (اعلیٰ عدالتیں)', '2027-06-01', '2027-08-31', 'court_vacation', false],
            ['Ashura (9th and 10th Muharram)', 'عاشورہ (9 اور 10 محرم)', '2027-06-15', '2027-06-16', 'public_holiday', true],
            ['Independence Day', 'یوم آزادی', '2027-08-14', '2027-08-14', 'public_holiday', false],
            ['Eid Milad un Nabi', 'عید میلاد النبی ﷺ', '2027-08-15', '2027-08-15', 'public_holiday', true],
            ['Iqbal Day', 'یوم اقبال', '2027-11-09', '2027-11-09', 'public_holiday', false],
            ['Winter vacation', 'موسم سرما کی تعطیلات', '2027-12-24', '2027-12-31', 'court_vacation', false],
            ['Quaid e Azam Day and Christmas', 'یوم قائد اعظم اور کرسمس', '2027-12-25', '2027-12-25', 'public_holiday', false],
        ];

        foreach ($rows as [$title, $titleUr, $start, $end, $kind, $tentative]) {
            CourtHoliday::query()->updateOrCreate(['title' => $title, 'starts_on' => $start], [
                'title_ur' => $titleUr, 'ends_on' => $end, 'kind' => $kind, 'tentative' => $tentative, 'is_active' => true,
                'notes' => $tentative ? 'Subject to moon sighting.' : null,
            ]);
        }

        CourtHoliday::flush();
    }
}
