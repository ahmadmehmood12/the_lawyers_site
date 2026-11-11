import { useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmAction, Input, Select } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

type Slot = 'body' | 'heading' | 'urdu_body' | 'urdu_heading';
type FontOption = { value: string; label: string; source: 'bundled' | 'google' | 'upload' | 'suggestion'; category: string };
type LibraryFont = { id: string; family: string; source: 'google' | 'upload'; script: 'latin' | 'urdu'; category: string; files: { weight: string; format: string }[]; in_use: boolean };

export type TypographyPayload = {
    choices: Record<Slot, string>;
    slots: Record<Slot, 'latin' | 'urdu'>;
    options: Record<'latin' | 'urdu', FontOption[]>;
    library: LibraryFont[];
    googleSpecs: Record<string, string>;
    previewCss: string;
};

const fileClasses = 'block w-full text-sm text-navy-700 file:me-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:bg-navy-200 dark:text-navy-200 dark:file:bg-navy-800 dark:file:text-navy-100';

/** Loads a Google family into this page only, so the preview shows it before saving. */
function useGoogleFonts(families: string[], specs: Record<string, string>) {
    useEffect(() => {
        families.forEach((family) => {
            const id = `font-preview-${family.replace(/\s+/g, '-')}`;
            if (document.getElementById(id)) return;
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${specs[family] ?? family.replace(/ /g, '+')}&display=swap`;
            document.head.appendChild(link);
        });
    }, [families, specs]);
}

/**
 * Admin, Settings, Typography: the four site fonts (English text and headings, Urdu text and
 * headings), a live preview, and a library of added fonts (Google Fonts or uploaded files).
 */
export function TypographySettings({ typography }: { typography: TypographyPayload }) {
    const t = useT();
    const form = useForm<Record<Slot, string>>({ ...typography.choices });
    const all = useMemo(() => [...typography.options.latin, ...typography.options.urdu], [typography.options]);
    const sourceOf = (family: string) => all.find((o) => o.value === family)?.source;
    const previewGoogle = useMemo(() => Object.values(form.data).filter((f) => ['google', 'suggestion'].includes(sourceOf(f) ?? '')), [form.data, all]);
    useGoogleFonts(previewGoogle, typography.googleSpecs);

    const stack = (family: string, script: 'latin' | 'urdu') => `"${family}", ${script === 'urdu' ? '"Noto Nastaliq Urdu", serif' : family === 'Inter' ? '"Inter Fallback", Arial, sans-serif' : 'Arial, sans-serif'}`;
    const label = (o: FontOption) => `${o.label} (${o.source === 'bundled' ? t('included') : o.source === 'upload' ? t('uploaded') : 'Google'})`;
    const slotSelect = (slot: Slot, text: string) => (
        <Select label={text} value={form.data[slot]} onChange={(e) => form.setData(slot, e.target.value)} error={form.errors[slot]} options={typography.options[typography.slots[slot]].map((o) => ({ value: o.value, label: label(o) }))} />
    );

    return (
        <Card className="lg:col-span-2">
            <style>{typography.previewCss}</style>
            <CardHeader title={t('Typography')} description={t('Fonts for the whole site. Included fonts are served from this server; Google fonts load from fonts.googleapis.com; uploaded fonts are served from your storage.')} />
            <CardBody className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <p className="text-sm font-semibold">English</p>
                        {slotSelect('body', t('Text and interface'))}
                        {slotSelect('heading', t('Headings'))}
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm font-semibold">اردو</p>
                        {slotSelect('urdu_body', t('Urdu text'))}
                        {slotSelect('urdu_heading', t('Urdu headings'))}
                    </div>
                </div>

                <div className="grid gap-4 rounded-xl border border-navy-100 bg-ivory p-5 md:grid-cols-2 dark:border-navy-800 dark:bg-navy-950" aria-label={t('Preview')}>
                    <div style={{ fontFamily: stack(form.data.body, 'latin') }}>
                        <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: stack(form.data.heading, 'latin') }}>Next hearing: 14 November</p>
                        <p className="mt-2 text-sm leading-relaxed text-navy-700 dark:text-navy-200">Bail application before the Sessions Judge, Lahore. Bring the certified copy of the FIR and the last order.</p>
                    </div>
                    <div dir="rtl" lang="ur" style={{ fontFamily: stack(form.data.urdu_body, 'urdu') }}>
                        <p className="text-2xl leading-[1.9] font-semibold" style={{ fontFamily: stack(form.data.urdu_heading, 'urdu') }}>اگلی سماعت: 14 نومبر</p>
                        <p className="mt-2 text-sm leading-[2.1] text-navy-700 dark:text-navy-200">سیشن جج لاہور کی عدالت میں درخواستِ ضمانت۔ ایف آئی آر کی مصدقہ نقل اور آخری حکم ساتھ لائیں۔</p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button loading={form.processing} onClick={() => form.put(route('admin.font-settings.update'), { preserveScroll: true })}>{t('Save fonts')}</Button>
                </div>

                <FontLibrary library={typography.library} />
                <AddFont />
            </CardBody>
        </Card>
    );
}

function FontLibrary({ library }: { library: LibraryFont[] }) {
    const t = useT();
    if (library.length === 0) return null;
    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold">{t('Your fonts')}</p>
            <ul className="divide-y divide-navy-100 rounded-lg border border-navy-100 dark:divide-navy-800 dark:border-navy-800">
                {library.map((font) => (
                    <li key={font.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-lg" style={{ fontFamily: `"${font.family}", ${font.script === 'urdu' ? 'serif' : 'sans-serif'}` }} dir={font.script === 'urdu' ? 'rtl' : undefined}>{font.script === 'urdu' ? 'عدالت، سماعت، وکیل' : font.family}</p>
                            <p className="text-xs text-navy-500">{font.family}, {font.script === 'urdu' ? t('Urdu') : t('English')}{font.files.length > 0 && `, ${t('weights')}: ${font.files.map((f) => (f.weight === 'variable' ? t('variable') : f.weight)).join(', ')}`}</p>
                        </div>
                        <Badge tone={font.source === 'google' ? 'blue' : 'neutral'}>{font.source === 'google' ? 'Google Fonts' : t('Uploaded')}</Badge>
                        {font.in_use && <Badge tone="green">{t('In use')}</Badge>}
                        <ConfirmAction href={route('admin.fonts.destroy', font.id)} method="delete" title={t('Remove :name?', { name: font.family })} description={font.in_use ? t('Places that use it go back to the default font.') : undefined} trigger={(open) => <Button size="sm" variant="ghost" aria-label={t('Remove')} onClick={open}><Trash2 className="size-4" /></Button>} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function AddFont() {
    const t = useT();
    const form = useForm<{ source: 'google' | 'upload'; family: string; script: 'latin' | 'urdu'; category: string; weight: string; file: File | null }>({ source: 'google', family: '', script: 'latin', category: 'sans-serif', weight: '400', file: null });
    const [fileKey, setFileKey] = useState(0);
    const submit = () => form.post(route('admin.fonts.store'), { preserveScroll: true, forceFormData: true, onSuccess: () => { form.reset('family', 'file'); setFileKey((k) => k + 1); } });

    return (
        <div className="space-y-4 rounded-lg border border-dashed border-navy-200 p-4 dark:border-navy-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">{t('Add a font')}</p>
                <div className="inline-flex rounded-lg bg-navy-100 p-0.5 text-sm dark:bg-navy-800" role="group">
                    {(['google', 'upload'] as const).map((source) => (
                        <button key={source} type="button" aria-pressed={form.data.source === source} onClick={() => form.setData('source', source)} className={cn('rounded-md px-3 py-1 font-medium transition-colors', form.data.source === source ? 'bg-white text-navy-900 shadow-xs dark:bg-navy-950 dark:text-white' : 'text-navy-600 dark:text-navy-300')}>
                            {source === 'google' ? 'Google Fonts' : t('Upload a file')}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
                <Input label={t('Font name')} value={form.data.family} onChange={(e) => form.setData('family', e.target.value)} error={form.errors.family} placeholder={form.data.source === 'google' ? 'Poppins' : 'Jameel Noori Nastaleeq'} hint={form.data.source === 'google' ? t('Exact name from fonts.google.com. It is checked with Google before saving.') : t('Letters, numbers, spaces and hyphens.')} required />
                <Select label={t('Language')} value={form.data.script} onChange={(e) => form.setData('script', e.target.value as 'latin' | 'urdu')} options={[{ value: 'latin', label: t('English') }, { value: 'urdu', label: t('Urdu') }]} />
                <Select label={t('Style')} value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} options={[{ value: 'sans-serif', label: t('Sans serif') }, { value: 'serif', label: t('Serif') }, { value: 'display', label: t('Display') }, { value: 'monospace', label: t('Monospace') }]} />
            </div>
            {form.data.source === 'upload' && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Select label={t('Weight')} value={form.data.weight} onChange={(e) => form.setData('weight', e.target.value)} error={form.errors.weight} options={[{ value: '400', label: t('Regular (400)') }, { value: '500', label: t('Medium (500)') }, { value: '600', label: t('Semibold (600)') }, { value: '700', label: t('Bold (700)') }, { value: 'variable', label: t('Variable (all weights)') }]} />
                    <div className="space-y-1.5 sm:col-span-2">
                        <p className="text-sm font-medium text-navy-800 dark:text-navy-200">{t('Font file')}</p>
                        <input key={fileKey} type="file" accept=".woff2,.woff,.ttf,.otf" className={fileClasses} aria-label={t('Font file')} onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)} />
                        <p className="text-xs text-navy-500 dark:text-navy-400">{t('WOFF2 (best), WOFF, TTF or OTF, up to 5 MB. Upload each weight of the same font name separately. Only upload fonts you are licensed to use on a website.')}</p>
                        {form.errors.file && <p className="text-xs text-red-600">{form.errors.file}</p>}
                    </div>
                </div>
            )}
            <div className="flex justify-end">
                <Button variant="secondary" loading={form.processing} disabled={!form.data.family || (form.data.source === 'upload' && !form.data.file)} onClick={submit}>{t('Add font')}</Button>
            </div>
        </div>
    );
}
