<?php

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\AdvocateCategory;
use App\Enums\CaseStatus;
use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Enums\VerificationStatus;
use App\Events\HearingChanged;
use App\Models\Appointment;
use App\Models\BarCouncil;
use App\Models\City;
use App\Models\Client;
use App\Models\Court;
use App\Models\DiaryEntry;
use App\Models\DocumentTemplate;
use App\Models\Judge;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\Review;
use App\Models\Specialization;
use App\Models\User;
use App\Services\Cases\CaseService;
use App\Services\Drafting\PlaceholderResolver;
use App\Services\Finance\InvoiceService;
use App\Services\Finance\PaymentService;
use App\Services\Hearings\HearingService;
use App\Services\Lawyers\LawyerProfileService;
use App\Services\Messaging\MessagingService;
use App\Services\Organizations\OrganizationProvisioner;
use App\Services\Verification\VerificationService;
use App\Support\HtmlSanitizer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Throwable;

/**
 * Local development volume data (docs/Database/Seeders.md): 30 law firms and about 160 advocates
 * across Pakistan with complete profiles, their clients, cases with full hearing history (orders,
 * adjournments, next dates), tasks, expenses, invoices and receipts, drafts, diary notes,
 * consultations, reviews and client conversations. Everyone here is fictional; accounts use
 *
 * @wakeeldiary.test addresses and the password "password". Runs only in APP_ENV=local.
 *
 * History is written through the real services with the clock moved to each historical date,
 * so timelines, activity logs and receipts carry realistic dates.
 */
class PakistanPracticeSeeder extends Seeder
{
    private const DOMAIN = 'wakeeldiary.test';

    private Carbon $now;

    /** @var array<string, true> */
    private array $usedNames = [];

    private int $emailSeq = 0;

    private ?User $officer = null;

    /** @var list<array{user: User, client: Client}> */
    private array $portalClients = [];

    private const MALE = ['Ahmed', 'Ali', 'Hassan', 'Usman', 'Bilal', 'Hamza', 'Faisal', 'Imran', 'Kamran', 'Adeel', 'Asad', 'Zeeshan', 'Waqas', 'Shahid', 'Tariq', 'Naveed', 'Saad', 'Fahad', 'Junaid', 'Rizwan', 'Arslan', 'Haris', 'Talha', 'Umair', 'Owais', 'Danish', 'Khurram', 'Nadeem', 'Sohail', 'Babar', 'Zubair', 'Irfan', 'Shoaib', 'Yasir', 'Atif', 'Azhar', 'Mudassar', 'Jawad', 'Farhan', 'Raheel', 'Salman', 'Qasim', 'Shahzad', 'Waseem', 'Aamir', 'Noman', 'Hammad', 'Ahsan', 'Moeen', 'Taimur', 'Sarmad', 'Haroon', 'Fawad', 'Ammar', 'Ehtisham', 'Sajid', 'Javed', 'Arif', 'Abdullah', 'Abdul Rehman', 'Muhammad Ali', 'Muhammad Usman', 'Muhammad Bilal', 'Syed Ahmed', 'Mian Tariq', 'Rana Asif'];

    private const FEMALE = ['Ayesha', 'Fatima', 'Maryam', 'Zainab', 'Hira', 'Sana', 'Mehwish', 'Saima', 'Rabia', 'Amna', 'Iqra', 'Nida', 'Sadia', 'Kiran', 'Asma', 'Bushra', 'Farah', 'Huma', 'Javeria', 'Komal', 'Laiba', 'Madiha', 'Nadia', 'Rida', 'Sidra', 'Tahira', 'Uzma', 'Zara', 'Aiman', 'Mahnoor', 'Noor', 'Saba', 'Samina', 'Shazia', 'Fariha', 'Anum', 'Erum', 'Sobia', 'Rukhsana', 'Ambreen'];

    private const SURNAMES = [
        'PB' => ['Chaudhry', 'Malik', 'Butt', 'Cheema', 'Bajwa', 'Warraich', 'Gondal', 'Tarar', 'Ranjha', 'Virk', 'Sandhu', 'Awan', 'Janjua', 'Rana', 'Bhatti', 'Gilani', 'Bukhari', 'Qureshi', 'Sheikh', 'Mirza', 'Hashmi', 'Dogar', 'Sial', 'Chattha', 'Kiyani', 'Satti', 'Abbasi', 'Mughal', 'Ansari', 'Naqvi', 'Khokhar', 'Wattoo', 'Arain', 'Jutt', 'Niazi'],
        'SD' => ['Memon', 'Soomro', 'Junejo', 'Shaikh', 'Jatoi', 'Talpur', 'Leghari', 'Siddiqui', 'Zaidi', 'Rizvi', 'Jafri', 'Abro', 'Mahar', 'Chandio', 'Qazi', 'Kazi', 'Baig', 'Ansari'],
        'KP' => ['Khan', 'Khattak', 'Afridi', 'Yousafzai', 'Durrani', 'Marwat', 'Bangash', 'Swati', 'Tanoli', 'Mohmand', 'Orakzai', 'Jadoon', 'Gandapur', 'Shinwari', 'Kundi'],
        'BA' => ['Baloch', 'Bugti', 'Marri', 'Mengal', 'Raisani', 'Kakar', 'Achakzai', 'Jamali', 'Magsi', 'Zehri', 'Rind', 'Lehri'],
        'IS' => ['Abbasi', 'Kiyani', 'Satti', 'Raja', 'Qureshi', 'Malik', 'Hashmi', 'Siddiqui', 'Khan', 'Awan', 'Janjua', 'Gilani'],
    ];

    /** city slug => [province, phone area code, weight] */
    private const CITIES = [
        'lahore' => ['PB', '42', 9], 'rawalpindi' => ['PB', '51', 4], 'faisalabad' => ['PB', '41', 4], 'multan' => ['PB', '61', 4],
        'gujranwala' => ['PB', '55', 3], 'sialkot' => ['PB', '52', 2], 'bahawalpur' => ['PB', '62', 2], 'sargodha' => ['PB', '48', 2],
        'sheikhupura' => ['PB', '56', 1], 'sahiwal' => ['PB', '40', 1], 'gujrat' => ['PB', '53', 1], 'dera-ghazi-khan' => ['PB', '64', 1],
        'okara' => ['PB', '44', 1], 'jhang' => ['PB', '47', 1], 'kasur' => ['PB', '49', 1], 'rahim-yar-khan' => ['PB', '68', 1],
        'karachi' => ['SD', '21', 5], 'hyderabad' => ['SD', '22', 2], 'sukkur' => ['SD', '71', 1],
        'peshawar' => ['KP', '91', 3], 'mardan' => ['KP', '937', 1], 'abbottabad' => ['KP', '992', 1],
        'quetta' => ['BA', '81', 2], 'islamabad' => ['IS', '51', 4],
    ];

    private const UNIVERSITIES = ['University of the Punjab', 'Punjab University Law College, Lahore', 'Pakistan College of Law, Lahore', 'University of Karachi', 'S.M. Law College, Karachi', 'Khyber Law College, University of Peshawar', 'University Law College, Quetta', 'Bahauddin Zakariya University, Multan', 'International Islamic University, Islamabad', 'Lahore University of Management Sciences', 'Quaid e Azam Law College, Lahore', 'University of London (International Programmes)', 'Hamdard University, Karachi', 'Islamia University, Bahawalpur', 'University of Sargodha'];

