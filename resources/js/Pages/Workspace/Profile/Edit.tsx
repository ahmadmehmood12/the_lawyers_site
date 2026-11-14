import { Link, router, useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, Camera, Check, ExternalLink, Newspaper, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Alert, Avatar, Button, Card, CardBody, CardHeader, Checkbox, Input, LinkButton, PageHeader, Select, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { Option, SharedProps } from '@/types';
import type { SelectOption } from '@/types/domain';

type Profile = Record<string, any>;
type Options = { barCouncils: SelectOption[]; categories: Option[]; specializations: SelectOption[]; courts: SelectOption[]; provinces: SelectOption[]; districts: SelectOption[]; cities: SelectOption[]; languages: string[] };

const labels: Record<string, string> = { identity: 'Identity & introduction', enrollment: 'Bar enrollment', qualifications: 'Education & experience', practice: 'Practice areas & courts', chamber: 'Chamber & consultations', publish: 'Publish' };

export default function ProfileEdit({ step, steps, profile, options }: { step: string; steps: string[]; profile: Profile; options: Options }) {
    const t = useT();
    const reached = profile.onboarding_step as number;

    return (
        <AppLayout title={t('Public Profile')} wide>
            <PageHeader
                title={t('Public Profile')}
                description={t('This is what clients see in the lawyer directory.')}
                actions={
                    <>
                        <StatusBadge value={profile.verification_status} label={profile.verification_label} />
                        <LinkButton href={route('lawyer.articles.index')} variant="secondary" icon={<Newspaper className="size-4" />}>{t('My articles')}</LinkButton>
                        <LinkButton href={route('lawyer.verification.show')} variant="secondary" icon={<BadgeCheck className="size-4" />}>{t('Verification')}</LinkButton>
                        {profile.is_public && <LinkButton href={route('lawyers.show', profile.slug)} variant="ghost" icon={<ExternalLink className="size-4" />} target="_blank">{t('View')}</LinkButton>}
                    </>
                }
            />
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label={t('Profile steps')}>
                    {steps.map((s, i) => {
                        const done = i + 1 < reached || profile.onboarding_completed;
                        return (
                            <Link key={s} href={route('lawyer.profile.edit', { step: s })} preserveScroll className={cn('flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm', s === step ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'hover:bg-navy-100 dark:hover:bg-navy-800')}>
                                <span className={cn('flex size-6 items-center justify-center rounded-full text-xs font-semibold', s === step ? 'bg-white/20' : done ? 'bg-verdant-100 text-verdant-700' : 'bg-navy-100 text-navy-600 dark:bg-navy-800')}>{done && s !== step ? <Check className="size-3.5" /> : i + 1}</span>
                                {t(labels[s])}
                            </Link>
                        );
                    })}
                </nav>
                <div>
                    {step === 'identity' && <Identity profile={profile} />}
                    {step === 'enrollment' && <Enrollment profile={profile} options={options} />}
                    {step === 'qualifications' && <Qualifications profile={profile} />}
                    {step === 'practice' && <Practice profile={profile} options={options} />}
                    {step === 'chamber' && <Chamber profile={profile} options={options} />}
                    {step === 'publish' && <Publish profile={profile} />}
                </div>
            </div>
        </AppLayout>
    );
}

function StepForm({ step, form, children, title, description }: { step: string; form: ReturnType<typeof useForm<any>>; children: React.ReactNode; title: string; description?: string }) {
    const t = useT();
    const submit = (e: FormEvent) => { e.preventDefault(); form.put(route('lawyer.profile.update', step), { preserveScroll: true }); };
    return (
        <form onSubmit={submit}>
            <Card>
                <CardHeader title={title} description={description} />
                <CardBody className="space-y-4">{children}</CardBody>
                <div className="flex justify-end border-t border-navy-100 px-5 py-3 dark:border-navy-800"><Button type="submit" loading={form.processing}>{t('Save and continue')}</Button></div>
            </Card>
        </form>
    );
}

function Identity({ profile }: { profile: Profile }) {
    const { auth } = usePage<SharedProps>().props;
    const t = useT();
    const form = useForm({ title: profile.title ?? '', cnic: profile.cnic ?? '', headline: profile.headline ?? '', bio: profile.bio ?? '', bio_ur: profile.bio_ur ?? '' });
    const photo = useForm({ photo: null as File | null });
    return (
        <div className="space-y-6">
            <Card>
                <CardBody className="flex items-center gap-4">
                    <Avatar name={auth.user?.name ?? profile.slug} src={profile.photo_url} size="xl" />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-navy-200 hover:bg-navy-50 dark:ring-navy-700">
                        <Camera className="size-4" />{t('Upload photograph')}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { photo.setData('photo', f); router.post(route('lawyer.profile.photo'), { photo: f }, { forceFormData: true, preserveScroll: true }); } }} />
                    </label>
                    {photo.errors.photo && <p className="text-xs text-red-600">{photo.errors.photo}</p>}
                </CardBody>
            </Card>
            <StepForm step="identity" form={form} title={t('Identity & introduction')}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Select label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder={t('None')} options={['Advocate', 'Barrister', 'Mr.', 'Ms.', 'Mrs.', 'Mian', 'Syed', 'Ch.', 'Malik', 'Raja', 'Rao', 'Sardar'].map((v) => ({ value: v, label: v }))} />
                    <Input label={t('CNIC')} value={form.data.cnic} onChange={(e) => form.setData('cnic', e.target.value)} error={form.errors.cnic} className="ltr-nums" hint={t('Encrypted. Used only for verification, never shown publicly.')} required />
                </div>
                <Input label={t('Headline')} value={form.data.headline} onChange={(e) => form.setData('headline', e.target.value)} placeholder={t('e.g. Advocate High Court — criminal & family law')} />
                <Textarea label={t('About you (English)')} rows={5} value={form.data.bio} onChange={(e) => form.setData('bio', e.target.value)} />
                <Textarea label={t('About you (Urdu)')} dir="rtl" rows={5} value={form.data.bio_ur} onChange={(e) => form.setData('bio_ur', e.target.value)} />
            </StepForm>
        </div>
    );
}

