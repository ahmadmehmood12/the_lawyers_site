<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Court;
use App\Models\CourtType;
use App\Models\District;
use App\Models\Judge;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * District & Sessions Judges (D&SJ) of Punjab from the Lahore High Court "List of District and
 * Sessions Judges" (23-11-2026), in database/seeders/data/punjab_district_sessions_judges.php.
 *
 * Each officer is attached to the court they preside over: the district's "District & Sessions Court X"
 * or a special court / tribunal per city ("Anti-Terrorism Court Lahore", "Labour Court Rawalpindi", ...),
 * reusing courts that already exist (same slug) and creating the rest with an Urdu name. The court number
 * (Anti-Terrorism Court-II, Labour Court No. VI) goes in judges.courtroom. Designation is
 * "District & Sessions Judge", plus the role where it is not "Judge" (e.g. "(Presiding Officer)").
 *
 * The district's own D&SJ replaces an older one: another active "District & Sessions Judge" at that
 * district court is deactivated (kept for case history). Re-running adds nothing; postings edited in
 * Admin are not undone.
 */
class PunjabDistrictSessionsJudgesSeeder extends Seeder
{
    public const DESIGNATION = 'District & Sessions Judge';

    /**
     * Forum => [court type slug, English name prefix, Urdu name prefix].
     *
     * @var array<string, array{0: string, 1: string, 2: string}>
     */
    private const FORUMS = [
        'sessions' => ['district-sessions', 'District & Sessions Court', 'ضلعی و سیشن عدالت'],
        'labour' => ['labour-court', 'Labour Court', 'لیبر کورٹ'],
        'anti_corruption' => ['special-court', 'Anti-Corruption Court', 'انسداد بدعنوانی عدالت'],
        'anti_terrorism' => ['anti-terrorism', 'Anti-Terrorism Court', 'انسداد دہشت گردی عدالت'],
        'banking' => ['banking-court', 'Banking Court', 'بینکنگ کورٹ'],
        'accountability' => ['accountability', 'Accountability Court', 'احتساب عدالت'],
        'drug' => ['special-court', 'Drug Court', 'ڈرگ کورٹ'],
        'central' => ['special-court', 'Special Court (Central)', 'خصوصی عدالت (سنٹرل)'],
        'customs' => ['special-court', 'Special Court (Customs, Taxation & Anti-Smuggling)', 'خصوصی عدالت (کسٹمز، ٹیکسیشن و انسداد اسمگلنگ)'],
        'cns' => ['special-court', 'Special Court (Control of Narcotic Substances)', 'خصوصی عدالت (انسداد منشیات)'],
        'offences_banks' => ['special-court', 'Special Court (Offences in Banks)', 'خصوصی عدالت (بینکوں میں جرائم)'],
        'child_protection' => ['special-court', 'Child Protection Court', 'چائلڈ پروٹیکشن کورٹ'],
        'ipt' => ['tribunal', 'Intellectual Property Tribunal', 'انٹلیکچوئل پراپرٹی ٹریبونل'],
        'service_tribunal' => ['tribunal', 'Punjab Service Tribunal', 'پنجاب سروس ٹریبونل'],
        'insurance_tribunal' => ['tribunal', 'Insurance Tribunal', 'انشورنس ٹریبونل'],
        'pra_tribunal' => ['tribunal', 'Appellate Tribunal Punjab Revenue Authority', 'اپیلیٹ ٹریبونل پنجاب ریونیو اتھارٹی'],
        'lda_commission' => ['tribunal', 'LDA Bonafide Purchasers, Illegal Constructions & Housing Schemes Commission', 'ایل ڈی اے کمیشن برائے حقیقی خریداران، غیر قانونی تعمیرات و ہاؤسنگ اسکیمیں'],
    ];

    /** @var array<string, string> Role => designation suffix (no role = plain "Judge"). */
    private const ROLES = [
        'presiding_officer' => 'Presiding Officer',
        'special_judge' => 'Special Judge',
        'chairperson' => 'Chairperson',
        'member' => 'Member',
        'member_legal' => 'Member Legal',
        'judicial_member' => 'Judicial Member',
    ];

    /** @var array<string, Court> */
    private array $courts = [];

    public function run(): void
    {
        /** @var list<array{0: string, 1: string, 2: string, 3: string|null, 4: string|null}> $officers */
        $officers = require database_path('seeders/data/punjab_district_sessions_judges.php');
        $types = CourtType::query()->pluck('id', 'slug')->all();
        $punjab = District::query()->whereHas('province', fn ($q) => $q->where('code', 'PB'))->get()->keyBy('name');

        foreach ($officers as [$name, $districtName, $forum, $courtroom, $role]) {
            $district = $punjab->get($districtName);
            if (! $district) {
                $this->command?->warn("District not found: {$districtName} ({$name})");

                continue;
            }

            $court = $this->court($forum, $district, $types);
            $designation = self::DESIGNATION.($role ? ' ('.self::ROLES[$role].')' : '');

            $judge = Judge::query()->firstOrCreate(
                ['court_id' => $court->id, 'name' => $name, 'designation' => $designation],
                ['district_id' => $district->id, 'courtroom' => $courtroom, 'is_active' => true],
            );
            if ($courtroom && blank($judge->courtroom)) {
                $judge->forceFill(['courtroom' => $courtroom])->save();
            }

            if ($forum === 'sessions') {
                Judge::query()->where('court_id', $court->id)->where('designation', self::DESIGNATION)
                    ->whereKeyNot($judge->id)->where('is_active', true)->update(['is_active' => false]);
            }
        }
    }

    /**
     * The forum's court in this district, e.g. "Banking Court Sargodha" (created when missing).
     *
     * @param  array<string, int>  $types
     */
    private function court(string $forum, District $district, array $types): Court
    {
        [$type, $prefix, $prefixUr] = self::FORUMS[$forum];
        $name = "{$prefix} {$district->name}";
        $slug = Str::slug($name);

        return $this->courts[$slug] ??= tap(Court::query()->firstOrNew(['slug' => $slug]), function (Court $court) use ($type, $name, $district, $types, $prefixUr): void {
            $urdu = $district->name_ur ? "{$prefixUr} {$district->name_ur}" : null;
            if ($court->exists) {
                if ($urdu && blank($court->name_ur)) {
                    $court->forceFill(['name_ur' => $urdu])->save();
                }

                return;
            }
            $court->fill([
                'court_type_id' => $types[$type], 'name' => $name, 'name_ur' => $urdu, 'district_id' => $district->id,
                'province_id' => $district->province_id, 'is_active' => true,
                'city_id' => City::query()->where('district_id', $district->id)->orderBy('id')->value('id'),
            ])->save();
        });
    }
}
