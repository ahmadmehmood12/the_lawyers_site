<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

/**
 * Site fonts (docs/Features/Typography.md). Four slots: English text, English headings,
 * Urdu text and Urdu headings. Each slot names a family that is either bundled (self-hosted
 * by Vite, no third-party request), a Google Fonts family (verified on save, loaded from
 * fonts.googleapis.com) or a font file uploaded in Admin, Settings.
 *
 * The chosen stacks are printed as CSS variables (--primaryFont, --headingFont, --urduFont,
 * --urduHeadingFont) in app.blade.php; app.css maps Tailwind's font-sans / font-serif to them.
 */
class Typography
{
    /** @var array<string, array{script: 'latin'|'urdu', default: string}> */
    public const SLOTS = [
        'body' => ['script' => 'latin', 'default' => 'Inter'],
        'heading' => ['script' => 'latin', 'default' => 'Inter'],
        'urdu_body' => ['script' => 'urdu', 'default' => 'Noto Nastaliq Urdu'],
        'urdu_heading' => ['script' => 'urdu', 'default' => 'Noto Nastaliq Urdu'],
    ];

    /** Self-hosted through vite.config.ts. @var array<string, array{script: string, category: string}> */
    public const BUNDLED = [
        'Inter' => ['script' => 'latin', 'category' => 'sans-serif'],
        'Source Serif 4' => ['script' => 'latin', 'category' => 'serif'],
        'Noto Nastaliq Urdu' => ['script' => 'urdu', 'category' => 'serif'],
    ];

    /** Suggested Google Fonts (Urdu ones cover the extra Urdu letters). @var array<string, array{script: string, category: string}> */
    public const GOOGLE_SUGGESTIONS = [
        'Poppins' => ['script' => 'latin', 'category' => 'sans-serif'],
        'Roboto' => ['script' => 'latin', 'category' => 'sans-serif'],
        'Open Sans' => ['script' => 'latin', 'category' => 'sans-serif'],
        'Lato' => ['script' => 'latin', 'category' => 'sans-serif'],
        'Montserrat' => ['script' => 'latin', 'category' => 'sans-serif'],
        'DM Sans' => ['script' => 'latin', 'category' => 'sans-serif'],
        'Manrope' => ['script' => 'latin', 'category' => 'sans-serif'],
        'IBM Plex Sans' => ['script' => 'latin', 'category' => 'sans-serif'],
        'Work Sans' => ['script' => 'latin', 'category' => 'sans-serif'],
        'Merriweather' => ['script' => 'latin', 'category' => 'serif'],
        'Playfair Display' => ['script' => 'latin', 'category' => 'serif'],
        'Libre Baskerville' => ['script' => 'latin', 'category' => 'serif'],
        'EB Garamond' => ['script' => 'latin', 'category' => 'serif'],
        'Lora' => ['script' => 'latin', 'category' => 'serif'],
        'Cormorant Garamond' => ['script' => 'latin', 'category' => 'serif'],
        'Gulzar' => ['script' => 'urdu', 'category' => 'serif'],
        'Noto Naskh Arabic' => ['script' => 'urdu', 'category' => 'serif'],
        'Noto Sans Arabic' => ['script' => 'urdu', 'category' => 'sans-serif'],
        'Lateef' => ['script' => 'urdu', 'category' => 'serif'],
        'Scheherazade New' => ['script' => 'urdu', 'category' => 'serif'],
        'Amiri' => ['script' => 'urdu', 'category' => 'serif'],
    ];

    /** Family names are restricted so they can be printed into CSS and URLs safely. */
    public const FAMILY_PATTERN = '/^[A-Za-z0-9][A-Za-z0-9 \-]{1,59}$/';

    public const WEIGHTS = ['400', '500', '600', '700', 'variable'];