function Enrollment({ profile, options }: { profile: Profile; options: Options }) {
    const t = useT();
    const form = useForm({ bar_council_id: String(profile.bar_council_id ?? ''), enrollment_number: profile.enrollment_number ?? '', advocate_category: profile.advocate_category ?? '', enrollment_date: profile.enrollment_date ?? '', practice_since: String(profile.practice_since ?? '') });
    return (
        <StepForm step="enrollment" form={form} title={t('Bar enrollment')} description={t('These details are checked by our verification team against your Bar license.')}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Select label={t('Bar Council')} value={form.data.bar_council_id} onChange={(e) => form.setData('bar_council_id', e.target.value)} options={options.barCouncils} placeholder={t('Select')} error={form.errors.bar_council_id} required />
                <Input label={t('Enrollment / license number')} value={form.data.enrollment_number} onChange={(e) => form.setData('enrollment_number', e.target.value)} error={form.errors.enrollment_number} className="ltr-nums" required />
                <Select label={t('Advocate category')} value={form.data.advocate_category} onChange={(e) => form.setData('advocate_category', e.target.value)} options={options.categories} placeholder={t('Select')} error={form.errors.advocate_category} required />
                <Input label={t('Enrollment date')} type="date" value={form.data.enrollment_date} onChange={(e) => form.setData('enrollment_date', e.target.value)} error={form.errors.enrollment_date} />
                <Input label={t('Practising since (year)')} type="number" min={1950} max={new Date().getFullYear()} value={form.data.practice_since} onChange={(e) => form.setData('practice_since', e.target.value)} error={form.errors.practice_since} required />
            </div>
        </StepForm>
    );
}

