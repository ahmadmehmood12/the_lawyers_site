<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\AdvocateCategory;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Public\LawyerDirectoryController;
use App\Models\LawyerProfile;
use App\Rules\Cnic;
use App\Rules\PakistaniPhone;
use App\Services\Lawyers\LawyerProfileService;
use App\Support\PublicFile;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lawyer professional profile, edited step by step (progress is saved per
 * step so incomplete applications persist). See docs/Modules/Lawyers.md.
 */
class LawyerProfileController extends Controller
{
    public const STEPS = ['identity', 'enrollment', 'qualifications', 'practice', 'chamber', 'publish'];

    private function profile(Request $request): LawyerProfile
    {
        abort_unless($request->user()->isLawyer(), 403);

        return $request->user()->lawyerProfile ?? app(LawyerProfileService::class)->createFor($request->user());
    }

    public function edit(Request $request): Response
    {
        $profile = $this->profile($request)->load(['specializations:id', 'courts:id', 'languages', 'educations', 'experiences', 'credentials']);
        $step = in_array($request->query('step'), self::STEPS, true) ? $request->query('step') : self::STEPS[min(count(self::STEPS), $profile->onboarding_step) - 1];

        return Inertia::render('Workspace/Profile/Edit', [
            'step' => $step,
            'steps' => self::STEPS,
            'profile' => [
                ...$profile->only(['slug', 'title', 'bar_council_id', 'enrollment_number', 'practice_since', 'headline', 'bio', 'bio_ur', 'province_id', 'district_id', 'city_id', 'chamber_address', 'public_phone', 'public_email', 'consultation_fee_min', 'consultation_fee_max', 'offers_online', 'offers_in_person', 'accepting_clients', 'is_public', 'onboarding_step']),
                'cnic' => $profile->cnic,
                'advocate_category' => $profile->advocate_category?->value,
                'enrollment_date' => $profile->enrollment_date?->toDateString(),
                'photo_url' => PublicFile::url($profile->photo_path) ?? PublicFile::url($request->user()->avatar_path),
                'verification_status' => $profile->verification_status->value,
                'verification_label' => $profile->verification_status->label(),
                'specialization_ids' => $profile->specializations->pluck('id'),
                'primary_specialization_id' => $profile->specializations->firstWhere('pivot.is_primary', true)?->id,
                'court_ids' => $profile->courts->pluck('id'),
                'languages' => $profile->languages->pluck('language'),
                'educations' => $profile->educations->map->only(['degree', 'institution', 'year']),
                'experiences' => $profile->experiences->map->only(['position', 'organization', 'start_year', 'end_year', 'description']),
                'credentials' => $profile->credentials->map->only(['type', 'title', 'issuer', 'year', 'url']),
                'onboarding_completed' => $profile->onboarding_completed_at !== null,
            ],
            'options' => [
                'barCouncils' => ReferenceOptions::barCouncils(),
                'categories' => AdvocateCategory::options(),
                'specializations' => ReferenceOptions::specializations(),
                'courts' => ReferenceOptions::courts(),
                'provinces' => ReferenceOptions::provinces(),
                'districts' => ReferenceOptions::districts(),
                'cities' => ReferenceOptions::cities(),
                'languages' => LawyerDirectoryController::LANGUAGES,
            ],
        ]);
    }