    /**
     * Fonts added by the admin: Google families (with the verified css2 query) and uploads.
     *
     * @return list<array{id: string, family: string, source: 'google'|'upload', script: string, category: string, google?: string, files?: list<array{path: string, format: string, weight: string}>}>
     */
    public static function library(): array
    {
        $raw = json_decode((string) Setting::get('font_library', '[]'), true);

        return is_array($raw) ? array_values(array_filter($raw, fn ($f) => is_array($f) && isset($f['family'], $f['source']))) : [];
    }

    /** @param list<array<string, mixed>> $library */
    public static function saveLibrary(array $library): void
    {
        Setting::put('font_library', json_encode(array_values($library), JSON_UNESCAPED_SLASHES));
    }

    /** @return array<string, string> slot => family */
    public static function choices(): array
    {
        $saved = json_decode((string) Setting::get('font_choices', '{}'), true);
        $saved = is_array($saved) ? $saved : [];

        return collect(self::SLOTS)->mapWithKeys(fn (array $slot, string $key) => [$key => is_string($saved[$key] ?? null) && $saved[$key] !== '' ? $saved[$key] : $slot['default']])->all();
    }

    /** @param array<string, string> $choices */
    public static function saveChoices(array $choices): void
    {
        Setting::put('font_choices', json_encode(array_intersect_key($choices, self::SLOTS)));
    }

    /** @return array{id: string, family: string, source: string, script: string, category: string, google?: string, files?: list<array{path: string, format: string, weight: string}>}|null */
    public static function find(string $family): ?array
    {
        if (isset(self::BUNDLED[$family])) {
            return ['id' => Str::slug($family), 'family' => $family, 'source' => 'bundled', ...self::BUNDLED[$family]];
        }

        return collect(self::library())->firstWhere('family', $family);
    }

    /** The CSS font stack for a family, with a metric-matched fallback for Inter. */
    public static function stack(string $family, string $script, string $category): string
    {
        $fallback = match (true) {
            $script === 'urdu' => '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Urdu Typesetting", serif',
            $family === 'Inter' => '"Inter Fallback", Arial, sans-serif',
            $category === 'serif' => 'Georgia, "Times New Roman", serif',
            $category === 'monospace' => 'ui-monospace, Menlo, monospace',
            default => 'Arial, sans-serif',
        };

        return '"'.$family.'", '.str_replace('"'.$family.'", ', '', $fallback);
    }

    /**
     * Tags for <head>: Google Fonts stylesheet for the families in use, @font-face rules for
     * uploaded fonts and the CSS variables. Urdu slots load only on Urdu pages.
     */
    public static function headTags(?string $locale = null): string
    {
        try {
            $choices = self::choices();
        } catch (Throwable) {
            return '';
        }

        $locale ??= app()->getLocale();
        $google = [];
        $faces = [];
        $vars = [];
        $names = ['body' => '--primaryFont', 'heading' => '--headingFont', 'urdu_body' => '--urduFont', 'urdu_heading' => '--urduHeadingFont'];

        foreach ($choices as $slot => $family) {
            $font = self::find($family) ?? self::find(self::SLOTS[$slot]['default']);
            $script = self::SLOTS[$slot]['script'];
            $vars[] = $names[$slot].': '.self::stack($font['family'], $script, $font['category']);

            if ($script === 'urdu' && $locale !== 'ur') {
                continue;
            }

            if ($font['source'] === 'google' && filled($font['google'] ?? null)) {
                $google[$font['google']] = true;
            }

            if ($font['source'] === 'upload') {
                foreach ($font['files'] ?? [] as $file) {
                    $faces[$file['path']] = self::fontFace($font['family'], $file);
                }
            }
        }

        $html = '';
        if ($google !== []) {
            $html .= '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
            $html .= '<link rel="stylesheet" href="'.e(self::googleUrl(array_keys($google))).'">';
        }

        return $html.'<style id="site-fonts">'.implode('', $faces).'html:root{'.implode(';', $vars).'}</style>';
    }

