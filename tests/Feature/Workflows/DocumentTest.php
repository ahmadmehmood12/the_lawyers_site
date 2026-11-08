<?php

namespace Tests\Feature\Workflows;

use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Models\Client;
use App\Models\Document;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentTest extends TestCase
{
    use RefreshDatabase;

    private User $lawyer;

    private LegalCase $case;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->lawyer = $this->lawyer(OrganizationType::Firm);
        $this->case = LegalCase::factory()->create(['organization_id' => $this->org($this->lawyer)->id]);
        $this->actingAs($this->lawyer);
    }

    private function upload(array $extra = [], ?UploadedFile $file = null)
    {
        return $this->post(route('documents.store'), ['file' => $file ?? UploadedFile::fake()->create('plaint.pdf', 120, 'application/pdf'), 'title' => 'Plaint', 'category' => 'pleading', 'legal_case_id' => $this->case->id, ...$extra]);
    }

    public function test_upload_is_private_versioned_and_logged(): void
    {
        $this->upload()->assertSessionHasNoErrors();
        $document = Document::query()->sole();
        $version = $document->currentVersion;

        Storage::disk('local')->assertExists($version->path);
        $this->assertStringStartsWith('documents/'.$document->organization_id.'/', $version->path);
        $this->assertSame(1, $version->version);

        $this->post(route('documents.versions.store', $document), ['file' => UploadedFile::fake()->create('plaint-v2.pdf', 90, 'application/pdf'), 'note' => 'Corrected'])->assertSessionHasNoErrors();
        $this->assertSame(2, $document->fresh()->currentVersion->version);
        $this->get(route('documents.download', $document))->assertOk();
        $this->assertDatabaseHas('document_access_logs', ['document_id' => $document->id, 'action' => 'download']);
    }

    public function test_disguised_executable_is_rejected(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'up');
        file_put_contents($path, "<?php system(\$_GET['c']); ?>");
        $file = new UploadedFile($path, 'shell.pdf', 'application/pdf', null, true); // real file → MIME sniffed from content

        $this->upload([], $file)->assertSessionHasErrors('file');
        $this->assertSame(0, Document::query()->count());
    }

    public function test_confidential_documents_hidden_from_members_without_permission(): void
    {
        $this->upload(['is_confidential' => true]);
        $document = Document::query()->sole();
        $assistant = $this->member($this->org($this->lawyer), OrgRole::LegalAssistant, true);
        $this->case->lawyers()->attach($assistant->id, ['role' => 'assisting']);

        $this->actingAs($assistant)->get(route('documents.show', $document))->assertNotFound();
        $this->actingAs($assistant)->get(route('documents.download', $document))->assertNotFound();
    }

    public function test_share_with_client_then_revoke(): void
    {
        $this->upload();
        $document = Document::query()->sole();
        $clientUser = User::factory()->client()->create();
        $client = Client::factory()->create(['organization_id' => $this->case->organization_id, 'user_id' => $clientUser->id]);
        $stranger = User::factory()->client()->create();

        $this->post(route('documents.shares.store', $document), ['client_id' => $client->id, 'can_download' => true])->assertSessionHasNoErrors();
        $this->actingAs($clientUser)->get(route('portal.documents.download', $document))->assertOk();
        $this->actingAs($stranger)->get(route('portal.documents.download', $document))->assertNotFound();

        $share = $document->shares()->sole();
        $this->actingAs($this->lawyer)->delete(route('documents.shares.destroy', $share));
        $this->actingAs($clientUser)->get(route('portal.documents.download', $document))->assertNotFound();
    }

    public function test_expired_share_denies_access(): void
    {
        $this->upload();
        $document = Document::query()->sole();
        $clientUser = User::factory()->client()->create();
        $client = Client::factory()->create(['organization_id' => $this->case->organization_id, 'user_id' => $clientUser->id]);
        $document->shares()->create(['client_id' => $client->id, 'shared_by' => $this->lawyer->id, 'expires_at' => now()->subMinute()]);

        $this->actingAs($clientUser)->get(route('portal.documents.download', $document))->assertNotFound();
    }

    public function test_confidential_document_cannot_be_shared(): void
    {
        $this->upload(['is_confidential' => true]);
        $client = Client::factory()->create(['organization_id' => $this->case->organization_id]);

        $this->post(route('documents.shares.store', Document::query()->sole()), ['client_id' => $client->id])->assertSessionHasErrors('client_id');
    }
}
