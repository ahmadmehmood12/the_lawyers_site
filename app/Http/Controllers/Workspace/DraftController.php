<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\DocumentCategory;
use App\Enums\DraftStatus;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Document;
use App\Models\DocumentTemplate;
use App\Models\Draft;
use App\Models\LegalCase;
use App\Services\Access\OrganizationAccess;
use App\Services\Ai\LegalAssistant;
use App\Services\Cases\Timeline;
use App\Services\Documents\DocumentVault;
use App\Services\Drafting\DocxExporter;
use App\Services\Drafting\PlaceholderResolver;
use App\Services\Pdf\PdfRenderer;
use App\Support\HtmlSanitizer;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Legal drafting (docs/Modules/Legal-Drafting.md). Each save creates a new
 * version; approval is by a member with drafts.approve. Nothing is ever filed
 * with a court — exports are for the advocate to review, sign and file.
 */
class DraftController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Draft::class);
        $organization = $this->organization();

        $drafts = Draft::query()->forOrganization($organization)
            ->where(fn ($q) => $q->whereNull('legal_case_id')->orWhereIn('legal_case_id', LegalCase::query()->visibleTo($request->user(), $organization)->select('id')))
            ->with(['legalCase:id,reference,title', 'author:id,name'])
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->string('status')->toString(), fn ($q, $s) => $q->where('status', $s))
            ->latest('updated_at')->paginate(20)->withQueryString()
            ->through(fn (Draft $d) => ['id' => $d->id, 'title' => $d->title, 'status' => $d->status->value, 'status_label' => $d->status->label(), 'version' => $d->version, 'case' => $d->legalCase?->only(['id', 'reference', 'title']), 'author' => $d->author->name, 'updated_at' => $d->updated_at->toIso8601String()]);

        return Inertia::render('Workspace/Drafts/Index', [
            'drafts' => $drafts,
            'filters' => $request->only(['search', 'status']),
            'statuses' => DraftStatus::options(),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Draft::class);
        $organization = $this->organization();

        return Inertia::render('Workspace/Drafts/Create', [
            'templates' => DocumentTemplate::query()->where('kind', 'draft')->where('is_active', true)
                ->where(fn ($q) => $q->whereNull('organization_id')->orWhere('organization_id', $organization->id))
                ->orderBy('category')->orderBy('title')->get(['id', 'organization_id', 'category', 'title', 'title_ur', 'description', 'review_status', 'language'])
                ->map(fn ($t) => [...$t->toArray(), 'title' => app()->getLocale() === 'ur' && $t->title_ur ? $t->title_ur : $t->title, 'own' => $t->organization_id !== null]),
            'cases' => LegalCase::query()->visibleTo($request->user(), $organization)->orderBy('title')->limit(500)->get(['id', 'title', 'reference'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->reference.', '.$c->title]),
            'clients' => ReferenceOptions::clients($organization),
            'preset' => ['legal_case_id' => $request->integer('case_id') ?: null],
        ]);
    }

    public function store(Request $request, PlaceholderResolver $resolver, Timeline $timeline): RedirectResponse
    {
        $this->authorize('create', Draft::class);
        $organization = $this->organization();
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'document_template_id' => ['nullable', 'integer'],
            'legal_case_id' => ['nullable', 'integer'],
            'client_id' => ['nullable', 'integer'],
            'language' => ['required', Rule::in(['en', 'ur'])],
        ]);

        $case = isset($validated['legal_case_id']) ? LegalCase::query()->forOrganization($organization)->findOrFail($validated['legal_case_id']) : null;
        if ($case) {
            $this->authorize('view', $case);
        }
        $client = isset($validated['client_id']) ? Client::query()->forOrganization($organization)->findOrFail($validated['client_id']) : null;
        $template = isset($validated['document_template_id'])
            ? DocumentTemplate::query()->where('is_active', true)->where(fn ($q) => $q->whereNull('organization_id')->orWhere('organization_id', $organization->id))->findOrFail($validated['document_template_id'])
            : null;

        $body = $template ? $resolver->resolve($template->body, $organization, $request->user(), $case, $client) : '<p></p>';

        $draft = DB::transaction(function () use ($organization, $validated, $case, $client, $template, $body, $request): Draft {
            $draft = $organization->drafts()->create([
                'title' => $validated['title'], 'language' => $validated['language'], 'legal_case_id' => $case?->id, 'client_id' => $client?->id,
                'document_template_id' => $template?->id, 'body' => HtmlSanitizer::clean($body), 'status' => DraftStatus::Draft, 'version' => 1, 'created_by' => $request->user()->id,
            ]);
            $draft->versions()->create(['version' => 1, 'body' => $draft->body, 'note' => $template ? __('Created from template “:t”', ['t' => $template->title]) : __('Blank draft'), 'created_by' => $request->user()->id]);

            return $draft;
        });

        if ($case) {
            $timeline->record($case, 'draft_created', __('Draft started: :title', ['title' => $draft->title]), null, $draft);
        }

        return redirect()->route('drafts.edit', $draft);
    }

    public function edit(Request $request, Draft $draft): Response
    {
        $this->authorize('view', $draft);
        $draft->load(['legalCase:id,title,reference', 'template:id,title,review_status', 'versions.author:id,name', 'reviewer:id,name']);

        return Inertia::render('Workspace/Drafts/Editor', [
            'draft' => [
                ...$draft->only(['id', 'title', 'body', 'language', 'header_text', 'footer_text', 'version']),
                'status' => $draft->status->value, 'status_label' => $draft->status->label(),
                'case' => $draft->legalCase?->only(['id', 'title', 'reference']),
                'template' => $draft->template ? ['title' => $draft->template->title, 'reviewed' => $draft->template->review_status === 'reviewed'] : null,
                'approved_by' => $draft->status === DraftStatus::Approved ? $draft->reviewer?->name : null,
                'approved_at' => $draft->approved_at?->toIso8601String(),
                'versions' => $draft->versions->map(fn ($v) => ['version' => $v->version, 'note' => $v->note, 'author' => $v->author->name, 'created_at' => $v->created_at->toIso8601String()]),
            ],
            'placeholders' => collect(PlaceholderResolver::AVAILABLE)->map(fn ($label, $key) => ['key' => $key, 'label' => __($label)])->values(),
            'can' => [
                'approve' => $request->user()->can('approve', $draft),
                'attach' => $draft->legal_case_id && app(OrganizationAccess::class)->allows($request->user(), $draft->organization_id, 'documents.upload'),
                'ai' => app(LegalAssistant::class)->available() && app(OrganizationAccess::class)->allows($request->user(), $draft->organization_id, 'ai.use'),
            ],
        ]);
    }

    public function update(Request $request, Draft $draft): RedirectResponse
    {
        $this->authorize('update', $draft);
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000000'],
            'header_text' => ['nullable', 'string', 'max:255'],
            'footer_text' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $clean = HtmlSanitizer::clean($validated['body']);

        DB::transaction(function () use ($draft, $validated, $clean, $request): void {
            $changed = $clean !== $draft->body;
            $draft->fill([
                'title' => $validated['title'], 'header_text' => $validated['header_text'] ?? null, 'footer_text' => $validated['footer_text'] ?? null, 'body' => $clean,
            ]);

            if ($changed) {
                $draft->version++;
                if ($draft->status === DraftStatus::Approved) {
                    $draft->status = DraftStatus::Draft; // edits after approval require re-approval
                    $draft->approved_at = null;
                }
                $draft->versions()->create(['version' => $draft->version, 'body' => $clean, 'note' => $validated['note'] ?? null, 'created_by' => $request->user()->id]);
            }

            $draft->save();
        });

        return back()->with('success', __('Draft saved (version :v).', ['v' => $draft->version]));
    }

    public function restore(Request $request, Draft $draft, int $version): RedirectResponse
    {
        $this->authorize('update', $draft);
        $old = $draft->versions()->where('version', $version)->firstOrFail();

        $draft->version++;
        $draft->body = $old->body;
        $draft->status = DraftStatus::Draft;
        $draft->save();
        $draft->versions()->create(['version' => $draft->version, 'body' => $old->body, 'note' => __('Restored version :v', ['v' => $version]), 'created_by' => $request->user()->id]);

        return back()->with('success', __('Version :v restored.', ['v' => $version]));
    }

    public function status(Request $request, Draft $draft): RedirectResponse
    {
        $target = DraftStatus::from($request->validate(['status' => ['required', Rule::enum(DraftStatus::class)]])['status']);

        if ($target === DraftStatus::Approved) {
            $this->authorize('approve', $draft);
            $draft->update(['status' => $target, 'reviewed_by' => $request->user()->id, 'approved_at' => now()]);
        } else {
            $this->authorize('update', $draft);
            $draft->update(['status' => $target, 'approved_at' => null]);
        }

        return back()->with('success', __('Draft marked :status.', ['status' => $target->label()]));
    }

    public function export(Request $request, Draft $draft, string $format, PdfRenderer $pdf, DocxExporter $docx): HttpResponse|BinaryFileResponse
    {
        $this->authorize('view', $draft);
        abort_unless(in_array($format, ['pdf', 'docx'], true), 404);
        activity('exports')->causedBy($request->user())->performedOn($draft)->log('draft_'.$format);
        $name = str($draft->title)->slug()->limit(80, '').'-v'.$draft->version;

        if ($format === 'pdf') {
            return $pdf->download('pdf.draft', ['draft' => $draft, 'title' => $draft->title], $name.'.pdf');
        }

        return response()->download($docx->export($draft), $name.'.docx')->deleteFileAfterSend();
    }

    /** Saves the current version as a PDF in the case's document vault. */
    public function attach(Request $request, Draft $draft, PdfRenderer $pdf, DocumentVault $vault): RedirectResponse
    {
        $this->authorize('view', $draft);
        abort_unless($draft->legal_case_id, 422);
        $this->authorize('upload', Document::class);

        $path = storage_path('app/private/tmp-'.uniqid().'.pdf');
        file_put_contents($path, $pdf->render('pdf.draft', ['draft' => $draft, 'title' => $draft->title]));
        $file = new UploadedFile($path, str($draft->title)->slug().'.pdf', 'application/pdf', null, true);

        $vault->store($draft->organization, $request->user(), $file, [
            'title' => $draft->title.' (v'.$draft->version.')', 'category' => DocumentCategory::Draft->value,
            'legal_case_id' => $draft->legal_case_id, 'client_id' => $draft->client_id, 'source' => 'draft', 'is_confidential' => false,
        ]);
        @unlink($path);

        return back()->with('success', __('Saved to the case documents.'));
    }
}
