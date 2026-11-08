<?php

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\AdvocateCategory;
use App\Enums\CaseStatus;
use App\Enums\CaseType;
use App\Enums\HearingType;
use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Enums\PlatformRole;
use App\Enums\VerificationStatus;
use App\Events\HearingChanged;
use App\Models\BarCouncil;
use App\Models\City;
use App\Models\Client;
use App\Models\ContactMessage;
use App\Models\Court;
use App\Models\DocumentTemplate;
use App\Models\Judge;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\Setting;
use App\Models\Specialization;
use App\Models\User;
use App\Notifications\HearingReminder;
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
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * Local development and product-capture data only (never runs outside APP_ENV=local).
 * Every person and matter here is a sample. Judges are court designations,
 * never personal names. All demo accounts use the password "password".
 */
class DemoSeeder extends Seeder
{
    private User $ayesha;

    private Organization $practice;

    public function run(): void
    {
        if (User::query()->where('email', 'admin@wakeel.test')->exists()) {
            return;
        }

        Event::fake([HearingChanged::class]);
        config(['queue.default' => 'sync']);

        $make = fn (string $name, string $email, AccountType $type, ?string $phone = null) => User::query()->forceCreate([
            'name' => $name, 'email' => $email, 'password' => 'password', 'account_type' => $type, 'phone' => $phone,
            'email_verified_at' => now(), 'locale' => 'en',
        ]);

        $make('Platform Admin', 'admin@wakeel.test', AccountType::Platform)->assignRole(PlatformRole::SuperAdmin->value);
        $officer = $make('Verification Officer', 'verifier@wakeel.test', AccountType::Platform);
        $officer->assignRole(PlatformRole::VerificationOfficer->value);

        $provisioner = app(OrganizationProvisioner::class);
        $profiles = app(LawyerProfileService::class);
        $lahore = City::query()->where('slug', 'lahore')->firstOrFail();
        $punjab = BarCouncil::query()->where('code', 'PUNBC')->value('id');
        $spec = fn (string $slug) => Specialization::query()->where('slug', $slug)->value('id');

        // Courts and judges (designations, not people).
        $court = fn (string $slug) => Court::query()->where('slug', $slug)->firstOrFail();
        $sessions = $court('district-sessions-court-lahore');
        $family = $court('family-courts-lahore');
        $civil = $court('civil-courts-lahore');
        $lhc = $court('lahore-high-court');
        $banking = $court('banking-court-lahore');
        $judge = fn (Court $c, string $name, string $room) => Judge::query()->create(['court_id' => $c->id, 'name' => $name, 'designation' => null, 'courtroom' => $room, 'is_active' => true]);
        $ajs = $judge($sessions, 'Additional Sessions Judge III', '14');
        $fcj = $judge($family, 'Judge Family Court VII', '7');
        $cj = $judge($civil, 'Senior Civil Judge (Civil Division)', '3');
        $bench = $judge($lhc, 'Single Bench, Court 18', '18');
        $bj = $judge($banking, 'Judge Banking Court II', '2');

        // The solo advocate whose diary the captures show.
        $this->ayesha = $make('Ayesha Siddiqui', 'ayesha@wakeel.test', AccountType::Lawyer, '+923001234567');
        $profile = $profiles->createFor($this->ayesha);
        $profile->fill([
            'title' => 'Advocate', 'bar_council_id' => $punjab, 'enrollment_number' => 'LHR-DEMO-1042', 'cnic' => '35202-0000000-1',
            'advocate_category' => AdvocateCategory::HighCourt, 'practice_since' => 2012, 'headline' => 'Advocate High Court, criminal and family litigation',
            'bio' => 'Sample profile. Practises before the Lahore High Court and the district courts of Lahore.',
            'province_id' => $lahore->district->province_id, 'district_id' => $lahore->district_id, 'city_id' => $lahore->id,
            'chamber_address' => 'Chamber 12, Lahore High Court Bar, Lahore', 'consultation_fee_min' => 3000, 'consultation_fee_max' => 10000,
            'offers_online' => true, 'offers_in_person' => true, 'accepting_clients' => true, 'is_public' => true, 'onboarding_step' => 6,
        ])->save();
        $profile->forceFill(['onboarding_completed_at' => now()])->save();
        $profile->specializations()->sync([$spec('criminal-law') => ['is_primary' => true], $spec('family-law') => ['is_primary' => false], $spec('constitutional-law') => ['is_primary' => false]]);
        $profile->courts()->sync([$sessions->id, $family->id, $lhc->id]);
        $profile->languages()->createMany([['language' => 'English'], ['language' => 'Urdu'], ['language' => 'Punjabi']]);
        $profile->educations()->createMany([['degree' => 'LL.B. (Hons)', 'institution' => 'University of the Punjab', 'year' => 2011]]);
        $this->practice = $provisioner->createSoloPractice($this->ayesha);
        $this->practice->update(['address' => 'Chamber 12, Lahore High Court Bar, Lahore', 'phone' => '+923001234567', 'city_id' => $lahore->id]);

        $verification = app(VerificationService::class);
        $request = $profile->verificationRequests()->create(['status' => VerificationStatus::Submitted, 'submitted_at' => now()->subDays(20)]);
        $verification->transition($request, VerificationStatus::Approved, $officer, 'Bar license checked against the Punjab Bar Council roll.');

        // Firm with team members and a pending verification for the admin queue.
        $owner = $make('Bilal Chaudhry', 'firm@wakeel.test', AccountType::Lawyer, '+923211234567');
        $ownerProfile = $profiles->createFor($owner);
        $ownerProfile->update(['bar_council_id' => $punjab, 'enrollment_number' => 'LHR-DEMO-0877', 'advocate_category' => AdvocateCategory::SupremeCourt, 'practice_since' => 2004, 'is_public' => true, 'city_id' => $lahore->id, 'headline' => 'Advocate Supreme Court, banking and corporate disputes']);
        $ownerProfile->specializations()->sync([$spec('banking-finance') => ['is_primary' => true], $spec('corporate-law') => ['is_primary' => false]]);
        $pending = $ownerProfile->verificationRequests()->create(['status' => VerificationStatus::Submitted, 'submitted_at' => now()->subDay()]);
        $pending->events()->create(['actor_id' => $owner->id, 'from_status' => 'unverified', 'to_status' => 'submitted']);
        $ownerProfile->forceFill(['verification_status' => VerificationStatus::Submitted])->save();
        $firm = $provisioner->create($owner, OrganizationType::Firm, 'Chaudhry & Associates', ['is_public' => true, 'city_id' => $lahore->id, 'description' => 'Sample law firm for local development.']);
        $associate = $make('Hamza Qureshi', 'associate@wakeel.test', AccountType::Lawyer);
        $profiles->createFor($associate);
        $provisioner->addMember($firm, $associate, OrgRole::AssociateAdvocate, $owner);
        $provisioner->addMember($firm, $make('Imran (clerk)', 'clerk@wakeel.test', AccountType::Staff), OrgRole::Clerk, $owner);

        // Clients (samples).
        $clientUser = $make('Sana Malik', 'client@wakeel.test', AccountType::Client, '+923331234567');
        $client = fn (string $name, array $extra = []) => $this->practice->clients()->create([...['type' => 'individual', 'name' => $name, 'city_id' => $lahore->id, 'created_by' => $this->ayesha->id, 'preferred_locale' => 'en'], ...$extra]);
        $sana = $client('Sana Malik', ['phone' => '+923331234567', 'email' => 'client@wakeel.test', 'user_id' => $clientUser->id]);
        $sana->forceFill(['whatsapp_consent_at' => now()->subMonths(2)])->save();
        $rashid = $client('Rashid Ahmed', ['phone' => '+923451112233', 'preferred_locale' => 'ur']);
        $traders = $client('Example Traders (Pvt.) Ltd.', ['type' => 'business', 'company_name' => 'Example Traders (Pvt.) Ltd.', 'phone' => '+923004445566']);
        $nadia = $client('Nadia Hussain', ['phone' => '+923215556677']);
        $farooq = $client('Farooq Anwar', ['phone' => '+923007778899']);

        auth()->setUser($this->ayesha);
        $cases = app(CaseService::class);
        $hearings = app(HearingService::class);
        $new = fn (array $data) => $cases->create($this->practice, $this->ayesha, $data);

        $bail = $new(['title' => 'State vs. Rashid Ahmed (post-arrest bail)', 'case_type' => CaseType::Criminal->value, 'status' => CaseStatus::UnderTrial->value, 'priority' => 'high', 'court_id' => $sessions->id, 'judge_id' => $ajs->id, 'courtroom' => '14', 'specialization_id' => $spec('criminal-law'), 'case_number' => 'B.A. 1874/2026', 'fir_number' => '512/2026', 'police_station' => 'PS Gulberg', 'fir_date' => today()->subDays(40)->toDateString(), 'legal_sections' => '379, 411 PPC', 'bail_status' => 'applied', 'client_ids' => [$rashid->id], 'professional_fee' => 80000, 'fee_type' => 'installments', 'stage' => 'Arguments on bail',
            'parties' => [['role' => 'complainant', 'name' => 'The State', 'is_our_side' => false], ['role' => 'accused', 'name' => 'Rashid Ahmed', 'is_our_side' => true]]]);
        $khula = $new(['title' => 'Sana Malik vs. Kamran Javed (khula and maintenance)', 'case_type' => CaseType::Family->value, 'status' => CaseStatus::Evidence->value, 'priority' => 'normal', 'court_id' => $family->id, 'judge_id' => $fcj->id, 'courtroom' => '7', 'specialization_id' => $spec('family-law'), 'case_number' => 'F.C. 1187/2026', 'client_ids' => [$sana->id], 'professional_fee' => 120000, 'fee_type' => 'fixed', 'stage' => 'Respondent evidence',
            'client_summary' => 'Evidence stage. Your statement has been recorded; the respondent’s evidence is next.',
            'parties' => [['role' => 'plaintiff', 'name' => 'Sana Malik', 'is_our_side' => true], ['role' => 'defendant', 'name' => 'Kamran Javed', 'is_our_side' => false]]]);
        $recovery = $new(['title' => 'Example Bank Ltd. vs. Example Traders (recovery)', 'case_type' => CaseType::Banking->value, 'status' => CaseStatus::Arguments->value, 'priority' => 'normal', 'court_id' => $banking->id, 'judge_id' => $bj->id, 'courtroom' => '2', 'specialization_id' => $spec('banking-finance'), 'case_number' => 'C.O.S. 92/2025', 'client_ids' => [$traders->id], 'professional_fee' => 250000, 'fee_type' => 'retainer', 'stage' => 'Leave to defend',
            'parties' => [['role' => 'plaintiff', 'name' => 'Example Bank Ltd.', 'is_our_side' => false], ['role' => 'defendant', 'name' => 'Example Traders (Pvt.) Ltd.', 'is_our_side' => true]]]);
        $writ = $new(['title' => 'Nadia Hussain vs. Province of Punjab (service writ)', 'case_type' => CaseType::Constitutional->value, 'status' => CaseStatus::Filed->value, 'priority' => 'urgent', 'court_id' => $lhc->id, 'judge_id' => $bench->id, 'courtroom' => '18', 'jurisdiction' => 'writ', 'specialization_id' => $spec('constitutional-law'), 'case_number' => 'W.P. 40211/2026', 'client_ids' => [$nadia->id], 'professional_fee' => 150000, 'fee_type' => 'fixed', 'stage' => 'Notice issued',
            'parties' => [['role' => 'petitioner', 'name' => 'Nadia Hussain', 'is_our_side' => true], ['role' => 'respondent', 'name' => 'Province of Punjab', 'is_our_side' => false]]]);
        $rent = $new(['title' => 'Farooq Anwar vs. tenant (ejectment petition)', 'case_type' => CaseType::Rent->value, 'status' => CaseStatus::UnderTrial->value, 'priority' => 'normal', 'court_id' => $civil->id, 'judge_id' => $cj->id, 'courtroom' => '3', 'specialization_id' => $spec('rent-tenancy'), 'case_number' => 'R.P. 311/2026', 'client_ids' => [$farooq->id], 'professional_fee' => 60000, 'fee_type' => 'per_hearing', 'stage' => 'Framing of issues',
            'parties' => [['role' => 'petitioner', 'name' => 'Farooq Anwar', 'is_our_side' => true], ['role' => 'respondent', 'name' => 'Tenant (sample)', 'is_our_side' => false]]]);

        // History with orders, then today's and this week's cause list.
        $held = function (LegalCase $case, int $daysAgo, string $time, string $type, string $purpose, array $outcome, ?int $nextIn = null, ?string $nextPurpose = null) use ($hearings) {
            $h = $hearings->schedule($case, ['hearing_date' => today()->subDays($daysAgo)->toDateString(), 'hearing_time' => $time, 'hearing_type' => $type, 'purpose' => $purpose, 'assigned_lawyer_id' => $this->ayesha->id, 'visible_to_client' => true], $this->ayesha);
            $hearings->recordOutcome($h, [...['held_on' => today()->subDays($daysAgo)->toDateString(), 'lawyer_attendance' => 'present'], ...$outcome, ...($nextIn !== null ? ['schedule_next' => true, 'next_hearing_date' => today()->addDays($nextIn)->toDateString(), 'next_hearing_time' => $time, 'next_hearing_purpose' => $nextPurpose] : [])], $this->ayesha);
        };
        $held($khula, 42, '10:00', HearingType::Preliminary->value, 'Pre-trial reconciliation', ['client_attendance' => 'present', 'proceedings' => 'Reconciliation failed. Issues framed.', 'order_passed' => 'Reconciliation failed; case fixed for plaintiff evidence.', 'client_note' => 'Reconciliation did not succeed. Your evidence is next.']);
        $held($khula, 14, '10:00', HearingType::Evidence->value, 'Plaintiff evidence', ['client_attendance' => 'present', 'proceedings' => 'Plaintiff examined in chief; cross-examination concluded.', 'order_passed' => 'Plaintiff evidence closed. Adjourned for respondent evidence.', 'client_note' => 'Your statement was recorded and cross-examination is complete.'], 3, 'Respondent evidence');
        $held($bail, 6, '09:30', HearingType::Bail->value, 'Notice to complainant', ['proceedings' => 'Notice issued to complainant; record summoned from PS Gulberg.', 'order_passed' => 'Notice to complainant for the next date. Police to produce record.', 'adjournment_reason' => 'Record not produced'], 0, 'Arguments on post-arrest bail');
        $held($recovery, 21, '11:00', HearingType::Arguments->value, 'Leave to defend application', ['proceedings' => 'Arguments on leave application heard in part.', 'order_passed' => 'Part-heard. Adjourned for remaining arguments.', 'adjournment_reason' => 'Part-heard'], 0, 'Remaining arguments on leave');
        $hearings->schedule($writ, ['hearing_date' => today()->toDateString(), 'hearing_time' => '13:15', 'hearing_type' => HearingType::Preliminary->value, 'purpose' => 'Report and parawise comments', 'assigned_lawyer_id' => $this->ayesha->id, 'preparation_notes' => 'File the service record annexures before the bench rises.'], $this->ayesha);
        $hearings->schedule($rent, ['hearing_date' => today()->addDays(2)->toDateString(), 'hearing_time' => '09:00', 'hearing_type' => HearingType::Regular->value, 'purpose' => 'Framing of issues', 'assigned_lawyer_id' => $this->ayesha->id], $this->ayesha);
        $hearings->schedule($recovery, ['hearing_date' => today()->addDays(9)->toDateString(), 'hearing_time' => '11:00', 'hearing_type' => HearingType::Arguments->value, 'purpose' => 'Final arguments', 'assigned_lawyer_id' => $this->ayesha->id], $this->ayesha);

        // Preparation notes on today's bail hearing.
        $bail->hearings()->where('status', 'scheduled')->update(['preparation_notes' => 'Bring certified copy of the FIR and the medical report.']);

        // Tasks and expenses.
        foreach ([[$bail, 'Obtain certified copy of FIR', 0, 'high'], [$writ, 'Prepare annexures A to F', 0, 'urgent'], [$khula, 'Prepare cross-examination of respondent', 2, 'normal'], [$rent, 'Draft issues for framing', 1, 'normal']] as [$case, $title, $due, $priority]) {
            $this->practice->tasks()->create(['legal_case_id' => $case->id, 'title' => $title, 'assigned_to' => $this->ayesha->id, 'due_date' => today()->addDays($due), 'priority' => $priority, 'status' => 'open', 'created_by' => $this->ayesha->id]);
        }
        $khula->expenses()->create(['organization_id' => $this->practice->id, 'category' => 'court_fee', 'description' => 'Court fee stamps', 'amount' => 1500, 'incurred_on' => today()->subDays(40), 'is_billable' => true, 'recorded_by' => $this->ayesha->id]);
        $khula->expenses()->create(['organization_id' => $this->practice->id, 'category' => 'photocopy', 'description' => 'Certified copies of nikahnama', 'amount' => 800, 'incurred_on' => today()->subDays(30), 'is_billable' => true, 'recorded_by' => $this->ayesha->id]);

        // An invoice with a part payment, receipt issued.
        $invoices = app(InvoiceService::class);
        $invoice = $invoices->saveDraft($this->practice, $this->ayesha, ['client_id' => $sana->id, 'legal_case_id' => $khula->id, 'issue_date' => today()->subDays(30)->toDateString(), 'due_date' => today()->addDays(15)->toDateString(), 'discount' => 0, 'tax_rate' => 0, 'items' => [
            ['type' => 'fee', 'description' => 'Professional fee, family suit (first instalment)', 'quantity' => 1, 'unit_price' => 60000],
            ['type' => 'expense', 'description' => 'Court fee stamps', 'quantity' => 1, 'unit_price' => 1500],
        ]]);
        $invoices->issue($invoice);
        app(PaymentService::class)->recordManual($invoice, $this->ayesha, ['amount' => '40000.00', 'method' => 'bank_transfer', 'reference' => 'IBFT-SAMPLE-01', 'paid_on' => today()->subDays(20)->toDateString(), 'idempotency_key' => (string) Str::uuid()]);

        // A bail application draft from the template library.
        $template = DocumentTemplate::query()->where('title', 'Post-Arrest Bail Application')->first();
        if ($template) {
            $body = HtmlSanitizer::clean(app(PlaceholderResolver::class)->resolve($template->body, $this->practice, $this->ayesha, $bail, $rashid));
            $draft = $this->practice->drafts()->create(['title' => 'Post-arrest bail application, Rashid Ahmed', 'legal_case_id' => $bail->id, 'client_id' => $rashid->id, 'document_template_id' => $template->id, 'language' => 'en', 'body' => $body, 'status' => 'in_review', 'version' => 2, 'created_by' => $this->ayesha->id, 'footer_text' => 'B.A. 1874/2026']);
            $draft->versions()->create(['version' => 1, 'body' => $body, 'note' => 'Created from template', 'created_by' => $this->ayesha->id]);
            $draft->versions()->create(['version' => 2, 'body' => $body, 'note' => 'Grounds tightened', 'created_by' => $this->ayesha->id]);
        }

        // Availability, a consultation request, a message thread, a reminder notification.
        foreach ([1, 2, 3, 4] as $weekday) {
            $this->ayesha->availabilitySlots()->create(['weekday' => $weekday, 'starts_at' => '17:00', 'ends_at' => '19:00', 'mode' => 'both']);
        }
        $this->practice->appointments()->create(['lawyer_id' => $this->ayesha->id, 'client_id' => $farooq->id, 'contact_name' => 'Farooq Anwar', 'contact_phone' => '+923007778899', 'mode' => 'in_person', 'kind' => 'consultation', 'starts_at' => today()->addDays(1)->setTime(17, 30), 'ends_at' => today()->addDays(1)->setTime(18, 0), 'status' => 'requested', 'client_message' => 'Tenant has not paid rent for six months.', 'fee' => 3000]);
        $conversation = app(MessagingService::class)->startFromProfessional($this->ayesha, $sana, $khula, null);
        app(MessagingService::class)->send($conversation, $this->ayesha, 'Your next hearing is fixed for respondent evidence. Please be in court by 9:45.', null);
        app(MessagingService::class)->send($conversation, $clientUser, 'Thank you. Should I bring the original nikahnama?', null);
        $next = $khula->fresh()->nextHearing;
        if ($next) {
            $this->ayesha->notifyNow(new HearingReminder($next, 3), ['database']);
            $clientUser->notifyNow(new HearingReminder($next, 3, true, $sana->id), ['database']);
        }

        $this->seedFirmActivity($firm, $owner, $associate, $banking, $bj, $spec('banking-finance'));
        $this->seedSupportAndPlatform($clientUser);

        auth()->logout();
    }

