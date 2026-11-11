import { Link, router, useForm } from '@inertiajs/react';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ClipboardPlus, Filter, NotebookPen, Printer, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { HearingCard } from '@/Components/domain/HearingCard';
import { HearingHistoryDialog } from '@/Components/domain/HearingHistoryDialog';
import { OutcomeDialog, RescheduleDialog } from '@/Components/domain/HearingDialogs';
import { TaskDialog } from '@/Components/domain/TaskDialog';
import { Stagger, StaggerItem } from '@/Components/motion';
import { Button, Card, CardBody, CardHeader, EmptyState, Input, Modal, MonthCalendar, PageHeader, Select, Tabs } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate, formatTime, todayIso } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option } from '@/types';
import type { HearingSummary, SelectOption } from '@/types/domain';

type Entry = { id: number; entry_date: string; entry_time: string | null; title: string; notes: string | null; case: { id: number; title: string } | null };
type Props = {
    view: 'day' | 'week' | 'month' | 'agenda';
    date: string;
    month: string;
    range: { from: string; to: string };
    hearings: (HearingSummary & { order_passed: string | null; adjournment_reason: string | null })[];
    entries: Entry[];
    monthCounts: Record<string, number>;
    filters: Record<string, string>;
    options: { courts: SelectOption[]; districts: SelectOption[]; lawyers: SelectOption[]; cases: SelectOption[]; attendance: Option[]; hearingTypes: Option[]; statuses: Option[] };
    statusCounts: Record<string, number>;
    can: { manage: boolean; record: boolean; upload: boolean; tasks: boolean; viewAll: boolean };
};

