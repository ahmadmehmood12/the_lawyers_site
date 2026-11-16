<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Court;
use App\Models\CourtType;
use App\Models\District;
use App\Models\Judge;
use App\Models\Tehsil;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Judicial officers of the Punjab district judiciary, from the Lahore High Court posting list
 * "Judicial Officers Punjab" (updated 10.11.2026), parsed into
 * database/seeders/data/punjab_judicial_officers.json. Only the officer's name and designation
 * are stored, with the court of their station; P.F. numbers, posting dates and domicile are not.
 *
 * Station courts: district headquarters use "District & Sessions Court X", "Civil Courts X",
 * "Judicial Magistrate Courts X" and "Family Courts X"; tehsil stations get "Sessions Courts T"
 * and "Civil Courts T" under the district's principal court. Postings change, so admins can
 * edit or deactivate judges in Admin, Reference data. Re-running adds only missing officers.
 */
class PunjabJudiciarySeeder extends Seeder
{
    /** @var array<string, Court> */
    private array $courts = [];

    /** @var array<string, Tehsil|null> */
    private array $tehsils = [];

    /** @var array<string, string>|null */
    private ?array $stationUrdu = null;

    public function run(): void
    {
        $officers = json_decode((string) file_get_contents(database_path('seeders/data/punjab_judicial_officers.json')), true);
        $types = CourtType::query()->pluck('id', 'slug');
        $punjab = District::query()->whereHas('province', fn ($q) => $q->where('code', 'PB'))->get()->keyBy('name');

        $wanted = [];
        $postings = [];
        foreach ($officers as $officer) {
            $district = $punjab->get($officer['district']);
            if (! $district) {
                continue;
            }
            $court = $this->courtFor($officer, $district, $types->all());
            $key = $court->id.'|'.$officer['name'].'|'.$officer['designation'];
            $wanted[$key] = ($wanted[$key] ?? 0) + 1;
            // Posting: the district, and the tehsil when the officer sits at an outstation.
            $postings[$key] = ['district_id' => $district->id, 'tehsil_id' => $officer['is_hq'] ? null : $this->tehsil($district, $officer['station'])?->id];
        }

        foreach ($wanted as $key => $count) {
            [$courtId, $name, $designation] = explode('|', $key, 3);
            $existing = Judge::query()->where('court_id', $courtId)->where('name', $name)->where('designation', $designation);
            // Fill missing postings only; never undo a transfer made in admin.
            (clone $existing)->whereNull('district_id')->update(['district_id' => $postings[$key]['district_id']]);
            if ($postings[$key]['tehsil_id']) {
                (clone $existing)->whereNull('tehsil_id')->where('district_id', $postings[$key]['district_id'])->update(['tehsil_id' => $postings[$key]['tehsil_id']]);
            }
            for ($i = $existing->count(); $i < $count; $i++) {
                Judge::query()->create(['court_id' => (int) $courtId, 'name' => $name, 'designation' => $designation, 'is_active' => true, ...$postings[$key]]);
            }
        }
    }

    /**
     * @param  array{district: string, station: string, is_hq: bool, name: string, designation: string}  $officer
     * @param  array<string, int>  $types
     */
    private function courtFor(array $officer, District $district, array $types): Court
    {
        $designation = $officer['designation'];
        $sessions = str_contains($designation, 'Sessions Judge');

        if (! $officer['is_hq']) {
            $station = $officer['station'];
            $tehsil = $this->tehsil($district, $station);
            $stationUr = $tehsil?->name_ur ?: $this->stationUrdu()[$station] ?? null;
            if ($tehsil && ! $tehsil->name_ur && $stationUr) {
                $tehsil->forceFill(['name_ur' => $stationUr])->save();
            }
            $parent = $this->court($sessions ? 'district-sessions' : 'civil-court', $sessions ? "District & Sessions Court {$district->name}" : "Civil Courts {$district->name}", $district, $types, true, null,
                $district->name_ur ? ($sessions ? 'ضلعی و سیشن عدالت ' : 'دیوانی عدالتیں ').$district->name_ur : null);

            return $this->court($sessions ? 'district-sessions' : 'civil-court', ($sessions ? 'Sessions Courts ' : 'Civil Courts ').$station, $district, $types, false, $parent,
                ($sessions ? 'سیشن عدالتیں ' : 'دیوانی عدالتیں ').($stationUr ?: $station));
        }

        [$type, $prefix, $prefixUr] = match (true) {
            $sessions => ['district-sessions', 'District & Sessions Court', 'ضلعی و سیشن عدالت'],
            str_contains($designation, 'Criminal Division') => ['magistrate', 'Judicial Magistrate Courts', 'جوڈیشل مجسٹریٹ عدالتیں'],
            str_contains($designation, 'Family Division') => ['family-court', 'Family Courts', 'فیملی کورٹس'],
            default => ['civil-court', 'Civil Courts', 'دیوانی عدالتیں'],
        };

        return $this->court($type, "{$prefix} {$district->name}", $district, $types, true, null, $district->name_ur ? "{$prefixUr} {$district->name_ur}" : null);
    }

    /** @param array<string, int> $types */
    private function court(string $type, string $name, District $district, array $types, bool $headquarters, ?Court $parent = null, ?string $urdu = null): Court
    {
        $slug = Str::slug($name);

        return $this->courts[$slug] ??= tap(Court::query()->firstOrNew(['slug' => $slug]), function (Court $court) use ($type, $name, $district, $types, $headquarters, $parent, $urdu): void {
            if ($court->exists) {
                // Older runs saved some courts without an Urdu name.
                $latin = fn (?string $text): bool => (bool) preg_match('/[A-Za-z]/', (string) $text);
                if ($urdu && (! $court->name_ur || ($latin($court->name_ur) && ! $latin($urdu)))) {
                    $court->forceFill(['name_ur' => $urdu])->save();
                }

                return;
            }
            $court->fill([
                'court_type_id' => $types[$type], 'name' => $name, 'name_ur' => $urdu, 'district_id' => $district->id,
                'province_id' => $district->province_id, 'parent_id' => $parent?->id, 'is_active' => true,
                'city_id' => $headquarters ? City::query()->where('district_id', $district->id)->orderBy('id')->value('id') : null,
            ])->save();
        });
    }

    /** The tehsil named like an outstation (e.g. "Kamoke") in this district, if the reference data has it. */
    private function tehsil(District $district, string $station): ?Tehsil
    {
        $key = $district->id.'|'.$station;

        if (! array_key_exists($key, $this->tehsils)) {
            // Spelling differs between sources ("Pindigheb" / "Pindi Gheb"), so compare without spaces.
            $this->tehsils[$key] = Tehsil::query()->where('district_id', $district->id)
                ->whereRaw("LOWER(REPLACE(REPLACE(name, ' ', ''), '-', '')) = ?", [strtolower(str_replace([' ', '-'], '', $station))])->first();
        }

        return $this->tehsils[$key];
    }

    /** @return array<string, string> Urdu names of outstations (database/seeders/data/punjab_station_urdu.php). */
    private function stationUrdu(): array
    {
        return $this->stationUrdu ??= require database_path('seeders/data/punjab_station_urdu.php');
    }
}