    /** A colleague's work so the firm activity feed and header bell read like a real team. */
    private function seedFirmActivity(Organization $firm, User $owner, User $associate, Court $banking, Judge $judge, ?int $specialization): void
    {
        auth()->setUser($associate);
        $firmClient = Client::query()->create(['organization_id' => $firm->id, 'type' => 'company', 'name' => 'Example Textiles (Pvt.) Ltd.', 'company_name' => 'Example Textiles (Pvt.) Ltd.', 'email' => 'legal@example.com', 'phone' => '+924235550101', 'created_by' => $associate->id]);

        auth()->setUser($associate);
        $case = app(CaseService::class)->create($firm, $associate, [
            'title' => 'Example Textiles vs. Example Finance (recovery suit)', 'case_type' => CaseType::Banking->value, 'status' => CaseStatus::Filed->value, 'priority' => 'normal',
            'court_id' => $banking->id, 'judge_id' => $judge->id, 'courtroom' => '2', 'specialization_id' => $specialization, 'case_number' => 'C.O.S. 118/2026',
            'client_ids' => [$firmClient->id], 'professional_fee' => 300000, 'fee_type' => 'retainer', 'stage' => 'Summons issued',
            'parties' => [['role' => 'plaintiff', 'name' => 'Example Textiles (Pvt.) Ltd.', 'is_our_side' => true], ['role' => 'defendant', 'name' => 'Example Finance Ltd.', 'is_our_side' => false]],
        ]);
        app(HearingService::class)->schedule($case, ['hearing_date' => today()->addDays(9)->toDateString(), 'hearing_time' => '11:30', 'hearing_type' => HearingType::Preliminary->value, 'purpose' => 'Service of summons', 'assigned_lawyer_id' => $associate->id, 'visible_to_client' => true], $associate);

        auth()->setUser($owner);
        $firm->tasks()->create(['legal_case_id' => $case->id, 'title' => 'Review plaint annexures', 'assigned_to' => $associate->id, 'due_date' => today()->addDays(2), 'priority' => 'high', 'status' => 'open', 'created_by' => $owner->id]);
    }

