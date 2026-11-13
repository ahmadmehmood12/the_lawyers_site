import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';

/**
 * Themed date, time and date+time picker used by <Input type="date|time|datetime-local">.
 * Values keep the native formats (YYYY-MM-DD, HH:mm, YYYY-MM-DDTHH:mm) and onChange receives an
 * event-like object, so existing `e.target.value` handlers keep working. The popover is fixed
 * positioned, so it is not clipped by modals or scrolling cards.
 */

export type PickerKind = 'date' | 'time' | 'datetime-local';

type Props = {
    id?: string;
    type: PickerKind;
    value?: string | number | readonly string[];
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    name?: string;
    min?: string | number;
    max?: string | number;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    placeholder?: string;
    className?: string;
    step?: number | string;
    'aria-label'?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = (s: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const parseTime = (s: string): [number, number] | null => {
    const m = /(\d{2}):(\d{2})/.exec(s.includes('T') ? s.split('T')[1] : s);
    return m ? [Number(m[1]), Number(m[2])] : null;
};

export function DateTimePicker({ id, type, value, onChange, name, min, max, disabled, required, invalid, placeholder, className, step, ...rest }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const raw = String(value ?? '');
    const [open, setOpen] = useState(false);
    const button = useRef<HTMLButtonElement>(null);
    const pop = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number; up: boolean }>({ left: 0, top: 0, up: false });
    const hasDate = type !== 'time';
    const hasTime = type !== 'date';
    const date = hasDate ? parseDate(raw) : null;
    const time = hasTime ? parseTime(raw) : null;
    const intl = locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB';
    const minuteStep = Math.max(1, Math.min(30, Math.round(Number(step ?? 300) / 60) || 5));

    function emit(next: string) {
        onChange?.({ target: { value: next, name: name ?? '' }, currentTarget: { value: next, name: name ?? '' } } as unknown as ChangeEvent<HTMLInputElement>);
    }

    function pickDate(d: Date) {
        if (type === 'date') {
            emit(toIso(d));
            setOpen(false);
        } else {
            const [h, m] = time ?? [9, 0];
            emit(`${toIso(d)}T${pad(h)}:${pad(m)}`);
        }
    }

    function pickTime(h: number, m: number) {
        if (type === 'time') emit(`${pad(h)}:${pad(m)}`);
        else emit(`${toIso(date ?? new Date())}T${pad(h)}:${pad(m)}`);
    }

    const label = useMemo(() => {
        const parts: string[] = [];
        if (date) parts.push(new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short', year: 'numeric' }).format(date));
        if (time) parts.push(new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, time[0], time[1])));
        return parts.join(', ');
    }, [date?.getTime(), time?.[0], time?.[1], intl]); // eslint-disable-line react-hooks/exhaustive-deps

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const r = button.current?.getBoundingClientRect();
            if (!r) return;
            const width = type === 'datetime-local' ? 470 : type === 'time' ? 236 : 300;
            const height = pop.current?.offsetHeight ?? 360;
            const up = r.bottom + height + 8 > window.innerHeight && r.top - height - 8 > 0;
            setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), top: up ? r.top - height - 6 : r.bottom + 6, up });
        };
        place();
        const raf = requestAnimationFrame(place);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, type]);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent) {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    setOpen(false);
                    button.current?.focus();
                }
                return;
            }
            const target = e.target as Node;
            if (!pop.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close, true);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close, true);
        };
    }, [open]);

    const Icon = type === 'time' ? Clock : CalendarDays;

    return (
        <div className="relative">
            <button ref={button} id={id} type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} aria-invalid={invalid} aria-label={rest['aria-label']}
                className={cn(
                    'flex h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 text-start text-sm text-navy-900 shadow-sm transition outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-navy-900 dark:text-white',
                    invalid ? 'border-red-400' : open ? 'border-gold-500 ring-2 ring-gold-500/25' : 'border-navy-200 hover:border-navy-300 dark:border-navy-700',
                    className,
                )}>
                <Icon className="size-4 shrink-0 text-navy-400" />
                <span className={cn('min-w-0 flex-1 truncate', !label && 'text-navy-400')}>{label || placeholder || (type === 'time' ? t('Select time') : type === 'date' ? t('Select date') : t('Select date and time'))}</span>
                {label && !required && !disabled && (
                    <span role="button" tabIndex={-1} aria-label={t('Clear')} onClick={(e) => { e.stopPropagation(); emit(''); }} className="rounded p-0.5 text-navy-400 hover:bg-navy-100 hover:text-navy-700 dark:hover:bg-navy-800"><X className="size-3.5" /></span>
                )}
            </button>
            {name && <input type="hidden" name={name} value={raw} />}
            <AnimatePresence>
                {open && (
                    <motion.div ref={pop} role="dialog" aria-label={type === 'time' ? t('Choose a time') : t('Choose a date')}
                        initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.14 }}
                        style={{ position: 'fixed', left: pos.left, top: pos.top }}
                        className="z-[90] flex overflow-hidden rounded-xl border border-navy-100 bg-white shadow-pop dark:border-navy-700 dark:bg-navy-900">
                        {hasDate && <CalendarPane value={date} min={min ? parseDate(String(min)) : null} max={max ? parseDate(String(max)) : null} onPick={pickDate} onClear={required ? undefined : () => { emit(''); setOpen(false); }} />}
                        {hasTime && <TimePane value={time} step={minuteStep} onPick={pickTime} onDone={() => setOpen(false)} divided={hasDate} />}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CalendarPane({ value, min, max, onPick, onClear }: { value: Date | null; min: Date | null; max: Date | null; onPick: (d: Date) => void; onClear?: () => void }) {
    const t = useT();
    const { locale } = useLocale();
    const [view, setView] = useState(() => {
        const base = value ?? new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const [dir, setDir] = useState(0);
    const intl = locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB';
    const today = toIso(new Date());
    const lead = (view.getDay() + 6) % 7;
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(intl, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)));
    const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(intl, { month: 'long' }).format(new Date(2024, i, 1)));
    const year = view.getFullYear();
    const years = Array.from({ length: 111 }, (_, i) => new Date().getFullYear() + 10 - i);
    const blocked = (d: Date) => (min && d < min) || (max && d > max);
    const shift = (n: number) => { setDir(n); setView(new Date(year, view.getMonth() + n, 1)); };

    return (
        <div className="w-[300px] p-3">
            <div className="mb-2 flex items-center gap-1">
                <button type="button" onClick={() => shift(-1)} aria-label={t('Previous month')} className="grid size-8 place-items-center rounded-lg text-navy-500 hover:bg-navy-100 dark:hover:bg-navy-800"><ChevronLeft className="size-4 rtl:rotate-180" /></button>
                <div className="flex flex-1 justify-center gap-1">
                    <select value={view.getMonth()} onChange={(e) => setView(new Date(year, Number(e.target.value), 1))} aria-label={t('Month')} className="rounded-md border-0 bg-transparent py-1 ps-2 pe-7 text-sm font-semibold hover:bg-navy-50 focus:ring-2 focus:ring-gold-500/30 dark:hover:bg-navy-800">
                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select value={year} onChange={(e) => setView(new Date(Number(e.target.value), view.getMonth(), 1))} aria-label={t('Year')} className="rounded-md border-0 bg-transparent py-1 ps-2 pe-7 text-sm font-semibold tabular-nums hover:bg-navy-50 focus:ring-2 focus:ring-gold-500/30 dark:hover:bg-navy-800">
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button type="button" onClick={() => shift(1)} aria-label={t('Next month')} className="grid size-8 place-items-center rounded-lg text-navy-500 hover:bg-navy-100 dark:hover:bg-navy-800"><ChevronRight className="size-4 rtl:rotate-180" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-navy-400">{weekdays.map((w, i) => <span key={i} className="py-1">{w}</span>)}</div>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`${year}-${view.getMonth()}`} initial={{ opacity: 0, x: dir * 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -16 }} transition={{ duration: 0.15 }} className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: lead }).map((_, i) => <span key={`l${i}`} />)}
                    {Array.from({ length: days }, (_, i) => new Date(year, view.getMonth(), i + 1)).map((d) => {
                        const iso = toIso(d);
                        const selected = value && toIso(value) === iso;
                        const off = blocked(d);
                        return (
                            <button key={iso} type="button" disabled={!!off} onClick={() => onPick(d)}
                                className={cn('grid aspect-square place-items-center rounded-lg text-sm tabular-nums transition',
                                    selected ? 'bg-navy-900 font-semibold text-white shadow dark:bg-gold-500 dark:text-navy-950'
                                        : iso === today ? 'font-semibold text-gold-700 ring-1 ring-inset ring-gold-400 hover:bg-gold-50 dark:text-gold-300 dark:hover:bg-gold-500/10'
                                            : 'text-navy-800 hover:bg-navy-100 dark:text-navy-100 dark:hover:bg-navy-800',
                                    off && 'cursor-not-allowed opacity-30 hover:bg-transparent')}>
                                {d.getDate()}
                            </button>
                        );
                    })}
                </motion.div>
            </AnimatePresence>
            <div className="mt-2 flex items-center justify-between border-t border-navy-100 pt-2 dark:border-navy-800">
                <button type="button" onClick={() => { const now = new Date(); setView(new Date(now.getFullYear(), now.getMonth(), 1)); if (!blocked(now)) onPick(now); }} className="rounded-md px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-800">{t('Today')}</button>
                {onClear && <button type="button" onClick={onClear} className="rounded-md px-2 py-1 text-xs text-navy-500 hover:bg-navy-100 dark:hover:bg-navy-800">{t('Clear')}</button>}
            </div>
        </div>
    );
}

