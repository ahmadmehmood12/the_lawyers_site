import { Deferred } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Filter, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgendaList } from '@/Components/calendar/AgendaList';
import { colorFor } from '@/Components/calendar/colors';
import { addDays, dayOf, fmt, fmtWhen, rangeFor, startOfWeek, step, toIso } from '@/Components/calendar/dates';
import { EventDetails } from '@/Components/calendar/EventDetails';
import { CancelEventDialog, EventFormDialog, type FormOptions, RescheduleEventDialog } from '@/Components/calendar/EventDialogs';
import { OriginalTime } from '@/Components/calendar/EventChip';
import { MonthGrid } from '@/Components/calendar/MonthGrid';
import { TimeGrid } from '@/Components/calendar/TimeGrid';
import type { CalendarItem, View } from '@/Components/calendar/types';
import { CancelHearingDialog, RescheduleDialog } from '@/Components/domain/HearingDialogs';
import { Button, Card, MonthCalendar, Select, Skeleton } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import type { Option } from '@/types';
import type { HearingSummary } from '@/types/domain';

type Props = {
    area: 'workspace' | 'portal' | 'admin';
    initial: { view: View; date: string };
    types: Option[];
    options: FormOptions & { statuses: Option[]; taskStatuses: Option[]; lawyers: Option[] };
    can: { create: boolean; link: boolean; manageAppointments: boolean };
    upcoming?: CalendarItem[];
};

const VIEWS: View[] = ['month', 'week', 'day', 'agenda'];

