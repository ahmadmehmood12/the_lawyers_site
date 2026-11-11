<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\District;
use App\Models\Province;
use App\Models\Tehsil;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Every district and tehsil of Pakistan (database/seeders/data/pakistan_geography.php), plus a
 * city for each district headquarters so directory and profile dropdowns cover the whole country.
 * Idempotent: existing rows keep their Urdu names and ids.
 */
class PakistanGeographySeeder extends Seeder
{
    public function run(): void
    {
        $data = require database_path('seeders/data/pakistan_geography.php');
        $provinces = Province::query()->pluck('id', 'code');

        foreach ($data as $code => $districts) {
            $provinceId = $provinces[$code] ?? null;
            if (! $provinceId) {
                continue;
            }

            foreach ($districts as $name => [$urdu, $headquarters, $tehsils]) {
                $district = District::query()->firstOrCreate(['province_id' => $provinceId, 'name' => $name], ['name_ur' => $urdu]);
                if (blank($district->name_ur)) {
                    $district->update(['name_ur' => $urdu]);
                }

                foreach ($tehsils as $tehsil) {
                    Tehsil::query()->firstOrCreate(['district_id' => $district->id, 'name' => $tehsil]);
                }

                $city = City::query()->firstOrNew(['slug' => Str::slug($headquarters)]);
                $city->fill(['district_id' => $district->id, 'name' => $city->name ?: $headquarters]);
                if (blank($city->name_ur) && $headquarters === $name) {
                    $city->name_ur = $urdu;
                }
                $city->save();
            }
        }
    }
}
