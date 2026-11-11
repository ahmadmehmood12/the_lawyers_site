<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TeamDesignation;
use App\Models\TeamMember;
use App\Models\Testimonial;
use App\Support\ImageReencoder;
use App\Support\PublicFile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Homepage showcase managed by admins with content.moderate (docs/Modules/Showcase.md):
 * text and video testimonials, team members and team designations. Uploaded images are
 * re-encoded (metadata stripped); videos are stored as uploaded (MP4/WebM, capped).
 */
class ShowcaseController extends Controller
{
    public const CACHE_KEY = 'home-showcase-content';

    /** Admin, Video reviews: the testimonials manager opened on its video tab. */
    public function videoReviews(Request $request): Response
    {
        $request->query->set('kind', 'video');

        return $this->testimonials($request);
    }

    public function testimonials(Request $request): Response
    {
        $kind = $request->query('kind') === 'video' ? 'video' : 'text';
        $search = $request->string('search')->trim()->toString();

        return Inertia::render('Admin/Testimonials', [
            'kind' => $kind,
            'rows' => Testimonial::query()->where('kind', $kind)
                ->when($search, fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', "%{$search}%")->orWhere('designation', 'like', "%{$search}%")))
                ->orderBy('sort_order')->orderByDesc('id')->paginate(20)->withQueryString()
                ->through(fn (Testimonial $t) => [
                    ...$t->only(['id', 'kind', 'name', 'designation', 'body', 'rating', 'is_verified_client', 'is_featured', 'is_active', 'sort_order']),
                    'photo_url' => PublicFile::url($t->photo_path),
                    'video_url' => PublicFile::url($t->video_path),
                    'thumbnail_url' => PublicFile::url($t->thumbnail_path),
                ]),
            'counts' => Testimonial::query()->selectRaw('kind, count(*) as total')->groupBy('kind')->pluck('total', 'kind'),
            'filters' => ['kind' => $kind, 'search' => $search],
        ]);
    }

    public function storeTestimonial(Request $request): RedirectResponse
    {
        $testimonial = new Testimonial;
        $this->fillTestimonial($request, $testimonial);

        return back()->with('success', __('Testimonial added.'));
    }

    public function updateTestimonial(Request $request, Testimonial $testimonial): RedirectResponse
    {
        $this->fillTestimonial($request, $testimonial);

        return back()->with('success', __('Testimonial saved.'));
    }

    public function destroyTestimonial(Request $request, Testimonial $testimonial): RedirectResponse
    {
        Storage::disk('public')->delete(array_filter([$testimonial->photo_path, $testimonial->video_path, $testimonial->thumbnail_path]));
        $testimonial->delete();
        $this->audit($request, 'testimonial_deleted', ['name' => $testimonial->name]);

        return back()->with('success', __('Testimonial deleted.'));
    }

    /** Quick switches from the table: active, featured. */
    public function toggleTestimonial(Request $request, Testimonial $testimonial): RedirectResponse
    {
        $field = $request->validate(['field' => ['required', Rule::in(['is_active', 'is_featured'])]])['field'];
        $testimonial->update([$field => ! $testimonial->{$field}]);
        $this->flush();

        return back();
    }

    private function fillTestimonial(Request $request, Testimonial $testimonial): void
    {
        $kind = $request->input('kind', $testimonial->kind ?? 'text');
        $validated = $request->validate([
            'kind' => ['required', Rule::in(['text', 'video'])],
            'name' => ['required', 'string', 'max:120'],
            'designation' => ['nullable', 'string', 'max:160'],
            'body' => [$kind === 'text' ? 'required' : 'nullable', 'string', 'max:1200'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'is_verified_client' => ['boolean'],
            'is_featured' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'video' => [$kind === 'video' && ! $testimonial->video_path ? 'required' : 'nullable', 'file', 'mimetypes:video/mp4,video/webm', 'max:51200'],
        ]);

        $testimonial->fill([...collect($validated)->except(['photo', 'thumbnail', 'video'])->all(), 'sort_order' => $validated['sort_order'] ?? 0]);

        if ($request->hasFile('photo')) {
            $this->replaceFile($testimonial, 'photo_path', ImageReencoder::squareJpeg($request->file('photo'), 'testimonials', 600));
        }
        if ($request->hasFile('thumbnail')) {
            $this->replaceFile($testimonial, 'thumbnail_path', ImageReencoder::fittedJpeg($request->file('thumbnail'), 'testimonials', 1280));
        }
        if ($request->hasFile('video')) {
            $this->replaceFile($testimonial, 'video_path', $request->file('video')->store('testimonial-videos', 'public'));
        }

        $testimonial->save();
        $this->audit($request, 'testimonial_saved', ['name' => $testimonial->name, 'kind' => $testimonial->kind]);
    }

    public function team(): Response
    {
        return Inertia::render('Admin/Team', [
            'members' => TeamMember::query()->with('designation:id,name')->orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (TeamMember $m) => [
                    ...$m->only(['id', 'team_designation_id', 'name', 'bio', 'qualifications', 'experience', 'linkedin_url', 'profile_url', 'is_active', 'sort_order']),
                    'designation' => $m->designation?->name,
                    'photo_url' => PublicFile::url($m->photo_path),
                ]),
            'designations' => TeamDesignation::query()->withCount('members')->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'name_ur', 'sort_order']),
        ]);
    }

    public function storeMember(Request $request): RedirectResponse
    {
        $this->fillMember($request, new TeamMember);

        return back()->with('success', __('Team member added.'));
    }

    public function updateMember(Request $request, TeamMember $member): RedirectResponse
    {
        $this->fillMember($request, $member);

        return back()->with('success', __('Team member saved.'));
    }

    public function destroyMember(Request $request, TeamMember $member): RedirectResponse
    {
        Storage::disk('public')->delete(array_filter([$member->photo_path]));
        $member->delete();
        $this->audit($request, 'team_member_deleted', ['name' => $member->name]);

        return back()->with('success', __('Team member removed.'));
    }

    private function fillMember(Request $request, TeamMember $member): void
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'team_designation_id' => ['nullable', 'integer', 'exists:team_designations,id'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'qualifications' => ['nullable', 'string', 'max:255'],
            'experience' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url:https,http', 'max:255'],
            'profile_url' => ['nullable', 'url:https,http', 'max:255'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096', 'dimensions:min_width=300,min_height=300'],
        ]);

        $member->fill([...collect($validated)->except('photo')->all(), 'sort_order' => $validated['sort_order'] ?? 0]);
        if ($request->hasFile('photo')) {
            $this->replaceFile($member, 'photo_path', ImageReencoder::squareJpeg($request->file('photo'), 'team', 900));
        }
        $member->save();
        $this->audit($request, 'team_member_saved', ['name' => $member->name]);
    }

    public function storeDesignation(Request $request): RedirectResponse
    {
        TeamDesignation::create($this->validatedDesignation($request));
        $this->flush();

        return back()->with('success', __('Designation added.'));
    }

    public function updateDesignation(Request $request, TeamDesignation $designation): RedirectResponse
    {
        $designation->update($this->validatedDesignation($request, $designation));
        $this->flush();

        return back()->with('success', __('Designation saved.'));
    }

    public function destroyDesignation(TeamDesignation $designation): RedirectResponse
    {
        abort_if($designation->members()->exists(), 422, __('Move its team members to another designation first.'));
        $designation->delete();
        $this->flush();

        return back()->with('success', __('Designation deleted.'));
    }

    /** @return array{name: string, name_ur: string|null, sort_order: int} */
    private function validatedDesignation(Request $request, ?TeamDesignation $designation = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('team_designations', 'name')->ignore($designation?->id)],
            'name_ur' => ['nullable', 'string', 'max:120'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        return [...$validated, 'sort_order' => $validated['sort_order'] ?? 0];
    }

    private function replaceFile(TeamMember|Testimonial $model, string $column, string $path): void
    {
        if ($model->{$column}) {
            Storage::disk('public')->delete($model->{$column});
        }
        $model->{$column} = $path;
    }

    /** @param  array<string, mixed>  $properties */
    private function audit(Request $request, string $event, array $properties): void
    {
        $this->flush();
        activity('admin')->causedBy($request->user())->withProperties($properties)->log($event);
    }

    private function flush(): void
    {
        Cache::forget(self::CACHE_KEY.'-en');
        Cache::forget(self::CACHE_KEY.'-ur');
    }
}