export default function CalendarIndex({ area, initial, types, options, can, upcoming }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const today = toIso(new Date());
    const [view, setView] = useState<View>(() => (typeof window !== 'undefined' && window.innerWidth < 768 && initial.view === 'month' ? 'agenda' : initial.view));
    const [date, setDate] = useState(initial.date);
    const [filters, setFilters] = useState<{ types: string[]; case_id: string; lawyer_id: string; status: string }>({ types: [], case_id: '', lawyer_id: '', status: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [items, setItems] = useState<CalendarItem[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [version, setVersion] = useState(0);
    const [open, setOpen] = useState<CalendarItem | null>(null);
    const [form, setForm] = useState<{ open: boolean; item: CalendarItem | null; date: string; time?: string }>({ open: false, item: null, date: initial.date });
    const [rescheduling, setRescheduling] = useState<CalendarItem | null>(null);
    const [cancelling, setCancelling] = useState<CalendarItem | null>(null);
    const [hearingAction, setHearingAction] = useState<{ kind: 'reschedule' | 'cancel'; hearing: HearingSummary } | null>(null);
    const range = useMemo(() => rangeFor(view, date), [view, date]);
    const refresh = useCallback(() => setVersion((v) => v + 1), []);

    // Keep the URL shareable (view + date) without an Inertia visit.
    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('view', view);
        url.searchParams.set('date', date);
        window.history.replaceState(window.history.state, '', url);
    }, [view, date]);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({ start: range.start, end: range.end });
        filters.types.forEach((type) => params.append('types[]', type));
        if (filters.case_id) params.set('case_id', filters.case_id);
        if (filters.lawyer_id) params.set('lawyer_id', filters.lawyer_id);
        if (filters.status) params.set('status', filters.status);
        setFailed(false);
        fetch(`${route('calendar.events')}?${params}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: controller.signal })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((data: { events: CalendarItem[] }) => setItems(data.events))
            .catch((e: Error) => e.name !== 'AbortError' && setFailed(true));
        return () => controller.abort();
    }, [range.start, range.end, filters, version]);

    const title = view === 'day'
        ? fmt(date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : view === 'week'
            ? `${fmt(range.start, locale, { day: 'numeric', month: 'short' })} – ${fmt(range.end, locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
            : view === 'agenda'
                ? `${fmt(range.start, locale, { day: 'numeric', month: 'short' })} – ${fmt(range.end, locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
                : fmt(date, locale, { month: 'long', year: 'numeric' });

    const counts = useMemo(() => {
        const map: Record<string, number> = {};
        (items ?? []).filter((i) => !i.ghost && i.status !== 'cancelled').forEach((i) => (map[dayOf(i.start)] = (map[dayOf(i.start)] ?? 0) + 1));
        return map;
    }, [items]);

    const visibleItems = items ?? [];
    const dayItems = visibleItems.filter((i) => dayOf(i.start) === date);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i));
    const toggleType = (type: string) => setFilters((f) => ({ ...f, types: f.types.includes(type) ? f.types.filter((x) => x !== type) : [...f.types, type] }));
    const activeFilters = filters.types.length + (filters.case_id ? 1 : 0) + (filters.lawyer_id ? 1 : 0) + (filters.status ? 1 : 0);
    const newEvent = (d = date, time?: string) => can.create && setForm({ open: true, item: null, date: d, time });

    function startReschedule(item: CalendarItem) {
        setOpen(null);
        if (item.source === 'hearing' && item.hearing) {
            setHearingAction({ kind: 'reschedule', hearing: { ...item.hearing, hearing_date: dayOf(item.start) } as unknown as HearingSummary });
        } else {
            setRescheduling(item);
        }
    }
    function startCancel(item: CalendarItem) {
        setOpen(null);
        if (item.source === 'hearing' && item.hearing) {
            setHearingAction({ kind: 'cancel', hearing: { ...item.hearing, hearing_date: dayOf(item.start) } as unknown as HearingSummary });
        } else {
            setCancelling(item);
        }
    }

    return (
        <AppLayout title={t('Calendar')} area={area} wide>
            <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-4 lg:flex-row">
                {/* Sidebar: new event, mini month, filters, coming up */}
                <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
                    {can.create && <Button icon={<Plus className="size-4" />} onClick={() => newEvent()} className="w-full sm:w-auto lg:w-full">{t('New event')}</Button>}
                    <Card className="hidden p-3 lg:block">
                        <MonthCalendar month={date.slice(0, 7)} counts={counts} selected={date} onSelect={(d) => setDate(d)} onNavigate={(m) => setDate(`${m}-01`)} />
                    </Card>
                    <Card className={cn('p-4', !showFilters && 'hidden lg:block')}>
                        <p className="mb-2 text-sm font-semibold">{t('Show')}</p>
                        <ul className="space-y-1.5">
                            {types.map((type) => (
                                <li key={type.value}>
                                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                                        <input type="checkbox" className="size-4 rounded border-navy-300" checked={filters.types.length === 0 || filters.types.includes(type.value)} onChange={() => toggleType(type.value)} />
                                        <span className={cn('size-2.5 rounded-sm', colorFor(type.value).dot)} aria-hidden />
                                        {type.label}
                                    </label>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 space-y-3">
                            {options.cases.length > 0 && <Select label={t('Case')} value={filters.case_id} onChange={(e) => setFilters((f) => ({ ...f, case_id: e.target.value }))} options={options.cases.map((c) => ({ value: String(c.value), label: c.label }))} placeholder={t('All cases')} />}
                            {options.lawyers.length > 0 && <Select label={t('Lawyer')} value={filters.lawyer_id} onChange={(e) => setFilters((f) => ({ ...f, lawyer_id: e.target.value }))} options={options.lawyers} placeholder={t('Everyone')} />}
                            <Select label={t('Status')} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} options={options.statuses} placeholder={t('Any status')} />
                            {activeFilters > 0 && <Button size="sm" variant="ghost" onClick={() => setFilters({ types: [], case_id: '', lawyer_id: '', status: '' })}>{t('Clear filters')}</Button>}
                        </div>
                    </Card>
                    <Card className="hidden p-4 lg:block">
                        <p className="mb-2 text-sm font-semibold">{t('Coming up')}</p>
                        <Deferred data="upcoming" fallback={<div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>}>
                            {upcoming && upcoming.length === 0 ? <p className="text-sm text-navy-500">{t('Nothing in the next two weeks.')}</p> : (
                                <ul className="space-y-2.5">
                                    {(upcoming ?? []).map((item) => (
                                        <li key={item.key}>
                                            <button type="button" onClick={() => setOpen(item)} className="flex w-full items-start gap-2 text-start">
                                                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', colorFor(item.type).dot)} aria-hidden />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-medium text-navy-900 hover:underline dark:text-white">{item.title}</span>
                                                    <span className="block text-xs text-navy-500">{fmtWhen(item.start, locale, item.all_day)}</span>
                                                    <OriginalTime item={item} compact />
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Deferred>
                    </Card>
                </aside>

                {/* Main calendar */}
                <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 p-3 dark:border-navy-800">
                        <Button size="sm" variant="secondary" onClick={() => setDate(today)}>{t('Today')}</Button>
                        <div className="flex">
                            <button type="button" onClick={() => setDate(step(view, date, -1))} className="rounded-md p-1.5 text-navy-600 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-800" aria-label={t('Previous')}><ChevronLeft className="size-5 rtl:rotate-180" /></button>
                            <button type="button" onClick={() => setDate(step(view, date, 1))} className="rounded-md p-1.5 text-navy-600 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-800" aria-label={t('Next')}><ChevronRight className="size-5 rtl:rotate-180" /></button>
                        </div>
                        <h1 className="min-w-0 flex-1 truncate font-serif text-lg font-semibold sm:text-xl">{title}</h1>
                        <button type="button" onClick={refresh} className="rounded-md p-1.5 text-navy-500 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label={t('Refresh')}><RefreshCw className="size-4" /></button>
                        <Button size="sm" variant="ghost" className="lg:hidden" icon={<Filter className="size-4" />} onClick={() => setShowFilters((s) => !s)}>{activeFilters ? t('Filters (:count)', { count: activeFilters }) : t('Filters')}</Button>
                        <div className="flex rounded-lg border border-navy-200 p-0.5 dark:border-navy-700" role="tablist" aria-label={t('View')}>
                            {VIEWS.map((v) => (
                                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm', view === v ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-600 hover:text-navy-900 dark:text-navy-300 dark:hover:text-white')}>
                                    {{ month: t('Month'), week: t('Week'), day: t('Day'), agenda: t('Agenda') }[v]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative min-h-0 flex-1">
                        {failed && <p className="p-6 text-sm text-red-600">{t('The calendar could not be loaded.')} <button type="button" className="underline" onClick={refresh}>{t('Try again')}</button></p>}
                        {items === null && !failed && <div className="space-y-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-64" /></div>}
                        {items !== null && !failed && (
                            <>
                                {view === 'month' && <MonthGrid start={range.start} month={date.slice(0, 7)} today={today} items={visibleItems} onOpen={setOpen} onPickDay={(d) => { setDate(d); setView('day'); }} onCreate={can.create ? (d) => newEvent(d) : undefined} />}
                                {view === 'week' && <TimeGrid days={weekDays} today={today} items={visibleItems} onOpen={setOpen} onCreate={can.create ? (d, time) => newEvent(d, time) : undefined} />}
                                {view === 'day' && <TimeGrid days={[date]} today={today} items={dayItems} onOpen={setOpen} onCreate={can.create ? (d, time) => newEvent(d, time) : undefined} />}
                                {view === 'agenda' && <AgendaList items={visibleItems} today={today} onOpen={setOpen} />}
                            </>
                        )}
                    </div>

                    <Legend types={types} />
                </Card>
            </div>

            <EventDetails item={open} taskStatuses={options.taskStatuses} onClose={() => setOpen(null)} onEdit={(item) => { setOpen(null); setForm({ open: true, item, date: dayOf(item.start) }); }} onReschedule={startReschedule} onCancel={startCancel} onChanged={refresh} />
            <EventFormDialog open={form.open} item={form.item} defaults={{ date: form.date, time: form.time }} options={options} canLink={can.link} onClose={() => setForm((f) => ({ ...f, open: false }))} onSaved={refresh} />
            <RescheduleEventDialog item={rescheduling} onClose={() => setRescheduling(null)} onSaved={refresh} />
            <CancelEventDialog item={cancelling} onClose={() => setCancelling(null)} onSaved={refresh} />
            <RescheduleDialog hearing={hearingAction?.kind === 'reschedule' ? hearingAction.hearing : null} onClose={() => { setHearingAction(null); refresh(); }} />
            <CancelHearingDialog hearing={hearingAction?.kind === 'cancel' ? hearingAction.hearing : null} onClose={() => { setHearingAction(null); refresh(); }} />
        </AppLayout>
    );
}

/** Type colours plus the status marks, so the visual language is explained once. */
function Legend({ types }: { types: Option[] }) {
    const t = useT();
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-navy-100 px-3 py-2 text-xs text-navy-600 dark:border-navy-800 dark:text-navy-300">
            {types.slice(0, 8).map((type) => (
                <span key={type.value} className="inline-flex items-center gap-1.5"><span className={cn('size-2.5 rounded-sm', colorFor(type.value).dot)} aria-hidden />{type.label}</span>
            ))}
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm ring-1 ring-amber-400" aria-hidden />{t('Rescheduled')} (<s>{t('old time')}</s>)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-dashed border-navy-400 opacity-60" aria-hidden />{t('Moved from here')}</span>
            <span className="inline-flex items-center gap-1.5"><s>{t('Cancelled')}</s></span>
        </div>
    );
}