    public function run(): void
    {
        if (User::query()->where('email', 'like', '%@'.self::DOMAIN)->exists()) {
            $this->command?->info('PakistanPracticeSeeder already ran; skipping.');

            return;
        }

        mt_srand(20261111);
        Event::fake([HearingChanged::class]);
        Notification::fake();
        config(['queue.default' => 'sync']);
        $this->now = Carbon::now()->startOfMinute();
        $this->officer = User::query()->where('email', 'verifier@wakeel.test')->first()
            ?? User::query()->where('account_type', AccountType::Platform->value)->first();

        $cities = City::query()->whereIn('slug', array_keys(self::CITIES))->with('district')->get()->keyBy('slug');
        $pool = [];
        foreach (self::CITIES as $slug => [, , $weight]) {
            if ($cities->has($slug)) {
                array_push($pool, ...array_fill(0, $weight, $slug));
            }
        }

        $firmCount = 0;
        $soloCount = 0;
        for ($i = 0; $i < 30; $i++) {
            $this->seedFirm($cities[$pool[mt_rand(0, count($pool) - 1)]]);
            $firmCount++;
            $this->command?->getOutput()->write('.');
        }
        for ($i = 0; $i < 55; $i++) {
            $this->seedSolo($cities[$pool[mt_rand(0, count($pool) - 1)]]);
            $soloCount++;
            $this->command?->getOutput()->write('.');
        }

        $this->seedReviews();
        Carbon::setTestNow();
        auth()->logout();
        $this->command?->newLine();
        $this->command?->info("Seeded {$firmCount} firms, {$soloCount} solo practices, ".LawyerProfile::query()->whereHas('user', fn ($q) => $q->where('email', 'like', '%@'.self::DOMAIN))->count().' advocates.');
    }

    private function seedFirm(City $city): void
    {
        $province = self::CITIES[$city->slug][0];
        $owner = $this->lawyer($city, mt_rand(16, 32));
        $partner = $this->lawyer($city, mt_rand(10, 22));
        $name = $this->firmName($owner, $partner, $city);

        $this->at($this->now->copy()->subYears(2)->subDays(mt_rand(0, 300)));
        $firm = app(OrganizationProvisioner::class)->create($owner, OrganizationType::Firm, $name, [
            'is_public' => true, 'city_id' => $city->id, 'founded_year' => (int) $this->now->year - mt_rand(4, 35),
            'email' => 'contact@'.Str::slug($name).'.example.com', 'phone' => $this->landline($city), 'website' => 'https://'.Str::slug($name).'.example.com',
            'address' => $this->officeAddress($city), 'registration_number' => 'FRM '.mt_rand(10000, 99999), 'ntn' => (string) mt_rand(1000000, 9999999),
            'description' => $this->firmDescription($name, $city, $owner),
            'description_ur' => "{$name} {$city->name} میں قائم ایک مکمل قانونی فرم ہے جو ضلعی عدالتوں اور ہائی کورٹ میں فوجداری، دیوانی، عائلی اور تجارتی مقدمات کی پیروی کرتی ہے۔",
        ]);

        $provisioner = app(OrganizationProvisioner::class);
        $provisioner->addMember($firm, $partner, OrgRole::SeniorAdvocate, $owner);
        $members = [$owner, $partner];
        foreach (range(1, mt_rand(1, 3)) as $n) {
            $associate = $this->lawyer($city, mt_rand(1, 9));
            $provisioner->addMember($firm, $associate, $n === 1 ? OrgRole::AssociateAdvocate : OrgRole::JuniorAdvocate, $owner);
            $members[] = $associate;
        }
        $provisioner->addMember($firm, $this->user($this->personName($province, 'male'), AccountType::Staff), OrgRole::Clerk, $owner);

        $clients = $this->clients($firm, $owner, $city, mt_rand(8, 12));
        foreach ($members as $member) {
            $this->practice($firm, $member, $clients, $city, mt_rand(2, 3));
        }
        $this->conversations($firm, $owner, $clients);
    }

    private function seedSolo(City $city): void
    {
        $lawyer = $this->lawyer($city, mt_rand(2, 28));
        $this->at($this->now->copy()->subMonths(mt_rand(14, 30)));
        $practice = app(OrganizationProvisioner::class)->createSoloPractice($lawyer);
        $practice->update(['address' => $lawyer->lawyerProfile->chamber_address, 'phone' => $lawyer->phone, 'city_id' => $city->id, 'email' => $lawyer->email]);

        $clients = $this->clients($practice, $lawyer, $city, mt_rand(4, 6));
        $this->practice($practice, $lawyer, $clients, $city, mt_rand(2, 4));
        $this->conversations($practice, $lawyer, $clients);
    }

