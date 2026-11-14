import { router, useForm } from '@inertiajs/react';
import { CalendarOff, ChevronLeft, ChevronRight, Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, CardHeader, Checkbox, ConfirmAction, EmptyState, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Holiday = { id: number; title: string; title_ur: string | null; kind: string; province_id: number | null; province: string | null; notes: string | null; tentative: boolean; is_active: boolean; starts_on: string; ends_on: string };

/**
 * Admin, Court calendar: the year at a glance and the list of closures. Everything here shows on the
 * homepage, every dashboard, the client portal and the calendars (CourtHoliday).
 */
export default function CourtCalendar({ year, holidays, provinces, years }: { year: number; holidays: Holiday[]; provinces: SelectOption[]; years: number[] }) {
    const t = useT();
    const { locale } = useLocale();
    const [editing, setEditing] = useState<Holiday | null | undefined>(undefined);
    const [prefill, setPrefill] = useState<string | null>(null);
    const intl = locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB';

    const byDate = useMemo(() => {
        const map = new Map<string, Holiday[]>();
        holidays.filter((h) => h.is_active).forEach((h) => {
            for (let d = new Date(`${h.starts_on}T00:00:00`); d <= new Date(`${h.ends_on}T00:00:00`); d.setDate(d.getDate() + 1)) {
                const key = d.toISOString().slice(0, 10);
                map.set(key, [...(map.get(key) ?? []), h]);
            }
        });
        return map;
    }, [holidays]);

    const closedDays = byDate.size;
    const go = (y: number) => router.get(route('admin.court-calendar.index'), { year: y }, { preserveScroll: true });

    return (
        <AppLayout title={t('Court calendar')} area="admin" wide>
            <PageHeader title={t('Court calendar')} description={t('Public holidays and court vacations. They appear on the homepage, every dashboard, the client portal and all calendars.')}
                actions={<Button icon={<Plus className="size-4" />} onClick={() => { setPrefill(null); setEditing(null); }}>{t('Add closure')}</Button>} />

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                    <button type="button" onClick={() => go(year - 1)} className="grid size-8 place-items-center rounded-md hover:bg-navy-50 dark:hover:bg-navy-800" aria-label={t('Previous year')}><ChevronLeft className="size-4 rtl:rotate-180" /></button>
                    {years.map((y) => <button key={y} type="button" onClick={() => go(y)} className={cn('rounded-md px-3 py-1.5 text-sm font-semibold tabular-nums', y === year ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'hover:bg-navy-50 dark:hover:bg-navy-800')}>{y}</button>)}
                    <button type="button" onClick={() => go(year + 1)} className="grid size-8 place-items-center rounded-md hover:bg-navy-50 dark:hover:bg-navy-800" aria-label={t('Next year')}><ChevronRight className="size-4 rtl:rotate-180" /></button>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-navy-600 dark:text-navy-300">
                    <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-red-500" />{t('Public holiday')}</span>
                    <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-gold-400" />{t('Court vacation')}</span>
                    <span className="font-semibold tabular-nums">{t(':count days closed in :year', { count: closedDays, year })}</span>
                </div>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
                <Card className="p-4">
                    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {Array.from({ length: 12 }, (_, m) => {
                            const first = new Date(year, m, 1);
                            const lead = (first.getDay() + 6) % 7;
                            const days = new Date(year, m + 1, 0).getDate();
                            return (
                                <div key={m}>
                                    <p className="mb-1.5 text-sm font-semibold">{new Intl.DateTimeFormat(intl, { month: 'long' }).format(first)}</p>
                                    <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
                                        {Array.from({ length: 7 }, (_, i) => <span key={i} className="py-0.5 font-medium text-navy-400">{new Intl.DateTimeFormat(intl, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i))}</span>)}
                                        {Array.from({ length: lead }).map((_, i) => <span key={`l${i}`} />)}
                                        {Array.from({ length: days }, (_, d) => {
                                            const iso = `${year}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`;
                                            const hits = byDate.get(iso);
                                            const holiday = hits?.find((h) => h.kind !== 'court_vacation');
                                            const vacation = hits?.find((h) => h.kind === 'court_vacation');
                                            const weekend = new Date(year, m, d + 1).getDay() === 0;
                                            return (
                                                <button key={iso} type="button" title={hits?.map((h) => h.title).join(', ')}
                                                    onClick={() => (hits ? setEditing(hits[0]) : (setPrefill(iso), setEditing(null)))}
                                                    className={cn('aspect-square rounded tabular-nums transition hover:ring-1 hover:ring-navy-300',
                                                        holiday ? 'bg-red-500 font-semibold text-white' : vacation ? 'bg-gold-200 text-gold-900 dark:bg-gold-500/40 dark:text-gold-100' : weekend ? 'text-navy-300 dark:text-navy-600' : 'text-navy-700 dark:text-navy-200')}>
                                                    {d + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className="mt-4 text-xs text-navy-500">{t('Click a free day to add a closure on it, or a marked day to edit it.')}</p>
                </Card>

                <Card className="xl:sticky xl:top-20">
                    <CardHeader title={t(':year closures', { year })} description={t(':count entries', { count: holidays.length })} />
                    {holidays.length === 0 ? <EmptyState icon={<CalendarOff className="size-5" />} title={t('No closures for this year')} /> : (
                        <ul className="max-h-[70dvh] divide-y divide-navy-100 overflow-y-auto dark:divide-navy-800">
                            {holidays.map((h) => {
                                const multi = h.starts_on !== h.ends_on;
                                return (
                                    <li key={h.id} className={cn('group flex items-start gap-3 px-5 py-3', !h.is_active && 'opacity-50')}>
                                        <span className={cn('mt-1 grid size-7 shrink-0 place-items-center rounded-lg', h.kind === 'court_vacation' ? 'bg-gold-100 text-gold-700' : 'bg-red-100 text-red-600 dark:bg-red-500/15')}>
                                            {h.kind === 'court_vacation' ? <Sun className="size-4" /> : <CalendarOff className="size-4" />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-center gap-1.5 text-sm font-medium">{h.title}{h.tentative && <Moon className="size-3.5 text-navy-400" />}</p>
                                            <p className="text-xs text-navy-500">{formatDate(h.starts_on, locale, { day: 'numeric', month: 'short' })}{multi && ` – ${formatDate(h.ends_on, locale, { day: 'numeric', month: 'short' })}`}{h.province ? ` · ${h.province}` : ` · ${t('All Pakistan')}`}</p>
                                            {!h.is_active && <Badge>{t('Hidden')}</Badge>}
                                        </div>
                                        <div className="flex gap-0.5 opacity-60 group-hover:opacity-100">
                                            <Button size="sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(h)}><Pencil className="size-4" /></Button>
                                            <ConfirmAction href={route('admin.court-calendar.destroy', h.id)} method="delete" title={t('Remove this closure?')} confirmLabel={t('Remove')} trigger={(open) => <Button size="sm" variant="ghost" aria-label={t('Remove')} onClick={open}><Trash2 className="size-4" /></Button>} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </div>
            {editing !== undefined && <HolidayDialog key={editing?.id ?? `new-${prefill}`} holiday={editing} prefill={prefill} provinces={provinces} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function HolidayDialog({ holiday, prefill, provinces, onClose }: { holiday: Holiday | null; prefill: string | null; provinces: SelectOption[]; onClose: () => void }) {
    const t = useT();
    const form = useForm({
        title: holiday?.title ?? '', title_ur: holiday?.title_ur ?? '', starts_on: holiday?.starts_on ?? prefill ?? '', ends_on: holiday?.ends_on ?? prefill ?? '',
        kind: holiday?.kind ?? 'public_holiday', province_id: holiday?.province_id ? String(holiday.province_id) : '', notes: holiday?.notes ?? '',
        tentative: holiday?.tentative ?? false, is_active: holiday?.is_active ?? true,
    });
    function submit() {
        form.transform((d) => ({ ...d, province_id: d.province_id || null, ends_on: d.ends_on || d.starts_on }));
        const options = { preserveScroll: true, onSuccess: onClose };
        if (holiday) form.put(route('admin.court-calendar.update', holiday.id), options);
        else form.post(route('admin.court-calendar.store'), options);
    }
    return (
        <Modal open onClose={onClose} title={holiday ? t('Edit closure') : t('Add closure')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input wrapperClassName="sm:col-span-2" label={t('Title (English)')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required placeholder={t('e.g. Eid ul Fitr')} />
                <Input wrapperClassName="sm:col-span-2" dir="rtl" label={t('Title (Urdu)')} value={form.data.title_ur} onChange={(e) => form.setData('title_ur', e.target.value)} />
                <Input label={t('From')} type="date" value={form.data.starts_on} onChange={(e) => form.setData('starts_on', e.target.value)} error={form.errors.starts_on} required />
                <Input label={t('To')} type="date" value={form.data.ends_on} min={form.data.starts_on} onChange={(e) => form.setData('ends_on', e.target.value)} error={form.errors.ends_on} hint={t('Same as From for a single day.')} />
                <Select label={t('Type')} value={form.data.kind} onChange={(e) => form.setData('kind', e.target.value)} options={[{ value: 'public_holiday', label: t('Public holiday') }, { value: 'court_vacation', label: t('Court vacation') }, { value: 'other', label: t('Other closure') }]} />
                <Select label={t('Applies to')} value={form.data.province_id} onChange={(e) => form.setData('province_id', e.target.value)} options={provinces} placeholder={t('All Pakistan')} />
                <Textarea wrapperClassName="sm:col-span-2" label={t('Notes')} rows={2} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} placeholder={t('e.g. Notification No. 123, or subject to moon sighting')} />
                <div className="flex flex-wrap gap-4 sm:col-span-2">
                    <Checkbox label={t('Subject to moon sighting')} checked={form.data.tentative} onChange={(e) => form.setData('tentative', e.target.checked)} />
                    <Checkbox label={t('Show publicly')} checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
                </div>
            </div>
        </Modal>
    );
}