    /** Feedback inbox, a custom platform role, footer social links and mail settings to look at. */
    private function seedSupportAndPlatform(User $clientUser): void
    {
        auth()->logout();
        $inbox = [
            ['feedback', $clientUser, 'problem', 'Next hearing time not showing on my phone', 'On my phone the hearing card cuts off the time. It shows fine on the laptop.', 'new'],
            ['feedback', $this->ayesha, 'suggestion', 'Print the cause list in Urdu', 'Our munshi prefers the printed cause list in Urdu. Could the PDF follow the language setting?', 'in_progress'],
            ['contact', null, null, 'Onboarding our chambers', 'We are five advocates in Multan and would like a demo of the firm plan.', 'new'],
            ['contact', null, null, 'Verification timeline', 'How long does Bar enrollment verification usually take?', 'resolved'],
        ];
        foreach ($inbox as $i => [$kind, $user, $category, $subject, $body, $status]) {
            $message = ContactMessage::query()->create([
                'kind' => $kind, 'user_id' => $user?->id, 'account_type' => $user?->account_type->value,
                'name' => $user?->name ?? ['Usman Tariq', 'Mehwish Khan'][$i - 2], 'email' => $user?->email ?? ['usman@example.com', 'mehwish@example.com'][$i - 2],
                'phone' => $user?->phone, 'subject' => $subject, 'category' => $category, 'body' => $body, 'status' => $status,
                'handled_at' => $status === 'resolved' ? now()->subDay() : null,
            ]);
            $message->forceFill(['reference' => sprintf('%s-%s-%05d', $kind === 'feedback' ? 'FB' : 'CT', now()->year, $message->id), 'created_at' => now()->subHours(30 - $i * 6)])->save();
        }

        Role::findOrCreate('content-editor', 'web')->syncPermissions(['content.moderate', 'templates.manage']);

        foreach ([
            'social_facebook' => 'https://www.facebook.com/',
            'social_instagram' => 'https://www.instagram.com/',
            'social_youtube' => 'https://www.youtube.com/',
            'social_linkedin' => 'https://www.linkedin.com/',
            'mail_from_name' => 'WakeelDiary',
        ] as $key => $value) {
            Setting::put($key, $value);
        }
    }
}