    /** An advocate with a complete public profile. */
    private function lawyer(City $city, int $years): User
    {
        $province = self::CITIES[$city->slug][0];
        $gender = mt_rand(1, 100) <= 30 ? 'female' : 'male';
        $name = $this->personName($province, $gender);
        $this->at($this->now->copy()->subMonths(mt_rand(16, 34)));
        $user = $this->user($name, AccountType::Lawyer);

        $category = match (true) {
            $years >= 20 && mt_rand(0, 1) === 1 => AdvocateCategory::SupremeCourt,
            $years >= 3 => AdvocateCategory::HighCourt,
            default => AdvocateCategory::LowerCourts,
        };
        $specs = Specialization::query()->where('is_active', true)->inRandomOrder()->limit(mt_rand(2, 4))->get();
        $primary = $specs->first();
        $since = (int) $this->now->year - $years;
        $councils = ['PB' => 'PUNBC', 'SD' => 'SBC', 'KP' => 'KPBC', 'BA' => 'BBC', 'IS' => 'IBC'];
        $council = BarCouncil::query()->where('code', $councils[$province])->first();
        $title = $category === AdvocateCategory::SupremeCourt ? 'Advocate Supreme Court' : ($category === AdvocateCategory::HighCourt ? 'Advocate High Court' : 'Advocate');
        $feeMin = [2000, 3000, 5000, 7500, 10000, 15000][min(5, intdiv($years, 5))];
        $areas = $specs->pluck('name')->map(fn ($s) => Str::lower($s))->all();
        $verified = mt_rand(1, 100) <= 85;

        $profile = app(LawyerProfileService::class)->createFor($user);
        $profile->fill([
            'title' => mt_rand(1, 100) <= 12 ? 'Barrister' : 'Advocate', 'bar_council_id' => $council?->id,
            'enrollment_number' => strtoupper(substr($councils[$province], 0, 3)).' '.mt_rand(10000, 99999), 'cnic' => $this->cnic($province, $gender),
            'advocate_category' => $category, 'enrollment_date' => Carbon::create($since, mt_rand(1, 12), mt_rand(1, 28))->toDateString(), 'practice_since' => $since,
            'headline' => "{$title}, ".$this->listText(array_slice($areas, 0, 2)),
            'bio' => $this->bio($name, $city, $years, $areas, $category),
            'bio_ur' => "{$years} سال سے {$city->name} کی عدالتوں میں وکالت کر رہے ہیں۔ مؤکل کو ہر سماعت سے پہلے آگاہ رکھنا اور مقدمے کی مکمل تیاری ان کی ترجیح ہے۔",
            'province_id' => $city->district->province_id, 'district_id' => $city->district_id, 'city_id' => $city->id,
            'chamber_address' => $this->chamberAddress($city), 'public_phone' => $user->phone, 'public_email' => $user->email,
            'consultation_fee_min' => $feeMin, 'consultation_fee_max' => $feeMin * mt_rand(2, 4),
            'offers_online' => mt_rand(1, 100) <= 70, 'offers_in_person' => true, 'accepting_clients' => mt_rand(1, 100) <= 90,
            'is_public' => mt_rand(1, 100) <= 92, 'onboarding_step' => 6,
        ])->save();
        $profile->forceFill(['onboarding_completed_at' => $this->now->copy()->subMonths(mt_rand(10, 15))])->save();

        $profile->specializations()->sync($specs->mapWithKeys(fn ($s, $i) => [$s->id => ['is_primary' => $i === 0]])->all());
        $profile->courts()->sync($this->practiceCourts($city)->pluck('id')->all());
        $regional = ['PB' => ['Punjabi', 'Saraiki'], 'SD' => ['Sindhi'], 'KP' => ['Pashto', 'Hindko'], 'BA' => ['Balochi', 'Pashto', 'Brahui'], 'IS' => ['Punjabi', 'Pashto']][$province];
        $profile->languages()->createMany(collect(['English', 'Urdu', $regional[mt_rand(0, count($regional) - 1)]])->map(fn ($l) => ['language' => $l])->all());
        $profile->educations()->createMany(array_values(array_filter([
            ['degree' => mt_rand(0, 1) ? 'LL.B. (Hons), five years' : 'LL.B.', 'institution' => $this->pick(self::UNIVERSITIES), 'year' => $since - 1],
            $years > 8 && mt_rand(1, 100) <= 40 ? ['degree' => 'LL.M.', 'institution' => $this->pick(['University of London', 'University of the Punjab', 'International Islamic University, Islamabad', 'University of Warwick', 'Lahore University of Management Sciences']), 'year' => $since + mt_rand(2, 6)] : null,
            ['degree' => $this->pick(['B.A.', 'B.Com.', 'B.Sc.', 'BBA']), 'institution' => $this->pick(['Government College University, Lahore', 'Forman Christian College, Lahore', 'Gordon College, Rawalpindi', 'D.J. Sindh Government Science College', 'Islamia College, Peshawar', 'University of Balochistan']), 'year' => $since - 4],
        ])));
        $profile->experiences()->createMany($this->experiences($since, $city, $primary?->name ?? 'litigation'));
        if ($years >= 6) {
            $profile->credentials()->createMany(array_slice([
                ['type' => 'certification', 'title' => 'Mediation and ADR training', 'issuer' => 'Punjab Judicial Academy', 'year' => $since + mt_rand(3, max(3, $years - 1))],
                ['type' => 'award', 'title' => 'Best Junior Advocate', 'issuer' => "District Bar Association {$city->name}", 'year' => $since + mt_rand(1, 3)],
                ['type' => 'publication', 'title' => 'Notes on bail jurisprudence in Pakistan', 'issuer' => 'Pakistan Law Journal (practitioner notes)', 'year' => $since + mt_rand(4, max(4, $years))],
            ], 0, mt_rand(1, 3)));
        }

        foreach (array_slice([1, 2, 3, 4, 5, 6], mt_rand(0, 2), mt_rand(3, 5)) as $weekday) {
            $user->availabilitySlots()->create(['weekday' => $weekday, 'starts_at' => $this->pick(['16:00', '17:00', '18:00']), 'ends_at' => $this->pick(['19:00', '20:00']), 'mode' => $this->pick(['both', 'both', 'in_person', 'online'])]);
        }

        $request = $profile->verificationRequests()->create(['status' => VerificationStatus::Submitted, 'submitted_at' => $this->now->copy()->subMonths(mt_rand(6, 12))]);
        if ($verified && $this->officer) {
            app(VerificationService::class)->transition($request, VerificationStatus::Approved, $this->officer, 'Enrollment checked against the '.$council?->name.' roll.');
        } else {
            $profile->forceFill(['verification_status' => VerificationStatus::Submitted])->save();
        }

        return $user->fresh(['lawyerProfile']);
    }

    /** @return list<Client> */
    private function clients(Organization $org, User $creator, City $city, int $count): array
    {
        $province = self::CITIES[$city->slug][0];
        $clients = [];
        for ($i = 0; $i < $count; $i++) {
            $business = mt_rand(1, 100) <= 20;
            $gender = mt_rand(0, 1) ? 'male' : 'female';
            $name = $business ? $this->businessName($province, $city) : $this->personName($province, $gender);
            $client = $org->clients()->create([
                'type' => $business ? 'business' : 'individual', 'name' => $name, 'company_name' => $business ? $name : null,
                'cnic' => $business ? null : $this->cnic($province, $gender), 'ntn' => $business ? (string) mt_rand(1000000, 9999999) : null,
                'email' => mt_rand(1, 100) <= 60 ? $this->email($name) : null, 'phone' => $this->mobile(), 'address' => $this->homeAddress($city),
                'city_id' => $city->id, 'preferred_locale' => mt_rand(1, 100) <= 35 ? 'ur' : 'en', 'created_by' => $creator->id,
                'notes' => $business ? 'Corporate client. Correspondence through the company secretary.' : null,
            ]);
            if (mt_rand(1, 100) <= 65) {
                $client->forceFill(['whatsapp_consent_at' => $this->now->copy()->subMonths(mt_rand(1, 12)), 'whatsapp' => $client->phone])->save();
            }
            if (! $business && mt_rand(1, 100) <= 30) {
                $user = $this->user($name, AccountType::Client, $client->email);
                $client->update(['user_id' => $user->id, 'email' => $user->email]);
                $this->portalClients[] = ['user' => $user, 'client' => $client, 'lawyer' => $creator];
            }
            $clients[] = $client;
        }

        return $clients;
    }

    /**
     * Cases with full history for one advocate, plus their tasks, expenses, invoices, drafts,
     * diary notes and consultations.
     *
     * @param  list<Client>  $clients
     */
    private function practice(Organization $org, User $lawyer, array $clients, City $city, int $caseCount): void
    {
        auth()->setUser($lawyer);
        $courts = $this->practiceCourts($city);
        $profile = $lawyer->lawyerProfile;

        for ($i = 0; $i < $caseCount; $i++) {
            $client = $clients[mt_rand(0, count($clients) - 1)];
            $spec = $profile->specializations()->inRandomOrder()->first();
            try {
                $this->caseWithHistory($org, $lawyer, $client, $courts, $spec);
            } catch (Throwable $e) {
                $this->command?->warn('Case skipped: '.$e->getMessage());
            }
        }

        $this->appointments($org, $lawyer, $clients);
        $this->at($this->now->copy()->subDays(mt_rand(1, 6)));
        foreach (range(1, mt_rand(1, 3)) as $n) {
            DiaryEntry::query()->create([
                'organization_id' => $org->id, 'user_id' => $lawyer->id, 'entry_date' => $this->now->copy()->addDays(mt_rand(-5, 7))->toDateString(), 'entry_time' => $this->pick(['08:30', '13:00', '16:30']),
                'title' => $this->pick(['Bar council meeting', 'Collect certified copies', 'Meet client at chamber', 'Inspect record at copying agency', 'File vakalatnama', 'Bar association election duty']),
                'notes' => $this->pick(['Carry the case diary and stamp papers.', 'Confirm the time with the munshi.', null]),
            ]);
        }
        $this->at($this->now);
    }