    public function update(Request $request, string $step): RedirectResponse
    {
        abort_unless(in_array($step, self::STEPS, true), 404);
        $profile = $this->profile($request);
        $year = now()->year;

        $rules = match ($step) {
            'identity' => [
                'title' => ['nullable', Rule::in(['Mr.', 'Ms.', 'Mrs.', 'Barrister', 'Advocate', 'Mian', 'Syed', 'Rao', 'Ch.', 'Malik', 'Raja', 'Sardar'])],
                'cnic' => ['required', new Cnic],
                'headline' => ['nullable', 'string', 'max:160'],
                'bio' => ['nullable', 'string', 'max:5000'],
                'bio_ur' => ['nullable', 'string', 'max:5000'],
            ],
            'enrollment' => [
                'bar_council_id' => ['required', 'integer', 'exists:bar_councils,id'],
                'enrollment_number' => ['required', 'string', 'max:60', Rule::unique('lawyer_profiles')->where('bar_council_id', $request->input('bar_council_id'))->ignore($profile->id)],
                'advocate_category' => ['required', Rule::enum(AdvocateCategory::class)],
                'enrollment_date' => ['nullable', 'date', 'before_or_equal:today'],
                'practice_since' => ['required', 'integer', 'between:1950,'.$year],
            ],
            'qualifications' => [
                'educations' => ['array', 'max:10'],
                'educations.*.degree' => ['required', 'string', 'max:120'],
                'educations.*.institution' => ['required', 'string', 'max:160'],
                'educations.*.year' => ['nullable', 'integer', 'between:1950,'.$year],
                'experiences' => ['array', 'max:20'],
                'experiences.*.position' => ['required', 'string', 'max:120'],
                'experiences.*.organization' => ['required', 'string', 'max:160'],
                'experiences.*.start_year' => ['nullable', 'integer', 'between:1950,'.$year],
                'experiences.*.end_year' => ['nullable', 'integer', 'between:1950,'.$year],
                'experiences.*.description' => ['nullable', 'string', 'max:1000'],
                'credentials' => ['array', 'max:30'],
                'credentials.*.type' => ['required', Rule::in(['publication', 'certification', 'award'])],
                'credentials.*.title' => ['required', 'string', 'max:200'],
                'credentials.*.issuer' => ['nullable', 'string', 'max:160'],
                'credentials.*.year' => ['nullable', 'integer', 'between:1950,'.$year],
                'credentials.*.url' => ['nullable', 'url:https,http', 'max:255'],
            ],
            'practice' => [
                'specialization_ids' => ['required', 'array', 'min:1', 'max:8'],
                'specialization_ids.*' => ['integer', 'exists:specializations,id'],
                'primary_specialization_id' => ['nullable', 'integer', 'in_array:specialization_ids.*'],
                'court_ids' => ['array', 'max:20'],
                'court_ids.*' => ['integer', 'exists:courts,id'],
                'languages' => ['required', 'array', 'min:1'],
                'languages.*' => [Rule::in(LawyerDirectoryController::LANGUAGES)],
            ],
            'chamber' => [
                'province_id' => ['required', 'integer', 'exists:provinces,id'],
                'district_id' => ['required', 'integer', Rule::exists('districts', 'id')->where('province_id', $request->input('province_id'))],
                'city_id' => ['required', 'integer', Rule::exists('cities', 'id')->where('district_id', $request->input('district_id'))],
                'chamber_address' => ['required', 'string', 'max:255'],
                'public_phone' => ['nullable', new PakistaniPhone],
                'public_email' => ['nullable', 'email', 'max:255'],
                'consultation_fee_min' => ['nullable', 'integer', 'min:0', 'max:10000000'],
                'consultation_fee_max' => ['nullable', 'integer', 'gte:consultation_fee_min', 'max:10000000'],
                'offers_online' => ['boolean'],
                'offers_in_person' => ['boolean'],
                'accepting_clients' => ['boolean'],
            ],
            'publish' => ['is_public' => ['boolean']],
        };

        $data = $request->validate($rules);

        DB::transaction(function () use ($step, $data, $profile): void {
            match ($step) {
                'qualifications' => $this->syncQualifications($profile, $data),
                'practice' => $this->syncPractice($profile, $data),
                'identity' => $profile->fill([...$data, 'cnic' => Cnic::normalize($data['cnic'])])->save(),
                'chamber' => $profile->fill([...$data, 'public_phone' => PakistaniPhone::normalize($data['public_phone'] ?? null)])->save(),
                default => $profile->fill($data)->save(),
            };

            $index = array_search($step, self::STEPS, true) + 1;
            $profile->forceFill([
                'onboarding_step' => max($profile->onboarding_step, min($index + 1, count(self::STEPS))),
                'onboarding_completed_at' => $step === 'publish' ? ($profile->onboarding_completed_at ?? now()) : $profile->onboarding_completed_at,
            ])->save();
        });

        $next = self::STEPS[array_search($step, self::STEPS, true) + 1] ?? null;

        return $next
            ? redirect()->route('lawyer.profile.edit', ['step' => $next])->with('success', __('Saved.'))
            : redirect()->route('lawyer.profile.edit', ['step' => 'publish'])->with('success', $profile->is_public ? __('Your profile is live in the directory.') : __('Profile saved. It is hidden from the directory.'));
    }

    public function photo(Request $request): RedirectResponse
    {
        $profile = $this->profile($request);
        $request->validate(['photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072', 'dimensions:min_width=200,min_height=200,max_width=5000,max_height=5000']]);

        $path = $this->reencode($request->file('photo')->getRealPath());
        if ($profile->photo_path) {
            Storage::disk('public')->delete($profile->photo_path);
        }
        $profile->update(['photo_path' => $path]);

        return back()->with('success', __('Photo updated.'));
    }

    /** Re-encodes uploads to strip metadata/embedded payloads before public serving. */
    private function reencode(string $source): string
    {
        $image = imagecreatefromstring((string) file_get_contents($source));
        abort_if($image === false, 422, __('Invalid image.'));
        $size = min(imagesx($image), imagesy($image));
        $square = imagecreatetruecolor(600, 600);
        imagecopyresampled($square, $image, 0, 0, (int) ((imagesx($image) - $size) / 2), (int) ((imagesy($image) - $size) / 2), 600, 600, $size, $size);
        ob_start();
        imagejpeg($square, null, 85);
        $path = 'lawyer-photos/'.Str::random(40).'.jpg';
        Storage::disk('public')->put($path, (string) ob_get_clean());

        return $path;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncQualifications(LawyerProfile $profile, array $data): void
    {
        $profile->educations()->delete();
        $profile->educations()->createMany($data['educations'] ?? []);
        $profile->experiences()->delete();
        $profile->experiences()->createMany($data['experiences'] ?? []);
        $profile->credentials()->delete();
        $profile->credentials()->createMany($data['credentials'] ?? []);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncPractice(LawyerProfile $profile, array $data): void
    {
        $primary = $data['primary_specialization_id'] ?? $data['specialization_ids'][0];
        $profile->specializations()->sync(collect($data['specialization_ids'])->mapWithKeys(fn ($id) => [$id => ['is_primary' => (int) $id === (int) $primary]])->all());
        $profile->courts()->sync($data['court_ids'] ?? []);
        $profile->languages()->delete();
        $profile->languages()->createMany(array_map(fn ($l) => ['language' => $l], array_unique($data['languages'])));
    }
}