function Qualifications({ profile }: { profile: Profile }) {
    const t = useT();
    const form = useForm({ educations: profile.educations ?? [], experiences: profile.experiences ?? [], credentials: profile.credentials ?? [] });
    type Row = Record<string, string | number | boolean | null>;
    type Key = 'educations' | 'experiences' | 'credentials';
    /** text | year | select | current */
    type FieldDef = [string, string, string?];
    const thisYear = new Date().getFullYear();
    const years = Array.from({ length: thisYear - 1949 }, (_, i) => ({ value: String(thisYear - i), label: String(thisYear - i) }));
    const errorOf = (key: Key, i: number, field: string) => (form.errors as Record<string, string>)[`${key}.${i}.${field}`];
    const update = (key: Key, i: number, patch: Row) => form.setData(key, (form.data[key] as Row[]).map((r, j) => (j === i ? { ...r, ...patch } : r)));

    const list = (key: Key, blank: Row, fields: FieldDef[], addLabel: string) => (
        <div className="space-y-3">
            {(form.data[key] as Row[]).map((row, i) => (
                <div key={i} className={cn('rounded-lg border p-3', row.is_current ? 'border-gold-300 bg-gold-50/40 dark:border-gold-500/30 dark:bg-gold-500/5' : 'border-navy-100 dark:border-navy-800')}>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_8rem_8rem_auto]">
                        {fields.filter(([, , type]) => type !== 'current').map(([field, label, type]) => {
                            const disabled = field === 'end_year' && Boolean(row.is_current);
                            if (type === 'select') {
                                return <Select key={field} label={t(label)} value={String(row[field] ?? '')} onChange={(e) => update(key, i, { [field]: e.target.value })} error={errorOf(key, i, field)}
                                    options={[{ value: 'publication', label: t('Publication') }, { value: 'certification', label: t('Certification') }, { value: 'award', label: t('Award') }, { value: 'membership', label: t('Membership') }]} />;
                            }
                            if (type === 'year') {
                                return <Select key={field} label={t(label)} value={disabled ? '' : String(row[field] ?? '')} disabled={disabled} onChange={(e) => update(key, i, { [field]: e.target.value ? Number(e.target.value) : null })}
                                    options={years} placeholder={disabled ? t('Present') : t('Year')} error={errorOf(key, i, field)} />;
                            }
                            return <Input key={field} label={t(label)} value={String(row[field] ?? '')} onChange={(e) => update(key, i, { [field]: e.target.value || null })} error={errorOf(key, i, field)} required />;
                        })}
                        <div className="flex items-end justify-end"><Button variant="ghost" size="sm" aria-label={t('Remove')} onClick={() => form.setData(key, (form.data[key] as Row[]).filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button></div>
                    </div>
                    {fields.some(([, , type]) => type === 'current') && (
                        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
                            <input type="checkbox" className="size-4 accent-navy-900" checked={Boolean(row.is_current)} onChange={(e) => update(key, i, { is_current: e.target.checked, ...(e.target.checked ? { end_year: null } : {}) })} />
                            {t('I currently work here')}
                            {row.is_current && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-700">{t('Current position')}</span>}
                        </label>
                    )}
                </div>
            ))}
            <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => form.setData(key, [...(form.data[key] as Row[]), blank])}>{addLabel}</Button>
        </div>
    );
    return (
        <StepForm step="qualifications" form={form} title={t('Education & experience')} description={t('Self-reported unless verified. Shown on your profile.')}>
            <h4 className="font-sans text-sm font-semibold">{t('Education')}</h4>
            {list('educations', { degree: '', institution: '', year: null }, [['degree', 'Degree'], ['institution', 'Institution'], ['year', 'Year', 'year']], t('Add education'))}
            <h4 className="pt-2 font-sans text-sm font-semibold">{t('Experience')}</h4>
            <p className="-mt-2 text-xs text-navy-500">{t('Add your current position and past roles. Tick “I currently work here” for your present position.')}</p>
            {list('experiences', { position: '', organization: '', start_year: null, end_year: null, is_current: false }, [['position', 'Position'], ['organization', 'Organization'], ['start_year', 'From', 'year'], ['end_year', 'To', 'year'], ['is_current', '', 'current']], t('Add position'))}
            <h4 className="pt-2 font-sans text-sm font-semibold">{t('Publications & certifications')}</h4>
            {list('credentials', { type: 'publication', title: '', issuer: '', year: null }, [['type', 'Type', 'select'], ['title', 'Title'], ['issuer', 'Publisher / issuer'], ['year', 'Year', 'year']], t('Add publication or certificate'))}
        </StepForm>
    );
}

function Practice({ profile, options }: { profile: Profile; options: Options }) {
    const t = useT();
    const form = useForm({ specialization_ids: (profile.specialization_ids ?? []).map(String) as string[], primary_specialization_id: String(profile.primary_specialization_id ?? ''), court_ids: (profile.court_ids ?? []).map(String) as string[], languages: (profile.languages ?? []) as string[] });
    const toggle = (key: 'specialization_ids' | 'court_ids' | 'languages', value: string) => form.setData(key, form.data[key].includes(value) ? form.data[key].filter((v) => v !== value) : [...form.data[key], value]);
    const chip = (active: boolean) => cn('rounded-full px-3 py-1.5 text-sm ring-1 ring-inset', active ? 'bg-navy-900 text-white ring-navy-900 dark:bg-gold-500 dark:text-navy-950' : 'ring-navy-200 hover:bg-navy-50 dark:ring-navy-700 dark:hover:bg-navy-800');
    return (
        <StepForm step="practice" form={form} title={t('Practice areas & courts')}>
            <div>
                <p className="mb-2 text-sm font-medium">{t('Practice areas')} <span className="text-xs text-navy-500">({t('up to 8')})</span></p>
                <div className="flex flex-wrap gap-2">{options.specializations.map((s) => <button type="button" key={s.value} className={chip(form.data.specialization_ids.includes(String(s.value)))} onClick={() => toggle('specialization_ids', String(s.value))}>{s.label}</button>)}</div>
                {form.errors.specialization_ids && <p className="mt-1 text-xs text-red-600">{form.errors.specialization_ids}</p>}
            </div>
            {form.data.specialization_ids.length > 1 && <Select label={t('Primary practice area')} value={form.data.primary_specialization_id} onChange={(e) => form.setData('primary_specialization_id', e.target.value)} options={options.specializations.filter((s) => form.data.specialization_ids.includes(String(s.value)))} placeholder={t('Select')} />}
            <div>
                <p className="mb-2 text-sm font-medium">{t('Languages')}</p>
                <div className="flex flex-wrap gap-2">{options.languages.map((l) => <button type="button" key={l} className={chip(form.data.languages.includes(l))} onClick={() => toggle('languages', l)}>{t(l)}</button>)}</div>
                {form.errors.languages && <p className="mt-1 text-xs text-red-600">{form.errors.languages}</p>}
            </div>
            <CourtPicker courts={options.courts} selected={form.data.court_ids} onToggle={(id) => toggle('court_ids', id)} onClear={() => form.setData('court_ids', [])} chip={chip} error={form.errors.court_ids} />
        </StepForm>
    );
}

function Chamber({ profile, options }: { profile: Profile; options: Options }) {
    const t = useT();
    const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    const form = useForm({ province_id: s(profile.province_id), district_id: s(profile.district_id), city_id: s(profile.city_id), chamber_address: s(profile.chamber_address), public_phone: s(profile.public_phone), public_email: s(profile.public_email), consultation_fee_min: s(profile.consultation_fee_min), consultation_fee_max: s(profile.consultation_fee_max), offers_online: !!profile.offers_online, offers_in_person: profile.offers_in_person ?? true, accepting_clients: profile.accepting_clients ?? true });
    form.transform((d) => ({ ...d, consultation_fee_min: d.consultation_fee_min || null, consultation_fee_max: d.consultation_fee_max || null }));
    return (
        <StepForm step="chamber" form={form} title={t('Chamber & consultations')}>
            <div className="grid gap-4 sm:grid-cols-3">
                <Select label={t('Province')} value={form.data.province_id} onChange={(e) => form.setData((d) => ({ ...d, province_id: e.target.value, district_id: '', city_id: '' }))} options={options.provinces} placeholder={t('Select')} error={form.errors.province_id} required />
                <Select label={t('District')} value={form.data.district_id} onChange={(e) => form.setData((d) => ({ ...d, district_id: e.target.value, city_id: '' }))} options={options.districts.filter((d) => String(d.province_id) === form.data.province_id)} placeholder={t('Select')} error={form.errors.district_id} required />
                <Select label={t('City')} value={form.data.city_id} onChange={(e) => form.setData('city_id', e.target.value)} options={options.cities.filter((c) => String(c.district_id) === form.data.district_id)} placeholder={t('Select')} error={form.errors.city_id} required />
            </div>
            <Input label={t('Chamber address')} value={form.data.chamber_address} onChange={(e) => form.setData('chamber_address', e.target.value)} error={form.errors.chamber_address} required />
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Public phone')} type="tel" value={form.data.public_phone} onChange={(e) => form.setData('public_phone', e.target.value)} error={form.errors.public_phone} />
                <Input label={t('Public email')} type="email" value={form.data.public_email} onChange={(e) => form.setData('public_email', e.target.value)} error={form.errors.public_email} />
                <Input label={t('Consultation fee from (PKR)')} type="number" min={0} value={form.data.consultation_fee_min} onChange={(e) => form.setData('consultation_fee_min', e.target.value)} />
                <Input label={t('Consultation fee to (PKR)')} type="number" min={0} value={form.data.consultation_fee_max} onChange={(e) => form.setData('consultation_fee_max', e.target.value)} error={form.errors.consultation_fee_max} />
            </div>
            <div className="flex flex-wrap gap-5">
                <Checkbox label={t('In-person consultations')} checked={form.data.offers_in_person} onChange={(e) => form.setData('offers_in_person', e.target.checked)} />
                <Checkbox label={t('Online consultations')} checked={form.data.offers_online} onChange={(e) => form.setData('offers_online', e.target.checked)} />
                <Checkbox label={t('Accepting new clients')} checked={form.data.accepting_clients} onChange={(e) => form.setData('accepting_clients', e.target.checked)} />
            </div>
            <p className="text-xs text-navy-500">{t('Set your weekly consultation hours on the Appointments page.')}</p>
        </StepForm>
    );
}

function Publish({ profile }: { profile: Profile }) {
    const t = useT();
    const form = useForm({ is_public: !!profile.is_public });
    return (
        <StepForm step="publish" form={form} title={t('Publish')}>
            <Checkbox label={t('List my profile in the public lawyer directory')} checked={form.data.is_public} onChange={(e) => form.setData('is_public', e.target.checked)} />
            <Alert tone="info">{t('Your profile shows “Verified” only after our team approves your Bar enrollment evidence. Until then it is clearly marked as self-reported.')}</Alert>
        </StepForm>
    );
}

/** Courts of practice as chips (like practice areas), with search because the list is long. */
function CourtPicker({ courts, selected, onToggle, onClear, chip, error }: { courts: SelectOption[]; selected: string[]; onToggle: (id: string) => void; onClear: () => void; chip: (active: boolean) => string; error?: string }) {
    const t = useT();
    const [query, setQuery] = useState('');
    const [showAll, setShowAll] = useState(false);
    const chosen = courts.filter((c) => selected.includes(String(c.value)));
    const q = query.trim().toLowerCase();
    const matches = courts.filter((c) => !selected.includes(String(c.value)) && (!q || c.label.toLowerCase().includes(q)));
    const visible = showAll || q ? matches.slice(0, 200) : matches.slice(0, 24);
    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{t('Courts of practice')} <span className="text-xs text-navy-500">({t(':count selected', { count: selected.length })})</span></p>
                {selected.length > 0 && <button type="button" onClick={onClear} className="text-xs text-navy-500 hover:underline">{t('Clear all')}</button>}
            </div>
            {chosen.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {chosen.map((c) => <button type="button" key={c.value} className={chip(true)} onClick={() => onToggle(String(c.value))}>{c.label} <span aria-hidden className="ms-1 opacity-70">×</span></button>)}
                </div>
            )}
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search courts, for example Lahore High Court or Sessions Kasur')} aria-label={t('Search courts')}
                className="mb-2 w-full rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-navy-200 focus:ring-2 focus:ring-gold-500 dark:bg-navy-900 dark:ring-navy-700" />
            <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto pe-1">
                {visible.map((c) => <button type="button" key={c.value} className={chip(false)} onClick={() => onToggle(String(c.value))}>{c.label}</button>)}
                {visible.length === 0 && <p className="text-sm text-navy-500">{q ? t('No court matches your search.') : t('All courts selected.')}</p>}
            </div>
            {!q && !showAll && matches.length > visible.length && <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-sm font-medium text-navy-700 hover:underline dark:text-navy-200">{t('Show all :count courts', { count: matches.length })}</button>}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