    /** @param list<string> $specs css2 family params, e.g. "Poppins:wght@400;700" */
    public static function googleUrl(array $specs): string
    {
        return 'https://fonts.googleapis.com/css2?'.implode('&', array_map(fn ($s) => 'family='.$s, $specs)).'&display=swap';
    }

    /** @param array{path: string, format: string, weight: string} $file */
    public static function fontFace(string $family, array $file): string
    {
        $url = PublicFile::url($file['path']);
        $weight = $file['weight'] === 'variable' ? '100 900' : $file['weight'];

        return '@font-face{font-family:"'.$family.'";src:url("'.str_replace('"', '%22', (string) $url).'") format("'.$file['format'].'");font-weight:'.$weight.';font-style:normal;font-display:swap}';
    }

    /**
     * Confirms the family exists on Google Fonts and returns the css2 parameter that loads it,
     * trying 400 to 700, then 400 and 700, then the regular weight (static families reject
     * weights they don't have). Null when Google can't be reached or has no such family.
     */
    public static function resolveGoogle(string $family): ?string
    {
        $name = str_replace(' ', '+', $family);

        foreach ([':wght@400;500;600;700', ':wght@400;700', ''] as $axis) {
            try {
                $response = Http::timeout(8)->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; WakeelDiary font check)'])->get(self::googleUrl([$name.$axis]));
            } catch (Throwable) {
                return null;
            }

            if ($response->successful() && str_contains($response->body(), '@font-face')) {
                return $name.$axis;
            }
        }

        return null;
    }

    /**
     * Everything the admin Typography card needs.
     *
     * @return array{choices: array<string, string>, slots: array<string, string>, options: array<string, list<array{value: string, label: string, source: string, category: string}>>, library: list<array<string, mixed>>, suggestions: array<string, array{script: string, category: string}>, googleSpecs: array<string, string>, previewCss: string}
     */
    public static function adminPayload(): array
    {
        $library = self::library();
        $options = [];
        foreach (['latin', 'urdu'] as $script) {
            $bundled = collect(self::BUNDLED)->filter(fn ($f) => $f['script'] === $script)->map(fn ($f, $family) => ['value' => $family, 'label' => $family, 'source' => 'bundled', 'category' => $f['category']]);
            $custom = collect($library)->where('script', $script)->map(fn ($f) => ['value' => $f['family'], 'label' => $f['family'], 'source' => $f['source'], 'category' => $f['category']]);
            $suggested = collect(self::GOOGLE_SUGGESTIONS)->filter(fn ($f, $family) => $f['script'] === $script && ! $custom->contains('value', $family))
                ->map(fn ($f, $family) => ['value' => $family, 'label' => $family, 'source' => 'suggestion', 'category' => $f['category']]);
            $options[$script] = $bundled->values()->concat($custom->values())->concat($suggested->values())->values()->all();
        }

        $faces = collect($library)->where('source', 'upload')->flatMap(fn ($f) => collect($f['files'] ?? [])->map(fn ($file) => self::fontFace($f['family'], $file)))->implode('');

        return [
            'choices' => self::choices(),
            'slots' => collect(self::SLOTS)->map(fn ($s) => $s['script'])->all(),
            'options' => $options,
            'library' => collect($library)->map(fn ($f) => [
                'id' => $f['id'], 'family' => $f['family'], 'source' => $f['source'], 'script' => $f['script'], 'category' => $f['category'],
                'files' => collect($f['files'] ?? [])->map(fn ($file) => ['weight' => $file['weight'], 'format' => $file['format']])->all(),
                'in_use' => in_array($f['family'], self::choices(), true),
            ])->all(),
            'suggestions' => self::GOOGLE_SUGGESTIONS,
            'googleSpecs' => collect($library)->where('source', 'google')->mapWithKeys(fn ($f) => [$f['family'] => $f['google']])->all(),
            'previewCss' => $faces,
        ];
    }
}