function TimePane({ value, step, onPick, onDone, divided }: { value: [number, number] | null; step: number; onPick: (h: number, m: number) => void; onDone: () => void; divided: boolean }) {
    const t = useT();
    const [h, m] = value ?? [-1, -1];
    const hour12 = h < 0 ? -1 : h % 12 === 0 ? 12 : h % 12;
    const pm = h >= 12;
    const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
    const set = (nh12: number, nm: number, npm: boolean) => onPick((nh12 % 12) + (npm ? 12 : 0), nm);
    const quick = [[9, 0], [10, 0], [11, 0], [14, 0], [17, 0]];
    const colRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        colRefs.current.forEach((col) => col?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' }));
    }, []);

    const cell = (active: boolean) => cn('w-full rounded-md py-1.5 text-sm tabular-nums transition', active ? 'bg-navy-900 font-semibold text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-800');

    return (
        <div className={cn('flex w-[236px] flex-col p-3', divided && 'w-[170px] border-s border-navy-100 dark:border-navy-800')}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy-400"><Clock className="size-3.5" />{t('Time')}</p>
            <div className="grid flex-1 grid-cols-3 gap-1" dir="ltr">
                <div ref={(el) => { colRefs.current[0] = el; }} className="max-h-52 space-y-0.5 overflow-y-auto [scrollbar-width:none]">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <button key={n} type="button" data-active={n === hour12} onClick={() => set(n, Math.max(0, m), h < 0 ? n < 7 || n === 12 : pm)} className={cell(n === hour12)}>{n}</button>)}
                </div>
                <div ref={(el) => { colRefs.current[1] = el; }} className="max-h-52 space-y-0.5 overflow-y-auto [scrollbar-width:none]">
                    {minutes.map((n) => <button key={n} type="button" data-active={n === m} onClick={() => set(hour12 < 0 ? 9 : hour12, n, h < 0 ? false : pm)} className={cell(n === m)}>{pad(n)}</button>)}
                </div>
                <div className="space-y-0.5">
                    {[false, true].map((p) => <button key={String(p)} type="button" onClick={() => set(hour12 < 0 ? 9 : hour12, Math.max(0, m), p)} className={cell(h >= 0 && pm === p)}>{p ? 'PM' : 'AM'}</button>)}
                </div>
            </div>
            {!divided && (
                <div className="mt-2 flex flex-wrap gap-1 border-t border-navy-100 pt-2 dark:border-navy-800">
                    {quick.map(([qh, qm]) => <button key={qh} type="button" onClick={() => onPick(qh, qm)} className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-700 hover:bg-gold-100 dark:bg-navy-800 dark:text-navy-200">{(qh % 12) || 12}:{pad(qm)} {qh >= 12 ? 'PM' : 'AM'}</button>)}
                </div>
            )}
            <button type="button" onClick={onDone} className="mt-2 rounded-lg bg-navy-900 py-1.5 text-sm font-semibold text-white hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950">{t('Done')}</button>
        </div>
    );
}
