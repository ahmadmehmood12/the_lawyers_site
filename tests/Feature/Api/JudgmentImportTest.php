<?php

namespace Tests\Feature\Api;

use App\Models\ReportedJudgment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JudgmentImportTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'test-scraper-token';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.judgments.import_token' => self::TOKEN]);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return [
            'court' => 'LHC',
            'case_type' => 'Writ Petition-Civil Proceedings-Rent',
            'case_number' => '6712-26',
            'title' => 'HABIB ULLAH VS ADJ ETC',
            'judges' => 'Mr. Justice Syed Ahsan Raza Kazmi',
            'citation' => null,
            'tag_line' => 'The mere fact that the ownership of a property vests in a Waqf estate.',
            'decision_date' => null,
            'uploaded_on' => '2026-11-13',
            'pdf_path' => 'https://sys.lhc.gov.pk/appjudgments/2026LHC8777.pdf',
            'source_url' => 'https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting',
            'slug' => null,
            'is_published' => true,
            ...$overrides,
        ];
    }

    private function import(array $overrides = [])
    {
        return $this->withToken(self::TOKEN)->postJson(route('api.judgments.import'), $this->payload($overrides));
    }

    public function test_import_stores_judgment_metadata_with_a_unique_slug(): void
    {
        $this->import()->assertCreated()->assertJsonPath('status', 'imported');

        $judgment = ReportedJudgment::query()->sole();

        $this->assertSame('lhc', $judgment->court);
        $this->assertSame('Writ Petition-Civil Proceedings-Rent', $judgment->case_type);
        $this->assertSame('6712-26', $judgment->case_number);
        $this->assertSame('HABIB ULLAH VS ADJ ETC', $judgment->title);
        $this->assertSame('Mr. Justice Syed Ahsan Raza Kazmi', $judgment->judges);
        $this->assertSame('2026-11-13', $judgment->uploaded_on->toDateString());
        $this->assertNull($judgment->decision_date);
        $this->assertSame('https://sys.lhc.gov.pk/appjudgments/2026LHC8777.pdf', $judgment->pdf_path);
        $this->assertStringStartsWith('https://data.lhc.gov.pk/', $judgment->source_url);
        $this->assertTrue($judgment->is_published);
        $this->assertSame(0, $judgment->views);
        $this->assertNotSame('', $judgment->slug);
    }

    public function test_decision_date_from_the_scraper_is_ignored_for_now(): void
    {
        $this->import(['decision_date' => '2026-11-01'])->assertCreated();

        $this->assertNull(ReportedJudgment::query()->sole()->decision_date);
    }

    public function test_missing_or_wrong_token_is_rejected(): void
    {
        $this->postJson(route('api.judgments.import'), $this->payload())->assertUnauthorized();
        $this->withToken('wrong-token')->postJson(route('api.judgments.import'), $this->payload())->assertUnauthorized();

        $this->assertDatabaseCount('reported_judgments', 0);
    }

    public function test_blank_configured_token_closes_the_endpoint(): void
    {
        config(['services.judgments.import_token' => '']);

        $this->withToken('anything')->postJson(route('api.judgments.import'), $this->payload())->assertUnauthorized();
    }

    public function test_same_pdf_url_is_reported_as_a_duplicate(): void
    {
        $this->import()->assertCreated();

        $this->import([
            'case_number' => '9999-26',
            'title' => 'DIFFERENT TITLE VS STATE',
            'slug' => 'different-title',
        ])->assertOk()->assertJsonPath('status', 'duplicate');

        $this->assertDatabaseCount('reported_judgments', 1);
    }

    public function test_same_case_details_with_different_separators_or_punctuation_are_a_duplicate(): void
    {
        $this->import()->assertCreated();

        $this->import([
            'case_number' => '6712/26',
            'title' => 'Habib Ullah Vs ADJ etc.',
            'pdf_path' => 'https://sys.lhc.gov.pk/appjudgments/2026LHC9999.pdf',
        ])->assertOk()->assertJsonPath('status', 'duplicate');

        $this->assertDatabaseCount('reported_judgments', 1);
    }

    public function test_duplicate_backfills_an_empty_pdf_url_but_keeps_admin_values(): void
    {
        $judgment = ReportedJudgment::query()->create([
            'court' => 'lhc',
            'case_type' => 'Writ Petition, Civil Proceedings, Rent',
            'case_number' => '6712/26',
            'title' => 'Habib Ullah Vs ADJ etc.',
            'judges' => 'Mr. Justice Syed Ahsan Raza Kazmi',
            'uploaded_on' => '2026-11-13',
            'pdf_path' => null,
            'source_url' => null,
            'slug' => 'existing-judgment',
        ]);

        $this->import()->assertOk()
            ->assertJsonPath('status', 'duplicate')
            ->assertJsonPath('backfilled', true);

        $judgment->refresh();
        $this->assertSame('https://sys.lhc.gov.pk/appjudgments/2026LHC8777.pdf', $judgment->pdf_path);
        $this->assertSame('existing-judgment', $judgment->slug);
        $this->assertSame('Writ Petition, Civil Proceedings, Rent', $judgment->case_type);
        $this->assertDatabaseCount('reported_judgments', 1);
    }

    public function test_duplicate_does_not_overwrite_an_admin_uploaded_pdf_path(): void
    {
        $judgment = ReportedJudgment::query()->create([
            'court' => 'lhc',
            'case_type' => 'Writ Petition-Civil Proceedings-Rent',
            'case_number' => '6712-26',
            'title' => 'HABIB ULLAH VS ADJ ETC',
            'judges' => 'Mr. Justice Syed Ahsan Raza Kazmi',
            'uploaded_on' => '2026-11-13',
            'pdf_path' => 'judgments/admin-upload.pdf',
            'slug' => 'admin-upload',
        ]);

        $this->import()->assertOk()->assertJsonPath('status', 'duplicate');

        $this->assertSame('judgments/admin-upload.pdf', $judgment->fresh()->pdf_path);
    }

    public function test_slug_collisions_are_made_unique(): void
    {
        $this->import(['slug' => 'same-slug'])->assertCreated();
        $this->import([
            'case_number' => '7000-26',
            'title' => 'ANOTHER PARTY VS STATE',
            'pdf_path' => 'https://sys.lhc.gov.pk/appjudgments/2026LHC7000.pdf',
            'slug' => 'same-slug',
        ])->assertCreated();

        $slugs = ReportedJudgment::query()->orderBy('id')->pluck('slug')->all();

        $this->assertSame(['same-slug', 'same-slug-2'], $slugs);
    }

    public function test_invalid_payload_is_rejected(): void
    {
        $this->withToken(self::TOKEN)->postJson(route('api.judgments.import'), [
            'court' => 'lhc',
            'case_type' => '',
            'case_number' => '',
            'title' => '',
            'judges' => '',
            'uploaded_on' => '13-11-2026',
            'pdf_path' => 'not-a-url',
            'source_url' => 'not-a-url',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'case_type', 'case_number', 'title', 'judges', 'uploaded_on', 'pdf_path', 'source_url',
        ]);

        $this->assertDatabaseCount('reported_judgments', 0);
    }
}