const shiftDate = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function DiaryIndex({ view, date, month, range, hearings, entries, monthCounts, statusCounts, filters, options, can }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const [outcome, setOutcome] = useState<HearingSummary | null>(null);
    const [reschedule, setReschedule] = useState<HearingSummary | null>(null);
    const [taskFor, setTaskFor] = useState<HearingSummary | null>(null);
    const [noteOpen, setNoteOpen] = useState(false);
    const [history, setHistory] = useState<HearingSummary | null>(null);
    const [showFilters, setShowFilters] = useState(Object.keys(filters).length > 0);
    const visit = (params: Record<string, string | undefined>) => router.get(route('diary.index'), { view, date, ...filters, ...params }, { preserveState: true, preserveScroll: true, replace: true });

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('add') === 'note') setNoteOpen(true);
    }, []);

    const grouped = useMemo(() => {
        const map = new Map<string, typeof hearings>();
        hearings.forEach((h) => map.set(h.hearing_date, [...(map.get(h.hearing_date) ?? []), h]));
        return [...map.entries()];
    }, [hearings]);

    const step = view === 'week' ? 7 : view === 'month' ? 30 : 1;
    const isToday = date === todayIso();
    const scheduledToday = hearings.filter((h) => h.status === 'scheduled').length;

    const actions = (h: HearingSummary) =>
        h.status === 'scheduled' ? (
            <>
                {can.record && <Button size="sm" variant="success" onClick={() => setOutcome(h)}>{t('Record')}</Button>}
                {can.manage && <Button size="sm" variant="secondary" onClick={() => setReschedule(h)}>{t('Adjourn / move')}</Button>}
                {can.tasks && <Button size="sm" variant="ghost" icon={<ClipboardPlus className="size-4" />} onClick={() => setTaskFor(h)} aria-label={t('Add task')} />}
            </>
        ) : h.has_outcome && can.record ? (
            <Button size="sm" variant="ghost" onClick={() => setOutcome(h)}>{t('Correct record')}</Button>
        ) : null;

    return (
        <AppLayout title={t('Court Diary')} wide>
            <PageHeader
                title={t('Court Diary')}
                description={view === 'day' ? formatDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : `${formatDate(range.from, locale)} – ${formatDate(range.to, locale)}`}
                actions={
                    <>
                        <Link href={route('calendar.index', { view: view === 'agenda' ? 'agenda' : view, date })} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-white/10 dark:hover:text-gold-300"><CalendarRange className="size-4" />{t('Calendar')}</Link>
                        <Button variant="secondary" icon={<NotebookPen className="size-4" />} onClick={() => setNoteOpen(true)}>{t('Diary note')}</Button>
                        <a href={route('diary.pdf', { date, ...filters })} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-navy-200 ring-inset hover:bg-navy-50 dark:bg-navy-900 dark:ring-navy-700">
                            <Printer className="size-4" />{t('Print / PDF')}
                        </a>
                    </>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg ring-1 ring-navy-200 dark:ring-navy-700">
                    <button type="button" className="p-2 hover:bg-navy-50 dark:hover:bg-navy-800" onClick={() => visit({ date: shiftDate(date, -step) })} aria-label={t('Previous')}><ChevronLeft className="size-4 rtl:rotate-180" /></button>
                    <button type="button" className={cn('px-3 py-1.5 text-sm font-medium', isToday && 'text-gold-600')} onClick={() => visit({ date: todayIso() })}>{t('Today')}</button>
                    <button type="button" className="p-2 hover:bg-navy-50 dark:hover:bg-navy-800" onClick={() => visit({ date: shiftDate(date, step) })} aria-label={t('Next')}><ChevronRight className="size-4 rtl:rotate-180" /></button>
                </div>
                <input type="date" value={date} onChange={(e) => e.target.value && visit({ date: e.target.value })} className="rounded-lg border-0 px-3 py-1.5 text-sm ring-1 ring-navy-200 dark:bg-navy-900 dark:ring-navy-700" aria-label={t('Date')} />
                <Tabs
                    className="border-0"
                    active={view}
                    onChange={(key) => visit({ view: key })}
                    tabs={[{ key: 'day', label: t('Day') }, { key: 'week', label: t('Week') }, { key: 'month', label: t('Month') }, { key: 'agenda', label: t('Agenda') }]}
                />
                <Button size="sm" variant={showFilters ? 'secondary' : 'ghost'} icon={<Filter className="size-4" />} onClick={() => setShowFilters(!showFilters)}>{t('Filters')}</Button>
            </div>

            {showFilters && (
                <Card className="mb-4">
                    <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <Select label={t('Court')} value={filters.court_id ?? ''} onChange={(e) => visit({ court_id: e.target.value || undefined })} options={options.courts} placeholder={t('All')} />
                        <Select label={t('District')} value={filters.district_id ?? ''} onChange={(e) => visit({ district_id: e.target.value || undefined })} options={options.districts} placeholder={t('All')} />
                        <Input label={t('Judge')} defaultValue={filters.judge ?? ''} onBlur={(e) => visit({ judge: e.target.value || undefined })} />
                        <Select label={t('Case')} value={filters.case_id ?? ''} onChange={(e) => visit({ case_id: e.target.value || undefined })} options={options.cases} placeholder={t('All')} />
                        {can.viewAll && <Select label={t('Lawyer')} value={filters.lawyer_id ?? ''} onChange={(e) => visit({ lawyer_id: e.target.value || undefined })} options={options.lawyers} placeholder={t('All')} />}
                        <Select label={t('Status')} value={filters.status ?? ''} onChange={(e) => visit({ status: e.target.value || undefined })} options={options.statuses} placeholder={t('All')} />
                    </CardBody>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-5">
                    {view === 'day' && (
                        <div className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-3 text-white lg:hidden dark:bg-navy-800">
                            <CalendarDays className="size-5 text-gold-300" />
                            <p className="text-sm">{t(':count hearings scheduled', { count: scheduledToday })}</p>
                        </div>
                    )}
                    {hearings.length > 0 && (
                        <div className="flex flex-wrap gap-2" aria-label={t('Hearings by status')}>
                            {options.statuses.filter((s) => statusCounts[s.value]).map((s) => (
                                <button key={s.value} type="button" onClick={() => visit({ status: filters.status === s.value ? undefined : s.value })} aria-pressed={filters.status === s.value}
                                    className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium', filters.status === s.value ? 'border-navy-900 bg-navy-900 text-white dark:border-gold-500 dark:bg-gold-500 dark:text-navy-950' : 'border-navy-200 text-navy-700 hover:border-navy-400 dark:border-navy-700 dark:text-navy-200')}>
                                    <span className="tabular-nums">{statusCounts[s.value]}</span> {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {grouped.length === 0 && entries.length === 0 && <Card><EmptyState icon={<CalendarDays className="size-5" />} title={t('No hearings in this period')} description={t('Hearings you schedule on cases appear here.')} /></Card>}
                    {grouped.map(([day, items]) => (
                        <section key={day}>
                            {view !== 'day' && <h2 className="mb-2 font-sans text-sm font-semibold text-navy-600 dark:text-navy-300">{formatDate(day, locale, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>}
                            <Stagger className="space-y-2.5" gap={0.04} inView={false}>
                                {items.map((h) => (
                                    <StaggerItem key={h.id}>
                                        <HearingCard hearing={h} actions={actions(h)} onHistory={setHistory} />
                                        {h.clients && h.clients.length > 0 && view === 'day' && (
                                            <p className="mt-1 ps-4 text-xs text-navy-500">
                                                {h.clients.map((c) => (
                                                    <span key={c.name} className="me-3">{c.name}{c.phone && <a href={`tel:${c.phone}`} className="ltr-nums ms-1 underline">{c.phone}</a>}</span>
                                                ))}
                                            </p>
                                        )}
                                    </StaggerItem>
                                ))}
                            </Stagger>
                        </section>
                    ))}
                    {entries.length > 0 && (
                        <Card>
                            <CardHeader title={t('Diary notes')} />
                            <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                {entries.map((e) => (
                                    <li key={e.id} className="flex items-start justify-between gap-2 px-5 py-3 text-sm">
                                        <div>
                                            <p className="font-medium">{e.title}</p>
                                            <p className="text-xs text-navy-500">{formatDate(e.entry_date, locale)}{e.entry_time ? `, ${formatTime(e.entry_time, locale)}` : ''}{e.case ? `, ${e.case.title}` : ''}</p>
                                            {e.notes && <p className="mt-1 text-navy-600 dark:text-navy-300">{e.notes}</p>}
                                        </div>
                                        <button type="button" onClick={() => router.delete(route('diary.entries.destroy', e.id), { preserveScroll: true })} className="text-navy-400 hover:text-red-600" aria-label={t('Remove')}><Trash2 className="size-4" /></button>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
                <div className="hidden lg:block">
                    <Card className="sticky top-20">
                        <CardBody>
                            <MonthCalendar month={month} counts={monthCounts} selected={date} onSelect={(d) => visit({ date: d, view: 'day' })} onNavigate={(m) => visit({ date: `${m}-01`, view })} />
                        </CardBody>
                    </Card>
                </div>
            </div>

            <OutcomeDialog hearing={outcome} onClose={() => setOutcome(null)} options={options} canUpload={can.upload} />
            <RescheduleDialog hearing={reschedule} onClose={() => setReschedule(null)} />
            <HearingHistoryDialog hearing={history} onClose={() => setHistory(null)} />
            <TaskDialog open={!!taskFor} onClose={() => setTaskFor(null)} caseId={taskFor?.case?.id} hearingId={taskFor?.id} members={options.lawyers} priorities={[{ value: 'normal', label: t('Normal') }, { value: 'high', label: t('High') }, { value: 'urgent', label: t('Urgent') }, { value: 'low', label: t('Low') }]} />
            <DiaryNoteDialog open={noteOpen} onClose={() => setNoteOpen(false)} date={date} cases={options.cases} />
        </AppLayout>
    );
}

function DiaryNoteDialog({ open, onClose, date, cases }: { open: boolean; onClose: () => void; date: string; cases: SelectOption[] }) {
    const t = useT();
    const form = useForm({ entry_date: date, entry_time: '', title: '', notes: '', legal_case_id: '' });
    return (
        <Modal open={open} onClose={onClose} title={t('Diary note')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={() => { form.transform((d) => ({ ...d, entry_time: d.entry_time || null, legal_case_id: d.legal_case_id || null })); form.post(route('diary.entries.store'), { preserveScroll: true, onSuccess: () => { form.reset('title', 'notes'); onClose(); } }); }}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Date')} type="date" value={form.data.entry_date} onChange={(e) => form.setData('entry_date', e.target.value)} error={form.errors.entry_date} />
                <Input label={t('Time')} type="time" value={form.data.entry_time} onChange={(e) => form.setData('entry_time', e.target.value)} />
                <Input wrapperClassName="sm:col-span-2" label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required />
                <Select wrapperClassName="sm:col-span-2" label={t('Case')} value={form.data.legal_case_id} onChange={(e) => form.setData('legal_case_id', e.target.value)} options={cases} placeholder={t('Not linked')} />
                <Input wrapperClassName="sm:col-span-2" label={t('Notes')} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
            </div>
        </Modal>
    );
}
