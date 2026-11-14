<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\DraftStatus;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\DocumentTemplate;
use App\Models\Draft;
use App\Models\LegalCase;
use App\Services\Drafting\PlaceholderResolver;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Wakalatnama and Power of Attorney (docs/Modules/Legal-Drafting.md#forms). Admin writes the form
 * template and its fields; the lawyer picks the case or client, checks the prefilled fields and
 * creates a normal draft that can be edited, printed and exported as PDF or Word.
 */
class LegalFormController extends Controller
{
    public function index(): Response
    {
        $this->authorize('create', Draft::class);
        $organization = $this->organization();

        return Inertia::render('Workspace/LegalForms/Index', [
            'forms' => $this->forms()->get()->map(fn (DocumentTemplate $t) => [
                'id' => $t->id, 'title' => $this->title($t), 'category' => $t->category, 'language' => $t->language,
                'description' => $t->description, 'fields' => count($t->fields ?? []),
            ]),
            'recent' => $organization->drafts()->whereHas('template', fn ($q) => $q->where('kind', 'form'))->with('template:id,title')->latest('updated_at')->limit(8)->get()
                ->map(fn (Draft $d) => ['id' => $d->id, 'title' => $d->title, 'form' => $d->template?->title, 'updated_at' => $d->updated_at->toIso8601String()]),
        ]);
    }

    public function show(Request $request, DocumentTemplate $form): Response
    {
        $this->authorize('create', Draft::class);
        $this->ensureForm($form);
        $organization = $this->organization();

        return Inertia::render('Workspace/LegalForms/Fill', [
            'form' => ['id' => $form->id, 'title' => $this->title($form), 'category' => $form->category, 'language' => $form->language, 'description' => $form->description, 'body' => $form->body, 'fields' => $form->fields ?? []],
            'cases' => LegalCase::query()->visibleTo($request->user(), $organization)->latest('updated_at')->limit(200)->get(['id', 'title', 'reference', 'case_number'])
                ->map(fn ($c) => ['value' => $c->id, 'label' => $c->title.' ('.($c->case_number ?: $c->reference).')']),
            'clients' => Client::query()->forOrganization($organization)->orderBy('name')->limit(500)->get(['id', 'name'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->name]),
            'values' => app(PlaceholderResolver::class)->values($organization, $request->user()),
            'caseId' => $request->integer('case_id') ?: null,
        ]);
    }

    /** All placeholder values for the chosen case and client, to prefill the fields (JSON). */
    public function prefill(Request $request, DocumentTemplate $form, PlaceholderResolver $resolver): JsonResponse
    {
        $this->authorize('create', Draft::class);
        $this->ensureForm($form);
        [$case, $client] = $this->caseAndClient($request);

        return response()->json(['values' => $resolver->values($this->organization(), $request->user(), $case, $client)]);
    }

    public function store(Request $request, DocumentTemplate $form, PlaceholderResolver $resolver): RedirectResponse
    {
        $this->authorize('create', Draft::class);
        $this->ensureForm($form);
        $fields = collect($form->fields ?? []);
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'values' => ['array'],
            ...$fields->mapWithKeys(fn ($f) => ['values.'.$f['key'] => [($f['required'] ?? false) ? 'required' : 'nullable', 'string', 'max:2000']])->all(),
        ], [], $fields->mapWithKeys(fn ($f) => ['values.'.$f['key'] => $f['label']])->all());

        [$case, $client] = $this->caseAndClient($request);
        $organization = $this->organization();
        $extra = $fields->mapWithKeys(fn ($f) => ['form.'.$f['key'] => $request->input('values.'.$f['key'])])->all();
        $body = $resolver->resolve($form->body, $organization, $request->user(), $case, $client, $extra);

        $draft = DB::transaction(function () use ($organization, $request, $case, $client, $form, $body): Draft {
            $draft = $organization->drafts()->create([
                'title' => $request->input('title'), 'language' => $form->language, 'legal_case_id' => $case?->id, 'client_id' => $client?->id,
                'document_template_id' => $form->id, 'body' => HtmlSanitizer::clean($body), 'status' => DraftStatus::Draft, 'version' => 1, 'created_by' => $request->user()->id,
            ]);
            $draft->versions()->create(['version' => 1, 'body' => $draft->body, 'note' => __('Created from form “:t”', ['t' => $form->title]), 'created_by' => $request->user()->id]);

            return $draft;
        });

        return redirect()->route('drafts.edit', $draft)->with('success', __(':form created. Check it, then print or export.', ['form' => $this->title($form)]));
    }

    private function forms()
    {
        return DocumentTemplate::query()->where('kind', 'form')->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('organization_id')->orWhere('organization_id', $this->organization()->id))
            ->orderBy('category')->orderBy('title');
    }

    private function ensureForm(DocumentTemplate $form): void
    {
        abort_unless($form->kind === 'form' && $form->is_active && ($form->organization_id === null || $form->organization_id === $this->organization()->id), 404);
    }

    private function title(DocumentTemplate $t): string
    {
        return app()->getLocale() === 'ur' && $t->title_ur ? $t->title_ur : $t->title;
    }

    /** @return array{0: ?LegalCase, 1: ?Client} */
    private function caseAndClient(Request $request): array
    {
        $organization = $this->organization();
        $case = $request->integer('case_id') ? LegalCase::query()->forOrganization($organization)->findOrFail($request->integer('case_id')) : null;
        if ($case) {
            $this->authorize('view', $case);
        }
        $client = $request->integer('client_id') ? Client::query()->forOrganization($organization)->findOrFail($request->integer('client_id')) : null;

        return [$case, $client];
    }
}
