import { Link, router, useForm, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Pause, Play, Plus, Timer, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, Button, Card, CardBody, CardHeader, Checkbox, EmptyState, Input, Modal } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

export type TimeEntry = { id: number; description: string | null; started_at: string; ended_at: string | null; seconds: number; billable: boolean; running: boolean; user: { id: number; name: string; avatar: string | null }; mine: boolean };
export type TimeData = { entries: TimeEntry[]; totals: { all: number; billable: number; week: number; mine: number }; by_lawyer: { name: string; avatar: string | null; seconds: number }[] };
type Running = { id: number; case_id: number; case_title: string | null; started_at: string; description: string | null } | null;

/** "2h 05m" style durations. */
export function duration(seconds: number, clock = false): string {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (clock) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Seconds since an ISO time, ticking every second. */
function useElapsed(since: string | null | undefined): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!since) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [since]);
    return since ? (now - new Date(since).getTime()) / 1000 : 0;
}

/** Case page, Time tab: big start/stop timer, totals, per lawyer split and the log. */
export function CaseTimeTab({ caseId, data }: { caseId: number; data: TimeData }) {
    const t = useT();
    const { locale } = useLocale();
    const { runningTimer } = usePage<SharedProps & { runningTimer: Running }>().props;
    const runningHere = runningTimer?.case_id === caseId ? runningTimer : null;
    const runningElsewhere = runningTimer && !runningHere ? runningTimer : null;
    const elapsed = useElapsed(runningHere?.started_at);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [manual, setManual] = useState(false);

    const start = () => router.post(route('cases.time.start', caseId), { description: note || null }, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => { setBusy(false); setNote(''); } });
    const stop = () => runningHere && router.post(route('time.stop', runningHere.id), { description: note || null }, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => { setBusy(false); setNote(''); } });
    const max = Math.max(1, ...data.by_lawyer.map((l) => l.seconds));

    return (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
                <Card className="overflow-hidden">
                    <div className={cn('relative flex flex-col items-center gap-5 px-6 py-8 text-center transition-colors sm:flex-row sm:text-start', runningHere ? 'bg-navy-900 text-white' : 'bg-white dark:bg-navy-900')}>
                        <div className="relative grid size-24 shrink-0 place-items-center">
                            {runningHere && <motion.span className="absolute inset-0 rounded-full border-2 border-gold-400/60" animate={{ scale: [1, 1.15], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} />}
                            <span className={cn('grid size-20 place-items-center rounded-full', runningHere ? 'bg-gold-500 text-navy-950' : 'bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200')}><Timer className="size-9" /></span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={cn('text-sm', runningHere ? 'text-navy-200' : 'text-navy-500')}>{runningHere ? t('Timer running since :time', { time: new Date(runningHere.started_at).toLocaleTimeString(locale === 'ur' ? 'ur-PK' : 'en-US', { hour: 'numeric', minute: '2-digit' }) }) : t('Track the time you spend on this case')}</p>
                            <p className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight">{duration(runningHere ? elapsed : 0, true)}</p>
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={runningHere?.description || t('What are you working on? For example drafting bail grounds')}
                                className={cn('mt-3 w-full rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-inset focus:ring-2 focus:ring-gold-500', runningHere ? 'bg-white/10 text-white ring-white/20 placeholder:text-navy-300' : 'bg-navy-50 ring-navy-200 dark:bg-navy-800 dark:ring-navy-700')} />
                            {runningElsewhere && <p className="mt-2 text-xs text-gold-700 dark:text-gold-300">{t('Starting here stops your timer on :case.', { case: runningElsewhere.case_title ?? '' })}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col gap-2">
                            {runningHere
                                ? <Button size="lg" className="bg-gold-500 text-navy-950 hover:bg-gold-400" icon={<Pause className="size-5" />} loading={busy} onClick={stop}>{t('Stop')}</Button>
                                : <Button size="lg" icon={<Play className="size-5" />} loading={busy} onClick={start}>{t('Start timer')}</Button>}
                            <Button size="sm" variant={runningHere ? 'ghost' : 'secondary'} className={runningHere ? 'text-white hover:bg-white/10' : undefined} icon={<Plus className="size-4" />} onClick={() => setManual(true)}>{t('Add time')}</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-y divide-navy-100 border-t border-navy-100 sm:grid-cols-4 sm:divide-y-0 dark:divide-navy-800 dark:border-navy-800">
                        {[[t('Total on this case'), data.totals.all], [t('Billable'), data.totals.billable], [t('This week'), data.totals.week], [t('My time'), data.totals.mine]].map(([label, value]) => (
                            <div key={String(label)} className="px-5 py-3">
                                <p className="text-xs text-navy-500">{label}</p>
                                <p className="mt-0.5 text-lg font-semibold tabular-nums">{duration(Number(value))}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <CardHeader title={t('Time log')} description={t('Every session on this case, newest first.')} />
                    {data.entries.length === 0 ? <EmptyState icon={<Clock className="size-5" />} title={t('No time logged yet')} description={t('Start the timer or add time you worked earlier.')} /> : (
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {data.entries.map((e) => <EntryRow key={e.id} entry={e} />)}
                        </ul>
                    )}
                </Card>
            </div>

            <Card>
                <CardHeader title={t('By lawyer')} />
                <CardBody className="space-y-3">
                    {data.by_lawyer.length === 0 && <p className="text-sm text-navy-500">—</p>}
                    {data.by_lawyer.map((l) => (
                        <div key={l.name}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                                <span className="flex min-w-0 items-center gap-2"><Avatar name={l.name} src={l.avatar} size="sm" /><span className="truncate">{l.name}</span></span>
                                <span className="shrink-0 font-semibold tabular-nums">{duration(l.seconds)}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800"><motion.div className="h-full rounded-full bg-gold-500" initial={{ width: 0 }} animate={{ width: `${(l.seconds / max) * 100}%` }} /></div>
                        </div>
                    ))}
                </CardBody>
            </Card>

            <ManualTime open={manual} onClose={() => setManual(false)} caseId={caseId} />
        </div>
    );
}

function EntryRow({ entry }: { entry: TimeEntry }) {
    const t = useT();
    const { locale } = useLocale();
    const live = useElapsed(entry.running ? entry.started_at : null);
    const end = entry.ended_at ? new Date(entry.ended_at) : null;
    const fmt = (d: Date) => d.toLocaleTimeString(locale === 'ur' ? 'ur-PK' : 'en-US', { hour: 'numeric', minute: '2-digit' });
    return (
        <li className="flex items-center gap-3 px-5 py-3">
            <Avatar name={entry.user.name} src={entry.user.avatar} size="sm" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.description || <span className="text-navy-400">{t('No description')}</span>}</p>
                <p className="text-xs text-navy-500">{entry.user.name} · {formatDate(entry.started_at, locale, { day: 'numeric', month: 'short' })}, {fmt(new Date(entry.started_at))}{end ? ` – ${fmt(end)}` : ''}</p>
            </div>
            {entry.running
                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-gold-700"><span className="size-1.5 animate-pulse rounded-full bg-gold-500" />{duration(live, true)}</span>
                : <span className="font-mono text-sm font-semibold tabular-nums">{duration(entry.seconds)}</span>}
            {!entry.billable && <span className="rounded bg-navy-100 px-1.5 py-0.5 text-[10px] text-navy-500 dark:bg-navy-800">{t('Not billable')}</span>}
            {entry.mine && !entry.running && (
                <button type="button" onClick={() => router.delete(route('time.destroy', entry.id), { preserveScroll: true })} aria-label={t('Remove')} className="rounded p-1 text-navy-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
            )}
        </li>
    );
}


function ManualTime({ open, onClose, caseId }: { open: boolean; onClose: () => void; caseId: number }) {
    const t = useT();
    const form = useForm({ date: new Date().toISOString().slice(0, 10), hours: '1', minutes: '0', description: '', billable: true });
    function submit() {
        form.transform((d) => ({ ...d, hours: Number(d.hours) || 0, minutes: Number(d.minutes) || 0 }));
        form.post(route('cases.time.store', caseId), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    }
    return (
        <Modal open={open} onClose={onClose} size="sm" title={t('Add time worked')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{t('Add time')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-3">
                <Input wrapperClassName="sm:col-span-3" label={t('Date')} type="date" value={form.data.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => form.setData('date', e.target.value)} error={form.errors.date} required />
                <Input label={t('Hours')} type="number" min={0} max={23} value={form.data.hours} onChange={(e) => form.setData('hours', e.target.value)} error={form.errors.hours} />
                <Input label={t('Minutes')} type="number" min={0} max={59} step={5} value={form.data.minutes} onChange={(e) => form.setData('minutes', e.target.value)} error={form.errors.minutes} />
                <div className="flex items-end pb-2"><Checkbox label={t('Billable')} checked={form.data.billable} onChange={(e) => form.setData('billable', e.target.checked)} /></div>
                <Input wrapperClassName="sm:col-span-3" label={t('What did you do?')} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} placeholder={t('For example court appearance and arguments')} />
            </div>
        </Modal>
    );
}

/** Header pill while a timer runs anywhere: live clock, link to the case, stop. */
export function RunningTimerPill() {
    const t = useT();
    const { runningTimer } = usePage<SharedProps & { runningTimer: Running }>().props;
    const elapsed = useElapsed(runningTimer?.started_at);
    return (
        <AnimatePresence>
            {runningTimer && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1 rounded-full bg-navy-900 py-1 pe-1 ps-3 text-white shadow-sm dark:bg-gold-500 dark:text-navy-950">
                    <span className="size-1.5 animate-pulse rounded-full bg-gold-400 dark:bg-navy-950" />
                    <Link href={route('cases.show', { case: runningTimer.case_id, tab: 'time' })} className="max-w-36 truncate ps-1 text-xs font-medium hover:underline" title={runningTimer.case_title ?? ''}>
                        <span className="font-mono tabular-nums">{duration(elapsed, true)}</span><span className="hidden opacity-80 md:inline"> · {runningTimer.case_title}</span>
                    </Link>
                    <button type="button" onClick={() => router.post(route('time.stop', runningTimer.id), {}, { preserveScroll: true })} aria-label={t('Stop timer')} title={t('Stop timer')}
                        className="grid size-6 place-items-center rounded-full bg-white/15 hover:bg-white/25 dark:bg-navy-950/15"><Pause className="size-3.5" /></button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
