<?php

namespace Database\Seeders;

use App\Models\BarCouncil;
use App\Models\City;
use App\Models\Court;
use App\Models\CourtType;
use App\Models\District;
use App\Models\Province;
use App\Models\Specialization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Starter reference data for Pakistan. Everything here is editable in the
 * admin panel; it is a starting point, not an exhaustive register.
 * Judge names are intentionally NOT seeded (admins add them).
 */
class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $provinces = [
            ['PB', 'Punjab', 'پنجاب'], ['SD', 'Sindh', 'سندھ'], ['KP', 'Khyber Pakhtunkhwa', 'خیبر پختونخوا'],
            ['BA', 'Balochistan', 'بلوچستان'], ['IS', 'Islamabad Capital Territory', 'اسلام آباد'],
            ['GB', 'Gilgit-Baltistan', 'گلگت بلتستان'], ['AJK', 'Azad Jammu & Kashmir', 'آزاد جموں و کشمیر'],
        ];
        foreach ($provinces as $i => [$code, $name, $ur]) {
            Province::query()->updateOrCreate(['code' => $code], ['name' => $name, 'name_ur' => $ur, 'sort_order' => $i]);
        }
        $p = Province::query()->pluck('id', 'code');

        // province => [district => [ur, [cities...]]]
        $geo = [
            'PB' => ['Lahore' => ['لاہور', ['Lahore']], 'Rawalpindi' => ['راولپنڈی', ['Rawalpindi', 'Murree']], 'Faisalabad' => ['فیصل آباد', ['Faisalabad']],
                'Multan' => ['ملتان', ['Multan']], 'Gujranwala' => ['گوجرانوالہ', ['Gujranwala']], 'Sialkot' => ['سیالکوٹ', ['Sialkot']],
                'Bahawalpur' => ['بہاولپور', ['Bahawalpur']], 'Sargodha' => ['سرگودھا', ['Sargodha']], 'Sheikhupura' => ['شیخوپورہ', ['Sheikhupura']],
                'Sahiwal' => ['ساہیوال', ['Sahiwal']], 'Dera Ghazi Khan' => ['ڈیرہ غازی خان', ['Dera Ghazi Khan']], 'Gujrat' => ['گجرات', ['Gujrat']]],
            'SD' => ['Karachi South' => ['کراچی جنوبی', ['Karachi']], 'Karachi East' => ['کراچی شرقی', ['Karachi East']], 'Karachi Central' => ['کراچی وسطی', ['Karachi Central']],
                'Karachi West' => ['کراچی غربی', ['Karachi West']], 'Malir' => ['ملیر', ['Malir']], 'Hyderabad' => ['حیدرآباد', ['Hyderabad']],
                'Sukkur' => ['سکھر', ['Sukkur']], 'Larkana' => ['لاڑکانہ', ['Larkana']], 'Mirpur Khas' => ['میرپور خاص', ['Mirpur Khas']]],
            'KP' => ['Peshawar' => ['پشاور', ['Peshawar']], 'Mardan' => ['مردان', ['Mardan']], 'Abbottabad' => ['ایبٹ آباد', ['Abbottabad']],
                'Swat' => ['سوات', ['Mingora']], 'Dera Ismail Khan' => ['ڈیرہ اسماعیل خان', ['Dera Ismail Khan']], 'Bannu' => ['بنوں', ['Bannu']], 'Kohat' => ['کوہاٹ', ['Kohat']]],
            'BA' => ['Quetta' => ['کوئٹہ', ['Quetta']], 'Gwadar' => ['گوادر', ['Gwadar']], 'Sibi' => ['سبی', ['Sibi']], 'Kech' => ['کیچ', ['Turbat']], 'Khuzdar' => ['خضدار', ['Khuzdar']]],
            'IS' => ['Islamabad' => ['اسلام آباد', ['Islamabad']]],
            'GB' => ['Gilgit' => ['گلگت', ['Gilgit']], 'Skardu' => ['سکردو', ['Skardu']]],
            'AJK' => ['Muzaffarabad' => ['مظفرآباد', ['Muzaffarabad']], 'Mirpur' => ['میرپور', ['Mirpur']]],
        ];
        $cityUr = ['Lahore' => 'لاہور', 'Rawalpindi' => 'راولپنڈی', 'Karachi' => 'کراچی', 'Islamabad' => 'اسلام آباد', 'Peshawar' => 'پشاور', 'Quetta' => 'کوئٹہ', 'Multan' => 'ملتان', 'Faisalabad' => 'فیصل آباد', 'Hyderabad' => 'حیدرآباد'];

        foreach ($geo as $code => $districts) {
            foreach ($districts as $name => [$ur, $cities]) {
                $district = District::query()->updateOrCreate(['province_id' => $p[$code], 'name' => $name], ['name_ur' => $ur]);
                foreach ($cities as $city) {
                    City::query()->updateOrCreate(['slug' => Str::slug($city)], ['district_id' => $district->id, 'name' => $city, 'name_ur' => $cityUr[$city] ?? ($city === $name ? $ur : null)]);
                }
            }
        }

        $types = [
            ['supreme-court', 'Supreme Court', 'عدالت عظمیٰ', 1], ['federal-shariat-court', 'Federal Shariat Court', 'وفاقی شرعی عدالت', 1],
            ['high-court', 'High Court', 'عدالت عالیہ', 2], ['district-sessions', 'District & Sessions Court', 'ضلعی و سیشن عدالت', 3],
            ['civil-court', 'Civil Court', 'دیوانی عدالت', 4], ['magistrate', 'Judicial Magistrate Court', 'مجسٹریٹ عدالت', 4],
            ['family-court', 'Family Court', 'فیملی کورٹ', 4], ['banking-court', 'Banking Court', 'بینکنگ کورٹ', 3],
            ['anti-terrorism', 'Anti-Terrorism Court', 'انسداد دہشت گردی عدالت', 3], ['accountability', 'Accountability Court', 'احتساب عدالت', 3],
            ['special-court', 'Special Court', 'خصوصی عدالت', 3], ['tribunal', 'Tribunal', 'ٹریبونل', 3],
            ['labour-court', 'Labour Court', 'لیبر کورٹ', 4], ['consumer-court', 'Consumer Court', 'صارف عدالت', 4], ['rent-tribunal', 'Rent Controller', 'رینٹ کنٹرولر', 4],
        ];
        foreach ($types as $i => [$slug, $name, $ur, $level]) {
            CourtType::query()->updateOrCreate(['slug' => $slug], ['name' => $name, 'name_ur' => $ur, 'level' => $level, 'sort_order' => $i]);
        }
        $t = CourtType::query()->pluck('id', 'slug');
        $d = District::query()->pluck('id', 'name');
        $c = City::query()->pluck('id', 'name');
        $prov = fn (string $district) => District::query()->find($d[$district])?->province_id;

        $court = function (string $type, string $name, ?string $ur, string $district, ?string $city = null, ?string $parent = null, ?string $bench = null) use ($t, $d, $c, $prov): Court {
            return Court::query()->updateOrCreate(['slug' => Str::slug($name)], [
                'court_type_id' => $t[$type], 'name' => $name, 'name_ur' => $ur, 'district_id' => $d[$district], 'province_id' => $prov($district),
                'city_id' => $city ? ($c[$city] ?? null) : null, 'bench' => $bench,
                'parent_id' => $parent ? Court::query()->where('slug', Str::slug($parent))->value('id') : null, 'is_active' => true,
            ]);
        };

        $court('supreme-court', 'Supreme Court of Pakistan', 'سپریم کورٹ آف پاکستان', 'Islamabad', 'Islamabad');
        foreach (['Lahore' => 'Lahore', 'Karachi South' => 'Karachi', 'Peshawar' => 'Peshawar', 'Quetta' => 'Quetta'] as $district => $city) {
            $court('supreme-court', "Supreme Court of Pakistan — {$city} Branch Registry", null, $district, $city, 'Supreme Court of Pakistan', $city);
        }
        $court('federal-shariat-court', 'Federal Shariat Court', 'وفاقی شرعی عدالت', 'Islamabad', 'Islamabad');
        $court('high-court', 'Islamabad High Court', 'اسلام آباد ہائی کورٹ', 'Islamabad', 'Islamabad');
        $court('high-court', 'Lahore High Court', 'لاہور ہائی کورٹ', 'Lahore', 'Lahore');
        foreach (['Rawalpindi', 'Multan', 'Bahawalpur'] as $bench) {
            $court('high-court', "Lahore High Court — {$bench} Bench", "لاہور ہائی کورٹ — {$bench} بینچ", $bench, $bench, 'Lahore High Court', $bench);
        }
        $court('high-court', 'Sindh High Court', 'سندھ ہائی کورٹ', 'Karachi South', 'Karachi');
        foreach (['Hyderabad', 'Sukkur', 'Larkana'] as $bench) {
            $court('high-court', "Sindh High Court — {$bench} Bench", null, $bench, $bench, 'Sindh High Court', $bench);
        }
        $court('high-court', 'Peshawar High Court', 'پشاور ہائی کورٹ', 'Peshawar', 'Peshawar');
        foreach (['Abbottabad' => 'Abbottabad', 'Swat' => 'Mingora', 'Dera Ismail Khan' => 'Dera Ismail Khan', 'Bannu' => 'Bannu'] as $district => $city) {
            $court('high-court', "Peshawar High Court — {$city} Bench", null, $district, $city, 'Peshawar High Court', $city);
        }
        $court('high-court', 'Balochistan High Court', 'بلوچستان ہائی کورٹ', 'Quetta', 'Quetta');
        foreach (['Sibi' => 'Sibi', 'Kech' => 'Turbat'] as $district => $city) {
            $court('high-court', "Balochistan High Court — {$city} Bench", null, $district, $city, 'Balochistan High Court', $city);
        }

        foreach ($geo as $districts) {
            foreach ($districts as $district => [$ur, $cities]) {
                $city = $cities[0];
                $court('district-sessions', "District & Sessions Court {$district}", "ضلعی و سیشن عدالت {$ur}", $district, $city);
                $court('civil-court', "Civil Courts {$district}", "دیوانی عدالتیں {$ur}", $district, $city);
                $court('magistrate', "Judicial Magistrate Courts {$district}", null, $district, $city);
                $court('family-court', "Family Courts {$district}", "فیملی کورٹس {$ur}", $district, $city);
            }
        }

        foreach (['Lahore' => 'Lahore', 'Karachi South' => 'Karachi', 'Islamabad' => 'Islamabad', 'Peshawar' => 'Peshawar', 'Quetta' => 'Quetta', 'Rawalpindi' => 'Rawalpindi', 'Multan' => 'Multan'] as $district => $city) {
            $court('banking-court', "Banking Court {$city}", null, $district, $city);
            $court('anti-terrorism', "Anti-Terrorism Court {$city}", null, $district, $city);
            $court('accountability', "Accountability Court {$city}", null, $district, $city);
            $court('labour-court', "Labour Court {$city}", null, $district, $city);
        }
        foreach (['Lahore', 'Faisalabad', 'Multan', 'Rawalpindi'] as $city) {
            $court('consumer-court', "District Consumer Court {$city}", null, $city, $city);
        }
        $court('tribunal', 'Federal Service Tribunal', 'وفاقی سروس ٹریبونل', 'Islamabad', 'Islamabad');
        $court('tribunal', 'Appellate Tribunal Inland Revenue — Islamabad', null, 'Islamabad', 'Islamabad');
        $court('special-court', 'Special Court (Customs, Taxation & Anti-Smuggling) Lahore', null, 'Lahore', 'Lahore');
        $court('rent-tribunal', 'Rent Controller Islamabad', null, 'Islamabad', 'Islamabad');

        $specializations = [
            ['criminal-law', 'Criminal Law', 'فوجداری قانون', 'gavel', 'Bail, trials, appeals, FIR quashment and criminal defence.'],
            ['civil-litigation', 'Civil Litigation', 'دیوانی مقدمات', 'scale', 'Suits for declaration, injunction, recovery and specific performance.'],
            ['family-law', 'Family Law', 'عائلی قانون', 'users', 'Khula, divorce, maintenance, dower, custody and guardianship.'],
            ['property-law', 'Property & Real Estate', 'جائیداد و رئیل اسٹیٹ', 'home', 'Title disputes, transfers, partition and possession.'],
            ['corporate-law', 'Corporate & Commercial', 'کارپوریٹ و تجارتی', 'building', 'Company formation, contracts, compliance and SECP matters.'],
            ['banking-finance', 'Banking & Finance', 'بینکاری و مالیات', 'landmark', 'Recovery suits, financing disputes and banking courts.'],
            ['taxation', 'Taxation', 'ٹیکس', 'receipt', 'Income tax, sales tax, appeals and FBR proceedings.'],
            ['constitutional-law', 'Constitutional & Writs', 'آئینی و رٹ', 'book', 'Writ petitions and fundamental rights litigation.'],
            ['labour-employment', 'Labour & Employment', 'لیبر و ملازمت', 'briefcase', 'Termination, wages, EOBI and labour court matters.'],
            ['service-matters', 'Service Matters', 'سروس معاملات', 'id-card', 'Civil service appeals and service tribunal cases.'],
            ['cyber-crime', 'Cyber Crime', 'سائبر کرائم', 'shield', 'PECA offences, online harassment and FIA cybercrime cases.'],
            ['intellectual-property', 'Intellectual Property', 'دانشورانہ املاک', 'lightbulb', 'Trademarks, copyright, patents and IPO matters.'],
            ['rent-tenancy', 'Rent & Tenancy', 'کرایہ داری', 'key', 'Ejectment, rent disputes and tenancy agreements.'],
            ['consumer-protection', 'Consumer Protection', 'تحفظ صارفین', 'shopping-bag', 'Complaints before consumer courts.'],
            ['immigration', 'Immigration & Overseas Pakistanis', 'امیگریشن و سمندر پار پاکستانی', 'plane', 'Visas, overseas property and power of attorney matters.'],
            ['arbitration', 'Arbitration & ADR', 'ثالثی', 'handshake', 'Arbitration, mediation and settlement.'],
        ];
        foreach ($specializations as $i => [$slug, $name, $ur, $icon, $desc]) {
            Specialization::query()->updateOrCreate(['slug' => $slug], ['name' => $name, 'name_ur' => $ur, 'icon' => $icon, 'description' => $desc, 'sort_order' => $i, 'is_active' => true]);
        }

        $councils = [
            ['PBC', 'Pakistan Bar Council', 'پاکستان بار کونسل', null], ['PUNBC', 'Punjab Bar Council', 'پنجاب بار کونسل', 'PB'],
            ['SBC', 'Sindh Bar Council', 'سندھ بار کونسل', 'SD'], ['KPBC', 'Khyber Pakhtunkhwa Bar Council', 'خیبر پختونخوا بار کونسل', 'KP'],
            ['BBC', 'Balochistan Bar Council', 'بلوچستان بار کونسل', 'BA'], ['IBC', 'Islamabad Bar Council', 'اسلام آباد بار کونسل', 'IS'],
            ['GBBC', 'Gilgit-Baltistan Bar Council', 'گلگت بلتستان بار کونسل', 'GB'], ['AJKBC', 'Azad Jammu & Kashmir Bar Council', 'آزاد جموں و کشمیر بار کونسل', 'AJK'],
        ];
        foreach ($councils as [$code, $name, $ur, $province]) {
            BarCouncil::query()->updateOrCreate(['code' => $code], ['name' => $name, 'name_ur' => $ur, 'province_id' => $province ? $p[$province] : null]);
        }
    }
}
