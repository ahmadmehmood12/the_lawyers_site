import { Link, router } from '@inertiajs/react';
import { ChevronDown, ExternalLink, FileText, Gavel, LayoutGrid, List, RotateCcw, Scale, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, DateTimePicker, Pagination, Select } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import AppLayout from '@/Layouts/AppLayout';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

export type Judgment = { id: number; slug: string; court: string; court_name: string; court_short: string; case_type: string; case_number: string; title: string; judges: string; citation: string | null; other_citation: string | null; sc_citation: string | null; cited_citations: string[]; tag_line: string | null; remarks: string | null; decision_date: string | null; uploaded_on: string; pdf_url: string | null; source_url: string | null };
type Court = { key: string; name: string; short: string; province: string; count: number };
type Filters = Partial<Record<'court' | 'year' | 'judge' | 'citation' | 'case' | 'title' | 'decided_from' | 'decided_to' | 'uploaded_from' | 'uploaded_to', string>>;

/** Judgments approved for reporting, High Court wise (Public\ReportedJudgmentController). */
export default function JudgmentsIndex({ judgments, courts, judges, years, filters, canonical, embedded = null }: { judgments: Paginated<Judgment>; courts: Court[]; judges: string[]; years: number[]; filters: Filters; canonical: string; embedded?: 'portal' | 'workspace' | null }) {
    const t = useT();
    const { locale } = useLocale();
    const [form, setForm] = useState<Filters>(filters);
    const [more, setMore] = useState(Boolean(filters.decided_from || filters.decided_to || filters.uploaded_from || filters.uploaded_to));
    const active = courts.find((c) => c.key === filters.court);
    const indexRoute = embedded === 'workspace' ? 'judgments.workspace.index' : 'judgments.index';
    const showRoute = embedded === 'workspace' ? 'judgments.workspace.show' : 'judgments.show';
    const set = (key: keyof Filters, value: string) => setForm((f) => ({ ...f, [key]: value }));
    const apply = (next: Filters) => router.get(route(indexRoute), Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { preserveScroll: true, preserveState: true });
    const submit = (e: FormEvent) => { e.preventDefault(); apply(form); };
    // When searching a citation, show which cited case matched for judgments that cite it.
    const compact = (v: string) => v.toLowerCase().replace(/[\s.,]+/g, '');
    const citedMatch = (j: Judgment) => {
        const q = filters.citation ? compact(filters.citation) : '';
        if (!q || (j.citation && compact(j.citation).includes(q))) return null;
        return j.cited_citations.find((c) => compact(c).includes(q)) ?? null;
    };
    const anyFilter = Object.entries(filters).some(([k, v]) => k !== 'court' && v);
    // List (default) or grid of cards; the choice is remembered on this device.
    const [view, setView] = useState<'list' | 'grid'>('list');
    useEffect(() => {
        try { if (localStorage.getItem('judgments-view') === 'grid') setView('grid'); } catch { /* storage unavailable */ }
    }, []);
    const chooseView = (next: 'list' | 'grid') => {
        setView(next);
        try { localStorage.setItem('judgments-view', next); } catch { /* storage unavailable */ }
    };
    const chips = (j: Judgment) => (j.citation || j.other_citation || j.sc_citation || citedMatch(j)) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
            {j.citation && <span className="rounded bg-gold-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">{j.citation}</span>}
            {j.sc_citation && <span className="rounded bg-gold-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">{j.sc_citation}</span>}
            {j.other_citation && <span className="rounded bg-navy-50 px-1.5 py-0.5 font-mono text-xs font-medium text-navy-700 dark:bg-navy-800 dark:text-navy-200">{j.other_citation}</span>}
            {citedMatch(j) && <span className="text-xs text-navy-500">{t('Cites')} <span className="font-mono font-medium text-navy-700 dark:text-navy-200">{citedMatch(j)}</span></span>}
        </p>
    );
    const courtBadge = (j: Judgment) => <span className="inline-flex items-center rounded bg-navy-900 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-gold-500 dark:text-navy-950" title={j.court_name}>{j.court_short}</span>;
    const pdfLink = (j: Judgment, className: string) => (j.pdf_url || j.source_url) && (
        <a href={j.pdf_url ?? j.source_url ?? '#'} target="_blank" rel="noreferrer" className={className}>
            {j.pdf_url ? <FileText className="size-4 text-red-600" /> : <ExternalLink className="size-4" />}{j.pdf_url ? 'PDF' : t('Open judgment')}
        </a>
    );
    const total = courts.reduce((n, c) => n + c.count, 0);

    const content = (
        <>
            <section className="border-b border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-950">
                <div className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-gold-700 dark:text-gold-300"><Scale className="size-4" />{t('Legal research')}</p>
                    <h1 className="mt-2 font-serif text-4xl font-semibold">{t('Judgments approved for reporting')}</h1>
                    <p className="mt-2 max-w-2xl text-navy-600 dark:text-navy-300">{t('Reported judgments of the Supreme Court, the Federal Constitutional and Shariat Courts and every High Court. Filter by court, judge, citation, case number, title or date.')}</p>

                    <nav className="mt-7 flex gap-2 overflow-x-auto pb-1" aria-label={t('Courts')}>
                        <CourtTab active={!filters.court} onClick={() => apply({ ...filters, court: '' })} label={t('All courts')} count={total} />
                        {courts.map((c) => <CourtTab key={c.key} active={filters.court === c.key} onClick={() => apply({ ...filters, court: c.key, judge: '' })} label={c.name} sub={c.province} count={c.count} />)}
                    </nav>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <form onSubmit={submit} className="rounded-card border border-navy-100 bg-white p-5 shadow-card dark:border-navy-800 dark:bg-navy-900">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <FilterField label={t('Court')} labelElement="div">
                            <Select value={form.court ?? ''} onChange={(e) => setForm((f) => ({ ...f, court: e.target.value, judge: '' }))} aria-label={t('Court')} placeholder={t('All courts')} options={courts.map((c) => ({ value: c.key, label: c.name }))} />
                        </FilterField>
                        <FilterField label={t('Select year')} labelElement="div">
                            <Select value={form.year ?? ''} onChange={(e) => set('year', e.target.value)} aria-label={t('Select year')} placeholder={t('Any year')} options={years.map((y) => ({ value: y, label: String(y) }))} />
                        </FilterField>
                        <FilterField label={t('Hon’ble Judge')} labelElement="div">
                            <Select value={form.judge ?? ''} onChange={(e) => set('judge', e.target.value)} aria-label={t('Hon’ble Judge')} placeholder={t('All judges')} options={judges.map((j) => ({ value: j, label: j }))} />
                        </FilterField>
                        <FilterField label={t('Citation')}><input value={form.citation ?? ''} onChange={(e) => set('citation', e.target.value)} placeholder={t('e.g. 2026 PHC 7407, 2016 YLR 1229 or a keyword')} className={controlClasses(false)} /></FilterField>
                        <FilterField label={t('Case number')}><input value={form.case ?? ''} onChange={(e) => set('case', e.target.value)} placeholder={t('e.g. 21229/26 or Civil Revision')} className={controlClasses(false)} /></FilterField>
                        <FilterField label={t('Title')}><input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder={t('Party names, e.g. Muhammad Irfan')} className={controlClasses(false)} /></FilterField>
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
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-navy-500 tabular-nums">{t(':count judgments', { count: judgments.total })}</p>
                        <div className="inline-flex rounded border border-navy-200 bg-white p-0.5 dark:border-navy-700 dark:bg-navy-900" role="radiogroup" aria-label={t('View')}>
                            {([['list', t('List view'), List], ['grid', t('Grid view'), LayoutGrid]] as const).map(([key, label, Icon]) => (
                                <button key={key} type="button" role="radio" aria-checked={view === key} aria-label={label} title={label} onClick={() => chooseView(key)}
                                    className={cn('grid size-8 place-items-center rounded transition', view === key ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-500 hover:text-navy-900 dark:hover:text-white')}>
                                    <Icon className="size-4" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {judgments.data.length === 0 ? (
                    <div className="mt-4 rounded-card border border-dashed border-navy-200 px-6 py-16 text-center dark:border-navy-700">
                        <Gavel className="mx-auto size-8 text-navy-300" />
                        <p className="mt-3 font-medium">{t('No judgments match these filters.')}</p>
                        <p className="mt-1 text-sm text-navy-500">{t('Try another court, a different spelling of the judge’s name or a wider date range.')}</p>
                    </div>
                ) : view === 'grid' ? (
                    <ol className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {judgments.data.map((j) => (
                            <li key={j.id} className="group flex flex-col rounded-card border border-navy-100 bg-white p-5 shadow-card transition hover:border-navy-300 dark:border-navy-800 dark:bg-navy-900 dark:hover:border-navy-600">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="flex min-w-0 items-center gap-2">{courtBadge(j)}<span className="truncate text-xs text-navy-500">{j.court_name}</span></span>
                                    {j.decision_date && <span className="shrink-0 text-xs tabular-nums text-navy-500">{formatDate(j.decision_date, locale)}</span>}
                                </div>
                                <Link href={route(showRoute, j.slug)} className="mt-3 block">
                                    <p className="text-sm font-semibold text-navy-500 dark:text-navy-300">{j.case_type} {j.case_number}</p>
                                    <p className="mt-1 line-clamp-3 font-serif text-lg font-semibold leading-snug text-navy-900 group-hover:underline dark:text-white">{j.title}</p>
                                </Link>
                                <p className="mt-2 line-clamp-2 text-sm text-navy-600 dark:text-navy-300">{j.judges}</p>
                                {chips(j)}
                                {(j.tag_line || j.remarks) && <p className="mt-2 line-clamp-3 text-sm text-navy-600 dark:text-navy-300">{j.tag_line ?? j.remarks}</p>}
                                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                                    <Link href={route(showRoute, j.slug)} className="text-sm font-medium text-navy-900 hover:underline dark:text-gold-300">{t('Read judgment')}</Link>
                                    {pdfLink(j, 'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium ring-1 ring-navy-200 hover:bg-navy-50 dark:ring-navy-700 dark:hover:bg-navy-800')}
                                </div>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <ol className="mt-4 divide-y divide-navy-100 overflow-hidden rounded-card border border-navy-100 bg-white dark:divide-navy-800 dark:border-navy-800 dark:bg-navy-900">
                        {judgments.data.map((j, i) => (
                            <li key={j.id} className="group flex gap-4 px-5 py-4 transition hover:bg-navy-50/60 dark:hover:bg-navy-800/40">
                                <span className="w-8 shrink-0 pt-0.5 text-end text-sm font-semibold tabular-nums text-navy-400">{(judgments.from ?? 1) + i}.</span>
                                <div className="min-w-0 flex-1">
                                    <Link href={route(showRoute, j.slug)} className="block">
                                        <p className="text-[15px] leading-snug text-navy-900 group-hover:underline dark:text-white">
                                            <span className="font-semibold">{j.case_type} {j.case_number}</span> <span>({j.title})</span>
                                        </p>
                                    </Link>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy-600 dark:text-navy-300">{courtBadge(j)}<span className="font-medium text-navy-700 dark:text-navy-200">{j.court_name}</span><span className="text-navy-400">·</span><span>{t('by')} {j.judges}</span></p>
                                    {chips(j)}
                                    {j.tag_line && <p className="mt-1.5 text-sm italic text-navy-600 dark:text-navy-300"><span className="not-italic font-medium text-navy-800 dark:text-navy-100">{t('Tag line')}:</span> {j.tag_line}</p>}
                                    {!j.tag_line && j.remarks && <p className="mt-1.5 line-clamp-3 text-sm text-navy-600 dark:text-navy-300"><span className="font-medium text-navy-800 dark:text-navy-100">{t('Remarks')}:</span> {j.remarks}</p>}
                                    <p className="mt-1.5 text-xs text-navy-500">{t('Uploaded on')} {formatDate(j.uploaded_on, locale)}{j.decision_date && ` · ${t('Decided')} ${formatDate(j.decision_date, locale)}`}</p>
                                </div>
                                {pdfLink(j, 'hidden h-fit shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ring-1 ring-navy-200 hover:bg-navy-50 sm:inline-flex dark:ring-navy-700 dark:hover:bg-navy-800')}
                            </li>
                        ))}
                    </ol>
                )}
                <div className="mt-4"><Pagination meta={judgments} /></div>
            </div>
        </>
    );

    if (embedded) {
        return <AppLayout area="workspace" title={t('Reported judgments')} wide>{content}</AppLayout>;
    }

    return (
        <PublicLayout seo={{ title: active ? `${t('Reported judgments')}, ${active.name}` : t('Reported judgments'), description: t('Judgments approved for reporting by the High Courts of Pakistan, searchable by judge, citation, case number, title and date.'), canonical }}>
            {content}
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

function FilterField({ label, children, className, labelElement = 'label' }: { label: string; children: ReactNode; className?: string; labelElement?: 'label' | 'div' }) {
    const Wrapper = labelElement;
    return <Wrapper className={cn('block', className)}><span className="mb-1.5 block text-sm font-medium text-navy-800 dark:text-navy-100">{label}</span>{children}</Wrapper>;
}