    /** @param Collection<string, Court> $courts */
    private function caseWithHistory(Organization $org, User $lawyer, Client $client, $courts, ?Specialization $spec): void
    {
        $blueprint = $this->caseBlueprint($spec?->slug ?? 'civil-litigation', $client, $org);
        $court = $courts[$blueprint['court']] ?? $courts['civil'];
        $judge = Judge::query()->where('court_id', $court->id)->where('is_active', true)->inRandomOrder()->first();
        $filed = $this->now->copy()->subDays(mt_rand(90, 720))->setTime(10, 0);
        $decided = mt_rand(1, 100) <= 12;
        $year = $filed->year;

        $this->at($filed);
        $case = app(CaseService::class)->create($org, $lawyer, [
            'title' => $blueprint['title'], 'case_type' => $blueprint['type'], 'status' => CaseStatus::Filed->value, 'priority' => $this->pick(['normal', 'normal', 'high', 'low', 'urgent']),
            'court_id' => $court->id, 'district_id' => $court->district_id, 'province_id' => $court->province_id, 'judge_id' => $judge?->id,
            'judge_name' => $judge ? null : $blueprint['bench'], 'courtroom' => (string) mt_rand(1, 24), 'specialization_id' => $spec?->id,
            'case_number' => sprintf($blueprint['number'], mt_rand(11, 4999), $year), 'filing_date' => $filed->toDateString(),
            'description' => $blueprint['description'], 'strategy_notes' => $blueprint['strategy'], 'client_summary' => $blueprint['summary'], 'share_with_client' => true,
            'client_ids' => [$client->id], 'professional_fee' => $blueprint['fee'], 'fee_type' => $this->pick(['fixed', 'installments', 'per_hearing', 'retainer']), 'stage' => $blueprint['stages'][0],
            'parties' => $blueprint['parties'], ...$blueprint['extra'],
        ]);

        // Held hearings with orders, then the next date.
        $hearings = app(HearingService::class);
        $stages = $blueprint['stages'];
        $held = min(count($stages) - 1, mt_rand(2, 5));
        $date = $filed->copy()->addDays(mt_rand(10, 25));
        $first = null;
        $stage = 0;
        for ($h = 0; $h < $held; $h++) {
            if ($date->greaterThanOrEqualTo($this->now->copy()->subDays(4))) {
                break;
            }
            $time = $this->pick(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']);
            $this->at($date->copy()->subDays(mt_rand(5, 12))->setTime(17, 0));
            $hearing = $first ?? $hearings->schedule($case, ['hearing_date' => $date->toDateString(), 'hearing_time' => $time, 'hearing_type' => $blueprint['types'][$stage] ?? 'regular', 'purpose' => $stages[$stage], 'assigned_lawyer_id' => $lawyer->id, 'visible_to_client' => true], $lawyer);
            $next = $date->copy()->addDays(mt_rand(18, 45));
            $isLast = $h === $held - 1 && ! $decided;
            if ($isLast) {
                $next = $this->now->copy()->addDays($this->pick([0, 0, 1, 2, 3, 5, 8, 12, 16, 21, 28]));
            }
            $adjourned = mt_rand(1, 100) <= 30;
            $this->at($date->copy()->setTime(14, 0));
            $result = $hearings->recordOutcome($hearing, [
                'held_on' => $date->toDateString(), 'lawyer_attendance' => 'present', 'client_attendance' => $this->pick(['present', 'present', 'absent', 'not_required']),
                'opposing_counsel_attendance' => $this->pick(['present', 'present', 'absent', 'proxy']),
                'proceedings' => $adjourned ? 'Case called. '.$this->pick(['The presiding officer is on leave.', 'The bar is observing a strike.', 'Counsel for the other side sought time.', 'Police record has not been received.']).' No proceedings taken.' : "{$stages[$stage]} taken up. Counsel for both sides present and heard.",
                'order_passed' => $adjourned ? 'Adjourned. To come up for '.Str::lower($stages[$stage]).' on the next date.' : $this->orderText($stages[$stage], $stages[$stage + 1] ?? 'final arguments'),
                'adjournment_reason' => $adjourned ? $this->pick(['Presiding officer on leave', 'Strike of the bar', 'Time sought by opposite counsel', 'Record not received']) : null,
                'client_note' => $adjourned ? 'The hearing was adjourned without proceedings. Nothing is needed from you before the next date.' : 'The court heard '.Str::lower($stages[$stage]).'. We will keep you posted on the next date.',
                'schedule_next' => ! ($decided && $h === $held - 1), 'next_hearing_date' => $next->toDateString(), 'next_hearing_time' => $time,
                'next_hearing_purpose' => $adjourned ? $stages[$stage] : ($stages[$stage + 1] ?? 'Final arguments'),
            ], $lawyer);
            $first = $result['next'] ?? null;
            $heldOn = $date->copy();
            $date = $next;
            if (! $adjourned) {
                $this->at($heldOn->copy()->setTime(15, 30));
                app(CaseService::class)->update($case->fresh(), ['stage' => $stages[$stage + 1] ?? end($stages), 'status' => $blueprint['statuses'][$stage + 1] ?? CaseStatus::UnderTrial->value]);
                $stage = min($stage + 1, count($stages) - 2);
            }
        }

        if ($first && $first->hearing_date->isToday()) {
            $first->update(['preparation_notes' => $this->pick(['Bring the certified copy of the last order.', 'Witness to be produced; confirm attendance a day before.', 'File the reply with annexures before the court rises.', 'Keep the case law on the point ready.'])]);
        }

        if ($decided) {
            $this->at($date->copy()->setTime(15, 0));
            $case->fresh()->forceFill(['status' => CaseStatus::Decided->value, 'decided_on' => $date->toDateString(), 'outcome' => $this->pick(['allowed', 'allowed', 'dismissed', 'compromised']), 'stage' => 'Judgment announced', 'next_hearing_id' => null, 'next_hearing_at' => null])->save();
        }

        $this->caseExtras($org, $lawyer, $client, $case->fresh(), $filed);
    }

    private function caseExtras(Organization $org, User $lawyer, Client $client, LegalCase $case, Carbon $filed): void
    {
        $this->at($filed->copy()->addDays(2));
        foreach (array_slice([['Obtain certified copy of the last order', 'high'], ['Prepare list of witnesses', 'normal'], ['Draft reply to the application', 'normal'], ['Collect documents from client', 'low'], ['Deposit process fee', 'normal']], mt_rand(0, 2), mt_rand(1, 3)) as [$title, $priority]) {
            $done = mt_rand(1, 100) <= 55;
            $org->tasks()->create(['legal_case_id' => $case->id, 'title' => $title, 'assigned_to' => $lawyer->id, 'due_date' => $this->now->copy()->addDays(mt_rand(-20, 10)), 'priority' => $priority, 'status' => $done ? 'done' : 'open', 'completed_at' => $done ? $this->now->copy()->subDays(mt_rand(1, 20)) : null, 'created_by' => $lawyer->id]);
        }
        $expenses = [['court_fee', 'Court fee stamps', mt_rand(5, 40) * 100], ['photocopy', 'Certified copies of record', mt_rand(3, 15) * 100], ['filing', 'Process and summons fee', mt_rand(2, 6) * 100], ['travel', 'Travel to outstation court', mt_rand(10, 40) * 100]];
        foreach (array_slice($expenses, 0, mt_rand(1, 3)) as [$category, $description, $amount]) {
            $case->expenses()->create(['organization_id' => $org->id, 'category' => $category, 'description' => $description, 'amount' => $amount, 'incurred_on' => $filed->copy()->addDays(mt_rand(1, 60)), 'is_billable' => true, 'recorded_by' => $lawyer->id]);
        }

        if (mt_rand(1, 100) <= 60) {
            $this->at($filed->copy()->addDays(mt_rand(3, 20)));
            $invoices = app(InvoiceService::class);
            $fee = (int) round(((float) $case->professional_fee) * $this->pick([0.3, 0.5, 1.0]));
            $invoice = $invoices->saveDraft($org, $lawyer, ['client_id' => $client->id, 'legal_case_id' => $case->id, 'issue_date' => $this->now->toDateString(), 'due_date' => $this->now->copy()->addDays(15)->toDateString(), 'discount' => 0, 'tax_rate' => 0, 'items' => [
                ['type' => 'fee', 'description' => 'Professional fee, '.Str::lower($case->stage ?: 'case conduct'), 'quantity' => 1, 'unit_price' => max(5000, $fee)],
                ['type' => 'expense', 'description' => 'Court fee and process charges', 'quantity' => 1, 'unit_price' => mt_rand(10, 50) * 100],
            ]]);
            $invoices->issue($invoice);
            $paid = mt_rand(1, 100);
            if ($paid <= 75) {
                $this->at($filed->copy()->addDays(mt_rand(20, 60))->min($this->now->copy()->subDay()));
                $amount = $paid <= 45 ? (float) $invoice->fresh()->total : round((float) $invoice->fresh()->total * 0.5, 2);
                app(PaymentService::class)->recordManual($invoice->fresh(), $lawyer, ['amount' => number_format($amount, 2, '.', ''), 'method' => $this->pick(['bank_transfer', 'cash', 'cheque', 'online']), 'reference' => 'TXN '.mt_rand(100000, 999999), 'paid_on' => Carbon::now()->toDateString(), 'idempotency_key' => (string) Str::uuid()]);
            }
        }

        if ($case->case_type->value === 'criminal' && mt_rand(1, 100) <= 50 && ($template = DocumentTemplate::query()->where('title', 'Post-Arrest Bail Application')->first())) {
            $this->at($filed->copy()->addDay());
            $body = HtmlSanitizer::clean(app(PlaceholderResolver::class)->resolve($template->body, $org, $lawyer, $case, $client));
            $draft = $org->drafts()->create(['title' => 'Bail application, '.$client->name, 'legal_case_id' => $case->id, 'client_id' => $client->id, 'document_template_id' => $template->id, 'language' => 'en', 'body' => $body, 'status' => $this->pick(['draft', 'in_review', 'approved']), 'version' => 1, 'created_by' => $lawyer->id, 'footer_text' => $case->case_number]);
            $draft->versions()->create(['version' => 1, 'body' => $body, 'note' => 'Created from template', 'created_by' => $lawyer->id]);
        }
        $this->at($this->now);
    }

    /** @param list<Client> $clients */
    private function appointments(Organization $org, User $lawyer, array $clients): void
    {
        $profile = $lawyer->lawyerProfile;
        foreach (range(1, mt_rand(2, 5)) as $n) {
            $client = $clients[mt_rand(0, count($clients) - 1)];
            $status = $this->pick(['completed', 'completed', 'confirmed', 'confirmed', 'requested', 'cancelled', 'declined', 'no_show']);
            $past = in_array($status, ['completed', 'no_show'], true);
            $starts = ($past ? $this->now->copy()->subDays(mt_rand(3, 120)) : $this->now->copy()->addDays(mt_rand(0, 14)))->setTime($this->pick([16, 17, 18]), $this->pick([0, 30]));
            $mode = $profile->offers_online && mt_rand(0, 1) ? 'online' : 'in_person';
            $this->at($starts->copy()->subDays(mt_rand(2, 6))->min($this->now->copy()->subHours(mt_rand(1, 48))));
            Appointment::query()->create([
                'organization_id' => $org->id, 'lawyer_id' => $lawyer->id, 'client_id' => $client->id, 'requested_by' => $client->user_id,
                'contact_name' => $client->name, 'contact_phone' => $client->phone, 'contact_email' => $client->email, 'mode' => $mode, 'kind' => 'consultation',
                'starts_at' => $starts, 'ends_at' => $starts->copy()->addMinutes(30), 'status' => $status, 'fee' => $profile->consultation_fee_min,
                'client_message' => $this->pick(['I need advice on a property dispute with my cousins.', 'My brother was arrested last night. We need bail.', 'I want to file for khula and custody of my children.', 'A cheque given to me has bounced twice.', 'Our tenant has not paid rent for eight months.', 'I received a show cause notice from my department.']),
                'lawyer_notes' => $status === 'completed' ? 'Discussed the facts and the documents required. Client to send copies.' : null,
                'meeting_link' => $mode === 'online' && $status === 'confirmed' ? 'https://meet.example.com/'.Str::lower(Str::random(10)) : null,
                'cancellation_reason' => in_array($status, ['cancelled', 'declined'], true) ? $this->pick(['Client could not travel on that day.', 'Not available at that time, please book another slot.', 'Matter falls outside my practice area.']) : null,
            ]);
        }
        $this->at($this->now);
    }

    /** @param list<Client> $clients */
    private function conversations(Organization $org, User $lawyer, array $clients): void
    {
        $messaging = app(MessagingService::class);
        foreach (array_filter($this->portalClients, fn ($p) => $p['client']->organization_id === $org->id) as $entry) {
            $case = $entry['client']->cases()->first();
            $this->at($this->now->copy()->subDays(mt_rand(1, 10))->setTime(18, 0));
            $conversation = $messaging->startFromProfessional($lawyer, $entry['client'], $case, null);
            $messaging->send($conversation, $lawyer, $this->pick(['Your next hearing is fixed. Please be in court by 9:30.', 'Kindly send the original documents to the chamber this week.', 'The order has been passed in your favour. Details are in the portal.']), null);
            $this->at($this->now->copy()->subHours(mt_rand(1, 20)));
            $messaging->send($conversation, $entry['user'], $this->pick(['Thank you, I will be there.', 'Should I bring the original agreement?', 'Jazak Allah, please let me know the fee for the next stage.']), null);
        }
        $this->at($this->now);
    }

    /** Approved reviews from clients with completed consultations; ratings recomputed. */
    private function seedReviews(): void
    {
        $comments = [
            [5, 'Prepared and punctual', 'Explained every step before each hearing and never missed a date. My bail was granted on the second hearing.'],
            [5, 'Honest advice', 'Told me plainly what to expect and what it would cost. The case was settled without unnecessary adjournments.'],
            [4, 'Very knowledgeable', 'Strong command of family law. Replies on WhatsApp could be faster, but the work in court was excellent.'],
            [5, 'Kept me informed', 'Every order was uploaded in the portal the same day. I always knew where my case stood.'],
            [4, 'Good experience', 'Professional chamber and clear fee terms. Recommended for property matters.'],
            [3, 'Competent but busy', 'Good arguments in court, though the junior handled most of my updates.'],
        ];
        foreach ($this->portalClients as $entry) {
            $appointment = Appointment::query()->where('client_id', $entry['client']->id)->where('status', 'completed')->first();
            if (! $appointment || mt_rand(1, 100) > 80) {
                continue;
            }
            $profile = LawyerProfile::query()->where('user_id', $appointment->lawyer_id)->first();
            if (! $profile || Review::query()->where('lawyer_profile_id', $profile->id)->where('user_id', $entry['user']->id)->exists()) {
                continue;
            }
            [$rating, $title, $comment] = $comments[mt_rand(0, count($comments) - 1)];
            $this->at($appointment->starts_at->copy()->addDays(mt_rand(1, 6))->min($this->now->copy()->subHours(2)));
            Review::query()->create(['lawyer_profile_id' => $profile->id, 'user_id' => $entry['user']->id, 'appointment_id' => $appointment->id, 'rating' => $rating, 'title' => $title, 'comment' => $comment, 'status' => 'approved', 'moderated_by' => $this->officer?->id, 'moderated_at' => Carbon::now()->addHour()]);
        }
        $this->at($this->now);
        LawyerProfile::query()->whereHas('reviews', fn ($q) => $q->where('status', 'approved'))->get()->each(function (LawyerProfile $profile): void {
            $approved = $profile->reviews()->where('status', 'approved');
            $profile->forceFill(['rating_average' => round((float) $approved->avg('rating'), 2), 'rating_count' => $approved->count()])->save();
        });
    }

    /**
     * A realistic matter for the specialization.
     *
     * @return array{type: string, court: string, title: string, number: string, bench: string, description: string, strategy: string, summary: string, fee: int, stages: list<string>, types: list<string>, statuses: list<string>, parties: list<array<string, mixed>>, extra: array<string, mixed>}
     */
    private function caseBlueprint(string $spec, Client $client, Organization $org): array
    {
        $province = self::CITIES[$org->city?->slug ?? 'lahore'][0] ?? 'PB';
        $other = $this->personName($province, mt_rand(0, 1) ? 'male' : 'female', false);
        $us = $client->name;
        $ps = 'PS '.$this->pick(['Civil Lines', 'Saddar', 'City', 'Cantt', 'Model Town', 'Gulberg', 'Satellite Town', 'Factory Area', 'Kotwali']);
        $province = ['PB' => 'Province of Punjab', 'SD' => 'Province of Sindh', 'KP' => 'Province of Khyber Pakhtunkhwa', 'BA' => 'Province of Balochistan', 'IS' => 'Federation of Pakistan'][$province];
        $trial = ['Supply of copies under section 265C CrPC', 'Framing of charge', 'Prosecution evidence', 'Statement of accused under section 342 CrPC', 'Final arguments', 'Judgment'];
        $civil = ['Service of defendants', 'Written statement', 'Framing of issues', 'Plaintiff evidence', 'Defendant evidence', 'Final arguments', 'Judgment'];
        $s = fn (array $list) => array_map(fn ($status) => $status->value, $list);
        $civilStatuses = $s([CaseStatus::Filed, CaseStatus::Filed, CaseStatus::UnderTrial, CaseStatus::Evidence, CaseStatus::Evidence, CaseStatus::Arguments, CaseStatus::ReservedForJudgment]);
        $criminalStatuses = $s([CaseStatus::UnderTrial, CaseStatus::UnderTrial, CaseStatus::Evidence, CaseStatus::Evidence, CaseStatus::Arguments, CaseStatus::ReservedForJudgment]);

        $criminal = [
            ['302, 34 PPC', 'qatl i amd (murder) with common intention'], ['324, 337F(i), 148, 149 PPC', 'attempt to commit qatl i amd and rioting'], ['379, 411 PPC', 'theft and receiving stolen property'],
            ['392, 411 PPC', 'robbery'], ['420, 468, 471 PPC', 'cheating and forgery'], ['489F PPC', 'dishonestly issuing a cheque'], ['506, 447, 148 PPC', 'criminal intimidation and trespass'], ['9(c) CNSA 1997', 'possession of narcotics'],
        ];
        [$sections, $offence] = $criminal[mt_rand(0, count($criminal) - 1)];

        return match ($spec) {
            'criminal-law', 'cyber-crime' => mt_rand(0, 1) ? [
                'type' => $spec === 'cyber-crime' ? 'cyber' : 'criminal', 'court' => 'sessions', 'title' => "State vs. {$us} (post arrest bail)", 'number' => 'B.A. %d/%d', 'bench' => 'Additional Sessions Judge',
                'description' => "Post arrest bail in FIR registered at {$ps} for {$offence}. Accused in judicial custody.", 'strategy' => 'Delay in FIR, no recovery attributed, further inquiry under section 497(2) CrPC.',
                'summary' => 'Your bail application is pending before the Sessions Court. We will inform you of each date.', 'fee' => mt_rand(4, 15) * 10000,
                'stages' => ['Notice to complainant', 'Record summoned from police', 'Arguments on bail', 'Order on bail'], 'types' => ['bail', 'bail', 'bail', 'judgment'], 'statuses' => $s([CaseStatus::Filed, CaseStatus::UnderTrial, CaseStatus::Arguments, CaseStatus::ReservedForJudgment]),
                'parties' => [['role' => 'complainant', 'name' => 'The State through '.$other, 'is_our_side' => false], ['role' => 'accused', 'name' => $us, 'is_our_side' => true]],
                'extra' => ['fir_number' => mt_rand(100, 1500).'/'.($this->now->year - mt_rand(0, 1)), 'police_station' => $ps, 'fir_date' => $this->now->copy()->subDays(mt_rand(120, 700))->toDateString(), 'legal_sections' => $sections, 'bail_status' => 'applied'],
            ] : [
                'type' => 'criminal', 'court' => 'sessions', 'title' => "State vs. {$other} (complaint of {$us})", 'number' => 'Sessions Case %d/%d', 'bench' => 'Additional Sessions Judge',
                'description' => "Trial under sections {$sections} arising out of FIR at {$ps}. We represent the complainant.", 'strategy' => 'Ensure attendance of eyewitnesses; oppose adjournments; seek day to day trial.',
                'summary' => 'The trial is in progress. Your evidence as complainant will be recorded when the court calls you.', 'fee' => mt_rand(10, 40) * 10000,
                'stages' => $trial, 'types' => ['preliminary', 'regular', 'evidence', 'evidence', 'arguments', 'judgment'], 'statuses' => $criminalStatuses,
                'parties' => [['role' => 'complainant', 'name' => $us, 'is_our_side' => true], ['role' => 'accused', 'name' => $other, 'is_our_side' => false]],
                'extra' => ['fir_number' => mt_rand(100, 1500).'/'.($this->now->year - mt_rand(1, 2)), 'police_station' => $ps, 'fir_date' => $this->now->copy()->subDays(mt_rand(300, 900))->toDateString(), 'legal_sections' => $sections],
            ],
            'family-law' => [
                'type' => 'family', 'court' => 'family', 'title' => "{$us} vs. {$other} (".$this->pick(['suit for dissolution of marriage by way of khula', 'recovery of maintenance allowance and dower', 'guardianship and custody of minors', 'recovery of dowry articles']).')', 'number' => 'F.S. %d/%d', 'bench' => 'Judge Family Court',
                'description' => 'Family suit under the West Pakistan Family Courts Act 1964. Interim maintenance sought.', 'strategy' => 'Seek interim maintenance at the first hearing; keep reconciliation on record.',
                'summary' => 'The family court has your case. Reconciliation is attempted first, then evidence is recorded.', 'fee' => mt_rand(5, 20) * 10000,
                'stages' => ['Pre trial reconciliation', 'Written statement and interim maintenance', 'Plaintiff evidence', 'Defendant evidence', 'Final arguments', 'Judgment'], 'types' => ['preliminary', 'interim', 'evidence', 'evidence', 'arguments', 'judgment'], 'statuses' => $civilStatuses,
                'parties' => [['role' => 'plaintiff', 'name' => $us, 'is_our_side' => true], ['role' => 'defendant', 'name' => $other, 'is_our_side' => false]], 'extra' => [],
            ],
            'constitutional-law', 'service-matters' => [
                'type' => $spec === 'service-matters' ? 'service' : 'constitutional', 'court' => 'high', 'title' => "{$us} vs. {$province} etc. (writ petition)", 'number' => 'W.P. %d/%d', 'bench' => 'Single Bench',
                'description' => 'Constitutional petition under Article 199 against an order passed without hearing the petitioner.', 'strategy' => 'Seek interim relief suspending the impugned order; rely on Article 10A.',
                'summary' => 'Your writ petition is pending in the High Court. The government has been asked to reply.', 'fee' => mt_rand(10, 35) * 10000,
                'stages' => ['Notice issued', 'Report and parawise comments', 'Arguments', 'Order reserved'], 'types' => ['preliminary', 'regular', 'arguments', 'judgment'], 'statuses' => $s([CaseStatus::Filed, CaseStatus::UnderTrial, CaseStatus::Arguments, CaseStatus::ReservedForJudgment]),
                'parties' => [['role' => 'petitioner', 'name' => $us, 'is_our_side' => true], ['role' => 'respondent', 'name' => $province, 'is_our_side' => false]], 'extra' => ['jurisdiction' => 'writ'],
            ],
            'banking-finance', 'corporate-law' => [
                'type' => $spec === 'corporate-law' ? 'corporate' : 'banking', 'court' => 'civil', 'title' => $this->pick(['Crescent Mercantile Bank Ltd.', 'Ravi Finance Ltd.', 'Mehran Leasing Ltd.']).' vs. '.$us.' (recovery suit)', 'number' => 'C.O.S. %d/%d', 'bench' => 'Judge Banking Court',
                'description' => 'Recovery suit under the Financial Institutions (Recovery of Finances) Ordinance 2001. Leave to defend application filed.', 'strategy' => 'Challenge the statement of account; plead illegal markup.',
                'summary' => 'The bank has filed a recovery suit. We have applied for leave to defend.', 'fee' => mt_rand(20, 60) * 10000,
                'stages' => ['Leave to defend application', 'Arguments on leave', 'Framing of issues', 'Evidence', 'Final arguments'], 'types' => ['regular', 'arguments', 'regular', 'evidence', 'arguments'], 'statuses' => $civilStatuses,
                'parties' => [['role' => 'plaintiff', 'name' => 'Bank (financial institution)', 'is_our_side' => false], ['role' => 'defendant', 'name' => $us, 'is_our_side' => true]], 'extra' => [],
            ],
            'rent-tenancy' => [
                'type' => 'rent', 'court' => 'civil', 'title' => "{$us} vs. {$other} (ejectment petition)", 'number' => 'R.P. %d/%d', 'bench' => 'Rent Controller',
                'description' => 'Ejectment of tenant for default in payment of rent and personal bona fide need.', 'strategy' => 'Seek tentative rent order under the rent law at the first date.',
                'summary' => 'Your ejectment petition is before the Rent Controller.', 'fee' => mt_rand(4, 12) * 10000,
                'stages' => ['Reply of respondent', 'Tentative rent order', 'Evidence', 'Final arguments', 'Order'], 'types' => ['regular', 'interim', 'evidence', 'arguments', 'judgment'], 'statuses' => $civilStatuses,
                'parties' => [['role' => 'petitioner', 'name' => $us, 'is_our_side' => true], ['role' => 'respondent', 'name' => $other, 'is_our_side' => false]], 'extra' => [],
            ],
            default => [
                'type' => match ($spec) {
                    'property-law' => 'property', 'taxation' => 'tax', 'labour-employment' => 'labour', 'consumer-protection' => 'consumer', default => 'civil'
                },
                'court' => 'civil', 'title' => "{$us} vs. {$other} (".$this->pick(['suit for declaration and permanent injunction', 'suit for specific performance of agreement to sell', 'suit for possession through partition', 'suit for recovery of money']).')', 'number' => 'C.S. %d/%d', 'bench' => 'Civil Judge',
                'description' => 'Civil suit with an application for temporary injunction under Order XXXIX Rules 1 and 2 CPC.', 'strategy' => 'Press the injunction application; produce the revenue record (fard) and registered deed.',
                'summary' => 'Your civil suit is pending. The court will record evidence after issues are framed.', 'fee' => mt_rand(5, 25) * 10000,
                'stages' => $civil, 'types' => ['preliminary', 'regular', 'regular', 'evidence', 'evidence', 'arguments', 'judgment'], 'statuses' => $civilStatuses,
                'parties' => [['role' => 'plaintiff', 'name' => $us, 'is_our_side' => true], ['role' => 'defendant', 'name' => $other, 'is_our_side' => false]], 'extra' => [],
            ],
        };
    }

    /** @return Collection<string, Court> */
    private function practiceCourts(City $city)
    {
        static $cache = [];
        if (isset($cache[$city->id])) {
            return $cache[$city->id];
        }
        $district = $city->district;
        $find = fn (string $prefix) => Court::query()->where('district_id', $district->id)->where('name', 'like', $prefix.'%')->whereNull('parent_id')->orderBy('id')->first();
        $province = self::CITIES[$city->slug][0];
        $high = match ($province) {
            'PB' => Court::query()->where('name', 'Lahore High Court — '.$city->name.' Bench')->first() ?? Court::query()->where('slug', 'lahore-high-court')->first(),
            'SD' => Court::query()->where('name', 'Sindh High Court — '.$city->name.' Bench')->first() ?? Court::query()->where('slug', 'sindh-high-court')->first(),
            'KP' => Court::query()->where('name', 'Peshawar High Court — '.$city->name.' Bench')->first() ?? Court::query()->where('slug', 'peshawar-high-court')->first(),
            'BA' => Court::query()->where('slug', 'balochistan-high-court')->first(),
            default => Court::query()->where('slug', 'islamabad-high-court')->first(),
        };
        $civil = $find('Civil Courts');

        return $cache[$city->id] = collect([
            'sessions' => $find('District & Sessions Court') ?? $civil, 'civil' => $civil, 'family' => $find('Family Courts') ?? $civil, 'high' => $high,
        ])->filter();
    }

    private function user(string $name, AccountType $type, ?string $email = null): User
    {
        return User::query()->forceCreate([
            'name' => $name, 'email' => $email && str_ends_with($email, '@'.self::DOMAIN) ? $email : $this->email($name), 'password' => 'password', 'account_type' => $type,
            'phone' => $this->mobile(), 'email_verified_at' => Carbon::now(), 'locale' => mt_rand(1, 100) <= 20 ? 'ur' : 'en', 'last_login_at' => $this->now->copy()->subDays(mt_rand(0, 20)),
        ]);
    }

    private function personName(string $province, string $gender, bool $unique = true): string
    {
        $first = $gender === 'female' ? self::FEMALE : self::MALE;
        $last = self::SURNAMES[$province] ?? self::SURNAMES['PB'];
        for ($try = 0; $try < 50; $try++) {
            $name = $this->pick($first).' '.$this->pick($last);
            if (! $unique || ! isset($this->usedNames[$name])) {
                $this->usedNames[$name] = true;

                return $name;
            }
        }

        return $this->pick($first).' '.$this->pick(self::MALE).' '.$this->pick($last);
    }

    private function businessName(string $province, City $city): string
    {
        $surname = $this->pick(self::SURNAMES[$province] ?? self::SURNAMES['PB']);

        return $this->pick(["{$surname} Textile Mills (Pvt.) Ltd.", "{$surname} Traders", "{$surname} Builders and Developers", "{$surname} Rice Mills", "{$city->name} Cold Storage (Pvt.) Ltd.", "Al {$surname} Enterprises", "{$surname} Pharmaceuticals (Pvt.) Ltd.", "{$surname} Motors"]);
    }

    private function firmName(User $owner, User $partner, City $city): string
    {
        $a = Str::afterLast($owner->name, ' ');
        $b = Str::afterLast($partner->name, ' ');
        $b = $a === $b ? $this->pick(self::SURNAMES['PB']) : $b;
        for ($try = 0; $try < 10; $try++) {
            $name = $this->pick(["{$a} & {$b} Advocates", "{$a} Law Associates", "{$a} & {$b} Legal Consultants", "{$a} Law Chambers", "{$city->name} Legal Partners", "{$a}, {$b} & Co.", "{$a} & Associates"]);
            if (! Organization::query()->where('name', $name)->exists()) {
                return $name;
            }
        }

        return "{$a} & {$b} Associates {$city->name}";
    }

    private function firmDescription(string $name, City $city, User $owner): string
    {
        return "{$name} is a full service law firm based in {$city->name}, founded by {$owner->name}. The firm appears before the district courts, special courts and the High Court in criminal, civil, family, banking and corporate matters, and advises businesses on contracts and compliance. Every client has a named advocate and is kept informed of each date and order.";
    }

    /** @param list<string> $areas */
    private function bio(string $name, City $city, int $years, array $areas, AdvocateCategory $category): string
    {
        $court = $category === AdvocateCategory::SupremeCourt ? 'the Supreme Court, the High Court and the district courts' : ($category === AdvocateCategory::HighCourt ? 'the High Court and the district courts' : 'the district courts');

        return Str::before($name, ' ')." has practised for {$years} years in {$city->name}, appearing before {$court}. Practice areas: ".$this->listText($areas).'. Known for careful preparation of the case file, clear advice on costs and timelines, and keeping clients informed before every hearing.';
    }

    /** @return list<array<string, mixed>> */
    private function experiences(int $since, City $city, string $area): array
    {
        $rows = [['position' => 'Junior advocate', 'organization' => "Chamber of a senior advocate, {$city->name}", 'start_year' => $since, 'end_year' => $since + 2, 'description' => 'Drafting, case diary and appearances on routine dates.']];
        if ((int) $this->now->year - $since > 6) {
            $rows[] = ['position' => $this->pick(['Legal advisor', 'Panel advocate', 'Deputy District Public Prosecutor', 'Associate']), 'organization' => $this->pick(['a commercial bank', 'the Punjab Revenue Authority', 'a housing society', 'a textile group', 'the Office of the Prosecutor General']), 'start_year' => $since + 2, 'end_year' => $since + mt_rand(4, 6), 'description' => 'Handled '.Str::lower($area).' matters and trial work.'];
        }
        $rows[] = ['position' => 'Independent practice', 'organization' => "District Bar Association {$city->name}", 'start_year' => end($rows)['end_year'] ?? $since + 2, 'end_year' => null, 'description' => 'Own chamber with juniors and a clerk.'];

        return $rows;
    }

    private function orderText(string $done, string $next): string
    {
        return $this->pick([
            "{$done} concluded. Adjourned for ".Str::lower($next).'.',
            "Heard. {$done} completed. To come up for ".Str::lower($next).' on the next date.',
            "{$done} recorded. Parties directed to appear for ".Str::lower($next).'.',
        ]);
    }

    private function cnic(string $province, string $gender): string
    {
        $prefix = ['PB' => [35202, 35201, 33100, 36302, 34101, 37405], 'SD' => [42101, 42201, 41303, 45504], 'KP' => [17301, 16101, 13101], 'BA' => [54400, 56302], 'IS' => [61101]][$province];

        return $this->pick($prefix).'-'.mt_rand(1000000, 9999999).'-'.($gender === 'female' ? $this->pick([2, 4, 6, 8]) : $this->pick([1, 3, 5, 7, 9]));
    }

    private function mobile(): string
    {
        return '+923'.$this->pick(['00', '01', '02', '03', '05', '06', '08', '11', '12', '13', '14', '15', '21', '22', '23', '33', '34', '35', '36', '45', '46', '47']).mt_rand(1000000, 9999999);
    }

    private function landline(City $city): string
    {
        return '+92'.self::CITIES[$city->slug][1].mt_rand(3000000, 9999999);
    }

    private function email(string $name): string
    {
        return Str::slug(Str::limit($name, 30, ''), '.').'.'.(++$this->emailSeq).'@'.self::DOMAIN;
    }

    private function chamberAddress(City $city): string
    {
        return $this->pick(['Chamber '.mt_rand(1, 300).', District Courts', 'Office '.mt_rand(1, 40).', Bar Room Building', 'Chamber '.mt_rand(1, 120).', High Court Bar']).", {$city->name}";
    }

    private function officeAddress(City $city): string
    {
        return $this->pick(['Suite '.mt_rand(1, 20).', '.$this->pick(['Mall Road', 'Fane Road', 'Jail Road', 'Shahrah e Faisal', 'Blue Area', 'University Road', 'Saddar Road']), mt_rand(1, 99).' '.$this->pick(['Lower Mall', 'Court Road', 'Club Road', 'Abdullah Haroon Road', 'Jinnah Avenue'])]).", {$city->name}";
    }

    private function homeAddress(City $city): string
    {
        return 'House '.mt_rand(1, 999).', Street '.mt_rand(1, 40).', '.$this->pick(['Model Town', 'Gulberg', 'Satellite Town', 'Johar Town', 'Peoples Colony', 'Cantt', 'Gulshan Colony', 'Old City']).", {$city->name}";
    }

    /** @param list<string> $items */
    private function listText(array $items): string
    {
        return count($items) > 1 ? implode(', ', array_slice($items, 0, -1)).' and '.end($items) : ($items[0] ?? '');
    }

    /**
     * @template T
     *
     * @param  list<T>  $items
     * @return T
     */
    private function pick(array $items): mixed
    {
        return $items[mt_rand(0, count($items) - 1)];
    }

    private function at(Carbon $moment): void
    {
        Carbon::setTestNow($moment->copy());
    }
}
