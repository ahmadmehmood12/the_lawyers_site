<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Services\Drafting\PlaceholderResolver;
use App\Support\HtmlSanitizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Admin, Legal forms: write the Wakalatnama and Power of Attorney templates and their fields. */
class LegalFormTemplateController extends Controller
{
    public const CATEGORIES = ['wakalatnama', 'power-of-attorney', 'affidavit', 'undertaking', 'other'];

    public function index(): Response
    {
        return Inertia::render('Admin/LegalForms', [
            'forms' => DocumentTemplate::query()->whereNull('organization_id')->where('kind', 'form')->orderBy('category')->orderBy('title')->get()
                ->map(fn (DocumentTemplate $t) => [...$t->only(['id', 'category', 'title', 'title_ur', 'language', 'description', 'body', 'fields', 'is_active']), 'updated_at' => $t->updated_at->toIso8601String()]),
            'placeholders' => collect(PlaceholderResolver::AVAILABLE)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values(),
            'categories' => self::CATEGORIES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        DocumentTemplate::query()->create([...$this->validated($request), 'kind' => 'form', 'review_status' => 'reviewed', 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'created_by' => $request->user()->id]);

        return back()->with('success', __('Form created.'));
    }

    public function update(Request $request, DocumentTemplate $form): RedirectResponse
    {
        abort_unless($form->kind === 'form' && $form->organization_id === null, 404);
        $form->update($this->validated($request));

        return back()->with('success', __('Form saved.'));
    }

    public function destroy(DocumentTemplate $form): RedirectResponse
    {
        abort_unless($form->kind === 'form' && $form->organization_id === null, 404);
        $form->delete();

        return back()->with('success', __('Form deleted.'));
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'title' => ['required', 'string', 'max:255'],
            'title_ur' => ['nullable', 'string', 'max:255'],
            'language' => ['required', Rule::in(['en', 'ur'])],
            'description' => ['nullable', 'string', 'max:1000'],
            'body' => ['required', 'string', 'max:300000'],
            'is_active' => ['boolean'],
            'fields' => ['array', 'max:40'],
            'fields.*.key' => ['required', 'string', 'max:40', 'regex:/^[a-z][a-z0-9_]*$/', 'distinct'],
            'fields.*.label' => ['required', 'string', 'max:120'],
            'fields.*.type' => ['required', Rule::in(['text', 'textarea', 'date'])],
            'fields.*.required' => ['boolean'],
            'fields.*.source' => ['nullable', Rule::in(array_keys(PlaceholderResolver::AVAILABLE))],
            'fields.*.hint' => ['nullable', 'string', 'max:200'],
        ], ['fields.*.key.regex' => __('Field keys use lowercase letters, numbers and underscores, starting with a letter.')]);
        $data['body'] = HtmlSanitizer::clean($data['body']);
        $data['fields'] = array_values($data['fields'] ?? []);

        return $data;
    }
}
