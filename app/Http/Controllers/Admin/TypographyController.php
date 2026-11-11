<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Typography;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin, Settings, Typography (settings.manage): choose the English and Urdu text and heading
 * fonts, add Google Fonts families (checked against Google before saving) or upload font files.
 */
class TypographyController extends Controller
{
    /** Magic bytes of the accepted font formats. */
    private const SIGNATURES = ['woff2' => 'wOF2', 'woff' => 'wOFF', 'otf' => 'OTTO'];

    public function update(Request $request): RedirectResponse
    {
        $rules = collect(Typography::SLOTS)->mapWithKeys(fn ($slot, $key) => [$key => ['required', 'string', 'regex:'.Typography::FAMILY_PATTERN]])->all();
        $validated = $request->validate($rules);
        $library = Typography::library();

        foreach ($validated as $slot => $family) {
            $script = Typography::SLOTS[$slot]['script'];
            $font = Typography::find($family) ?? collect($library)->firstWhere('family', $family);

            if (! $font && isset(Typography::GOOGLE_SUGGESTIONS[$family])) {
                $font = $this->addGoogle($library, $family, Typography::GOOGLE_SUGGESTIONS[$family]['script'], Typography::GOOGLE_SUGGESTIONS[$family]['category'], $slot);
            }

            if (! $font || $font['script'] !== $script) {
                throw ValidationException::withMessages([$slot => __('Choose a font from the list for this language.')]);
            }
        }

        Typography::saveLibrary($library);
        Typography::saveChoices($validated);
        activity('admin')->causedBy($request->user())->withProperties($validated)->log('fonts_updated');

        return back()->with('success', __('Fonts saved. Every page now uses them.'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'source' => ['required', Rule::in(['google', 'upload'])],
            'family' => ['required', 'string', 'regex:'.Typography::FAMILY_PATTERN, Rule::notIn(array_keys(Typography::BUNDLED))],
            'script' => ['required', Rule::in(['latin', 'urdu'])],
            'category' => ['required', Rule::in(['sans-serif', 'serif', 'display', 'monospace'])],
            'weight' => ['required_if:source,upload', 'nullable', Rule::in(Typography::WEIGHTS)],
            'file' => ['required_if:source,upload', 'nullable', 'file', 'extensions:woff2,woff,ttf,otf', 'max:5120'],
        ], [], ['family' => __('font name')]);

        $family = Str::of($validated['family'])->squish()->toString();
        $library = Typography::library();

        if ($validated['source'] === 'google') {
            if (collect($library)->contains(fn ($f) => strcasecmp($f['family'], $family) === 0)) {
                throw ValidationException::withMessages(['family' => __('This font is already in your list.')]);
            }
            $this->addGoogle($library, $family, $validated['script'], $validated['category'], 'family');
        } else {
            $this->addUpload($library, $family, $validated['script'], $validated['category'], $validated['weight'], $request->file('file'));
        }

        Typography::saveLibrary($library);
        activity('admin')->causedBy($request->user())->withProperties(['family' => $family, 'source' => $validated['source']])->log('font_added');

        return back()->with('success', __('Font added. Pick it in the font lists above to use it.'));
    }

    public function destroy(Request $request, string $font): RedirectResponse
    {
        $library = Typography::library();
        $entry = collect($library)->firstWhere('id', $font) ?? abort(404);

        foreach ($entry['files'] ?? [] as $file) {
            Storage::disk('public')->delete($file['path']);
        }

        Typography::saveLibrary(array_values(array_filter($library, fn ($f) => $f['id'] !== $font)));
        Typography::saveChoices(collect(Typography::choices())->map(fn ($family, $slot) => $family === $entry['family'] ? Typography::SLOTS[$slot]['default'] : $family)->all());
        activity('admin')->causedBy($request->user())->withProperties(['family' => $entry['family']])->log('font_removed');

        return back()->with('success', __('Font removed. Places that used it are back to the default.'));
    }

    /**
     * @param  list<array<string, mixed>>  $library
     * @return array<string, mixed>
     */
    private function addGoogle(array &$library, string $family, string $script, string $category, string $errorKey): array
    {
        $spec = Typography::resolveGoogle($family);

        if ($spec === null) {
            throw ValidationException::withMessages([$errorKey => __('Google Fonts has no family called ":family", or it could not be reached. Check the exact name on fonts.google.com.', ['family' => $family])]);
        }

        $entry = ['id' => Str::slug($family), 'family' => $family, 'source' => 'google', 'script' => $script, 'category' => $category, 'google' => $spec];
        $library[] = $entry;

        return $entry;
    }

    /** @param list<array<string, mixed>> $library */
    private function addUpload(array &$library, string $family, string $script, string $category, string $weight, UploadedFile $file): void
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $head = (string) file_get_contents($file->getRealPath(), false, null, 0, 4);
        $valid = isset(self::SIGNATURES[$extension]) ? $head === self::SIGNATURES[$extension] : in_array($head, ["\x00\x01\x00\x00", 'true'], true);

        if (! $valid) {
            throw ValidationException::withMessages(['file' => __('This file is not a valid font.')]);
        }

        $format = ['woff2' => 'woff2', 'woff' => 'woff', 'ttf' => 'truetype', 'otf' => 'opentype'][$extension];
        $path = $file->storeAs('fonts', Str::slug($family).'-'.$weight.'-'.Str::random(6).'.'.$extension, 'public');
        $index = collect($library)->search(fn ($f) => strcasecmp($f['family'], $family) === 0);

        if ($index !== false && $library[$index]['source'] !== 'upload') {
            Storage::disk('public')->delete($path);
            throw ValidationException::withMessages(['family' => __('A Google font with this name is already in your list.')]);
        }

        if ($index === false) {
            $library[] = ['id' => Str::slug($family), 'family' => $family, 'source' => 'upload', 'script' => $script, 'category' => $category, 'files' => []];
            $index = array_key_last($library);
        }

        foreach ($library[$index]['files'] as $existing) {
            if ($existing['weight'] === $weight) {
                Storage::disk('public')->delete($existing['path']);
            }
        }

        $library[$index]['files'] = [...array_values(array_filter($library[$index]['files'], fn ($f) => $f['weight'] !== $weight)), ['path' => $path, 'format' => $format, 'weight' => $weight]];
    }
}
