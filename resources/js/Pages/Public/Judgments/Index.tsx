import { Link, router } from '@inertiajs/react';
import { ChevronDown, FileText, Gavel, RotateCcw, Scale, Search } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, DateTimePicker, Pagination } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

export type Judgment = { id: number; slug: string; court: string; court_name: string; case_type: string; case_number: string; title: string; judges: string; citation: string | null; tag_line: string | null; decision_date: string | null; uploaded_on: string; pdf_url: string | null; source_url: string | null };
type Court = { key: string; name: string; short: string; province: string; count: number };
type Filters = Partial<Record<'court' | 'year' | 'judge' | 'citation' | 'case' | 'title' | 'decided_from' | 'decided_to' | 'uploaded_from' | 'uploaded_to', string>>;

/** Judgments approved for reporting, High Court wise (Public\ReportedJudgmentController). */
export default function JudgmentsIndex({ judgments, courts, judges, years, filters, canonical }: { judgments: Paginated<Judgment>; courts: Court[]; judges: string[]; years: number[]; filters: Filters; canonical: string }) {
    const t = useT();
    const { locale } = useLocale();
    const [form, setForm] = useState<Filters>(filters);
    const [more, setMore] = useState(Boolean(filters.decided_from || filters.decided_to || filters.uploaded_from || filters.uploaded_to));
    const active = courts.find((c) => c.key === filters.court);
    const set = (key: keyof Filters, value: string) => setForm((f) => ({ ...f, [key]: value }));
    const apply = (next: Filters) => router.get(route('judgments.index'), Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { preserveScroll: true, preserveState: true });
    const submit = (e: FormEvent) => { e.preventDefault(); apply(form); };
    const anyFilter = Object.entries(filters).some(([k, v]) => k !== 'court' && v);
    const total = courts.reduce((n, c) => n + c.count, 0);

    return (
        <PublicLayout seo={{ title: active ? `${t('Reported judgments')}, ${active.name}` : t('Reported judgments'), description: t('Judgments approved for reporting by the High Courts of Pakistan, searchable by judge, citation, case number, title and date.'), canonical }}>
            <section className="border-b border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-950">
                <div className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-gold-700 dark:text-gold-300"><Scale className="size-4" />{t('Legal research')}</p>
                    <h1 className="mt-2 font-serif text-4xl font-semibold">{t('Judgments approved for reporting')}</h1>
                    <p className="mt-2 max-w-2xl text-navy-600 dark:text-navy-300">{t('Latest reportable judgments from every High Court. Filter by court, judge, citation, case number, title or date.')}</p>

                    <nav className="mt-7 flex gap-2 overflow-x-auto pb-1" aria-label={t('Courts')}>
                        <CourtTab active={!filters.court} onClick={() => apply({ ...filters, court: '' })} label={t('All courts')} count={total} />
                        {courts.map((c) => <CourtTab key={c.key} active={filters.court === c.key} onClick={() => apply({ ...filters, court: c.key, judge: '' })} label={c.name} sub={c.province} count={c.count} />)}
                    </nav>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <form onSubmit={submit} className="rounded-card border border-navy-100 bg-white p-5 shadow-card dark:border-navy-800 dark:bg-navy-900">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <FilterField label={t('Select year')}>
                            <select value={form.year ?? ''} onChange={(e) => set('year', e.target.value)} className={controlClasses(false)}>
                                <option value="">{t('Any year')}</option>
                                {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </FilterField>
                        <FilterField label={t('Hon’ble Judge')}>
                            <select value={form.judge ?? ''} onChange={(e) => set('judge', e.target.value)} className={controlClasses(false)}>
                                <option value="">{t('All judges')}</option>
                                {judges.map((j) => <option key={j} value={j}>{j}</option>)}
                            </select>
                        </FilterField>
                        <FilterField label={t('Citation or tag line')}><input value={form.citation ?? ''} onChange={(e) => set('citation', e.target.value)} placeholder={t('e.g. 2026 LHC 1234 or waqf')} className={controlClasses(false)} /></FilterField>
                        <FilterField label={t('Case number')}><input value={form.case ?? ''} onChange={(e) => set('case', e.target.value)} placeholder={t('e.g. 21229/26 or Civil Revision')} className={controlClasses(false)} /></FilterField>
                        <FilterField label={t('Title')} className="md:col-span-2"><input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder={t('Party names, e.g. Muhammad Irfan')} className={controlClasses(false)} /></FilterField>
                        {more && (
                            <>
                                <FilterField label={t('Decision date')}><div className="grid grid-cols-2 gap-2"><DateTimePicker type="date" value={form.decided_from ?? ''} onChange={(e) => set('decided_from', e.target.value)} placeholder={t('From')} /><DateTimePicker type="date" value={form.decided_to ?? ''} onChange={(e) => set('decided_to', e.target.value)} placeholder={t('To')} /></div></FilterField>
                                <FilterField label={t('Uploaded date')}><div className="grid grid-cols-2 gap-2"><DateTimePicker type="date" value={form.uploaded_from ?? ''} onChange={(e) => set('uploaded_from', e.target.value)} placeholder={t('From')} /><DateTimePicker type="date" value={form.uploaded_to ?? ''} onChange={(e) => set('uploaded_to', e.target.value)} placeholder={t('To')} /></div></FilterField>
                            </>
                        )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 pt-4 dark:border-navy-800">
                        <button type="button" onClick={() => setMore((m) => !m)} className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:underline dark:text-navy-200">
                            <ChevronDown className={cn('size-4 transition', more && 'rotate-180')} />{more ? t('Fewer filters') : t('Date filters')}
                        </button>
                        <div className="flex gap-2">
                            {anyFilter && <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => { setForm({ court: filters.court }); apply({ court: filters.court }); }}>{t('Clear')}</Button>}
                            <Button type="submit" icon={<Search className="size-4" />}>{t('Search')}</Button>
                        </div>
                    </div>
                </form>

                <div className="mt-8 flex items-baseline justify-between gap-3">
                    <h2 className="text-xl font-semibold">{anyFilter ? t('Search results') : t('Latest reported judgments')}{active && <span className="text-navy-500">, {active.short}</span>}</h2>
                    <p className="text-sm text-navy-500 tabular-nums">{t(':count judgments', { count: judgments.total })}</p>
                </div>

                {judgments.data.length === 0 ? (
                    <div className="mt-4 rounded-card border border-dashed border-navy-200 px-6 py-16 text-center dark:border-navy-700">
                        <Gavel className="mx-auto size-8 text-navy-300" />
                        <p className="mt-3 font-medium">{t('No judgments match these filters.')}</p>
                        <p className="mt-1 text-sm text-navy-500">{t('Try another court, a different spelling of the judge’s name or a wider date range.')}</p>
                    </div>
                ) : (
                    <ol className="mt-4 divide-y divide-navy-100 overflow-hidden rounded-card border border-navy-100 bg-white dark:divide-navy-800 dark:border-navy-800 dark:bg-navy-900">
                        {judgments.data.map((j, i) => (
                            <li key={j.id} className="group flex gap-4 px-5 py-4 transition hover:bg-navy-50/60 dark:hover:bg-navy-800/40">
                                <span className="w-8 shrink-0 pt-0.5 text-end text-sm font-semibold tabular-nums text-navy-400">{(judgments.from ?? 1) + i}.</span>
                                <div className="min-w-0 flex-1">
                                    <Link href={route('judgments.show', j.slug)} className="block">
                                        <p className="text-[15px] leading-snug text-navy-900 group-hover:underline dark:text-white">
                                            <span className="font-semibold">{j.case_type} {j.case_number}</span> <span>({j.title})</span>
                                        </p>
                                    </Link>
                                    <p className="mt-1 text-sm text-navy-600 dark:text-navy-300">{t('by')} {j.judges}{!filters.court && <span className="text-navy-400"> · {j.court_name}</span>}</p>
                                    {j.citation && <p className="mt-1 text-sm"><span className="rounded bg-gold-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">{j.citation}</span></p>}
                                    {j.tag_line && <p className="mt-1.5 text-sm italic text-navy-600 dark:text-navy-300"><span className="not-italic font-medium text-navy-800 dark:text-navy-100">{t('Tag line')}:</span> {j.tag_line}</p>}
                                    <p className="mt-1.5 text-xs text-navy-500">{t('Uploaded on')} {formatDate(j.uploaded_on, locale)}{j.decision_date && ` · ${t('Decided')} ${formatDate(j.decision_date, locale)}`}</p>
                                </div>
                                {(j.pdf_url || j.source_url) && (
                                    <a href={j.pdf_url ?? j.source_url ?? '#'} target="_blank" rel="noreferrer" className="hidden h-fit shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-navy-200 hover:bg-navy-50 sm:inline-flex dark:ring-navy-700 dark:hover:bg-navy-800">
                                        <FileText className="size-4 text-red-600" />{j.pdf_url ? 'PDF' : t('Source')}
                                    </a>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
                <div className="mt-4"><Pagination meta={judgments} /></div>
            </div>
        </PublicLayout>
    );
}

function CourtTab({ active, onClick, label, sub, count }: { active: boolean; onClick: () => void; label: string; sub?: string; count: number }) {
    return (
        <button type="button" onClick={onClick} className={cn('shrink-0 rounded-xl border px-4 py-2.5 text-start transition', active ? 'border-navy-900 bg-navy-900 text-white dark:border-gold-500 dark:bg-gold-500 dark:text-navy-950' : 'border-navy-100 bg-white hover:border-navy-300 dark:border-navy-800 dark:bg-navy-900 dark:hover:border-navy-600')}>
            <span className="flex items-center gap-2 text-sm font-semibold">{label}<span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-white/20' : 'bg-navy-100 text-navy-600 dark:bg-navy-800 dark:text-navy-300')}>{count}</span></span>
            {sub && <span className={cn('block text-xs', active ? 'opacity-80' : 'text-navy-500')}>{sub}</span>}
        </button>
    );
}

function FilterField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return <label className={cn('block', className)}><span className="mb-1.5 block text-sm font-medium text-navy-800 dark:text-navy-100">{label}</span>{children}</label>;
}
