import { Link } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Minus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

/*
 * Analytics charts (SVG, no dependency). Colours come from the --viz-* tokens in app.css,
 * assigned to series in a fixed order; text always uses ink colours. Every chart has a hover
 * layer, and a legend whenever there are two or more series.
 */

export const vizColor = (index: number) => `var(--viz-${(index % 8) + 1})`;

export type Bucket = { label: string; from: string; to: string };
export type Series = { key: string; label: string; values: number[]; color?: string; dashed?: boolean };
export type Slice = { key: string; label: string; value: number; href?: string | null };

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function niceScale(max: number): { top: number; ticks: number[] } {
    if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
    const raw = max / 4;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude;
    return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(600);
    useEffect(() => {
        if (!ref.current) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return [ref, width];
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-600 dark:text-navy-300">
            {items.map((item) => (
                <li key={item.label} className="inline-flex items-center gap-1.5">
                    <svg width="16" height="8" aria-hidden><line x1="1" x2="15" y1="4" y2="4" stroke={item.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={item.dashed ? '3 3' : undefined} /></svg>
                    {item.label}
                </li>
            ))}
        </ul>
    );
}

/**
 * Line or area chart for one or more series over time, with a crosshair tooltip.
 * `onSelect` makes buckets clickable (drill down into that day, week or month).
 */
export function TrendChart({ buckets, series, format = (v) => compact.format(v), height = 240, area = false, onSelect, emptyLabel }: {
    buckets: Bucket[]; series: Series[]; format?: (value: number) => string; height?: number; area?: boolean; onSelect?: (bucket: Bucket) => void; emptyLabel?: string;
}) {
    const [ref, width] = useWidth<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);
    const colored = series.map((s, i) => ({ ...s, color: s.color ?? vizColor(i) }));
    const max = Math.max(0, ...colored.flatMap((s) => s.values));
    const { top, ticks } = niceScale(max);
    const pad = { left: 44, right: 12, top: 10, bottom: 26 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const count = buckets.length;
    const x = (i: number) => pad.left + (count <= 1 ? plotW / 2 : (i / (count - 1)) * plotW);
    const y = (v: number) => pad.top + plotH - (v / top) * plotH;
    const labelEvery = Math.max(1, Math.ceil(count / Math.max(2, Math.floor(plotW / 70))));
    const empty = max === 0;

    const pointer = (clientX: number) => {
        const box = ref.current?.getBoundingClientRect();
        if (!box || count === 0) return;
        const relative = clientX - box.left - pad.left;
        setHover(Math.min(count - 1, Math.max(0, Math.round(count <= 1 ? 0 : (relative / plotW) * (count - 1)))));
    };

    return (
        <div className="space-y-2">
            {colored.length > 1 && <Legend items={colored.map((s) => ({ label: s.label, color: s.color, dashed: s.dashed }))} />}
            <div ref={ref} className="relative select-none" style={{ height }}>
                <svg width={width} height={height} role="img" aria-label={colored.map((s) => s.label).join(', ')}
                    onMouseMove={(e) => pointer(e.clientX)} onMouseLeave={() => setHover(null)}
                    onTouchStart={(e) => pointer(e.touches[0].clientX)} onTouchMove={(e) => pointer(e.touches[0].clientX)}
                    onClick={() => hover !== null && onSelect?.(buckets[hover])} className={onSelect ? 'cursor-pointer' : undefined}>
                    {ticks.map((tick) => (
                        <g key={tick}>
                            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--viz-grid)" strokeWidth="1" />
                            <text x={pad.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-navy-500 text-[10px] tabular-nums">{compact.format(tick)}</text>
                        </g>
                    ))}
                    {buckets.map((bucket, i) => ((i % labelEvery === 0 && (count - 1 - i >= labelEvery || i === count - 1)) || i === count - 1) && (
                        <text key={`${bucket.from}-${i}`} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'} className="fill-navy-500 text-[10px]">{bucket.label}</text>
                    ))}
                    {colored.map((s) => {
                        const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
                        return (
                            <g key={s.key}>
                                {area && !s.dashed && count > 1 && <polygon points={`${x(0)},${y(0)} ${points} ${x(count - 1)},${y(0)}`} fill={s.color} opacity="0.12" />}
                                <polyline points={points} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '4 4' : undefined} />
                                {count <= 1 && <circle cx={x(0)} cy={y(s.values[0] ?? 0)} r="4" fill={s.color} />}
                            </g>
                        );
                    })}
                    {hover !== null && (
                        <g>
                            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke="var(--viz-muted)" strokeWidth="1" />
                            {colored.map((s) => <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r="4.5" fill={s.color} stroke="var(--viz-surface)" strokeWidth="2" />)}
                        </g>
                    )}
                </svg>
                {empty && emptyLabel && <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-navy-500">{emptyLabel}</p>}
                {hover !== null && buckets[hover] && (
                    <div className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-md border border-navy-100 bg-white px-3 py-2 text-xs shadow-lg dark:border-navy-700 dark:bg-navy-950"
                        style={x(hover) > width / 2 ? { right: width - x(hover) + 10 } : { left: x(hover) + 10 }}>
                        <p className="mb-1 font-semibold text-navy-900 dark:text-white">{buckets[hover].label}</p>
                        {colored.map((s) => (
                            <p key={s.key} className="flex items-center justify-between gap-3 text-navy-600 dark:text-navy-300">
                                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                                <span className="font-medium text-navy-900 tabular-nums dark:text-white">{format(s.values[hover] ?? 0)}</span>
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Donut for a part-to-whole split (at most 7 slices, the rest folded into "Other"), with a
 * legend that carries values and shares, so identity never depends on colour alone.
 */
export function DonutChart({ data, format = (v) => compact.format(v), centerLabel, size = 168 }: { data: Slice[]; format?: (value: number) => string; centerLabel?: string; size?: number }) {
    const t = useT();
    const [active, setActive] = useState<number | null>(null);
    const slices = useMemo(() => {
        const positive = data.filter((d) => d.value > 0);
        if (positive.length <= 8) return data;
        const kept = positive.slice(0, 7);
        return [...kept, { key: 'other', label: t('Other'), value: positive.slice(7).reduce((sum, d) => sum + d.value, 0) }];
    }, [data, t]);
    const total = slices.reduce((sum, d) => sum + d.value, 0);
    const radius = size / 2 - 6;
    const stroke = 22;
    const circumference = 2 * Math.PI * (radius - stroke / 2);
    let offset = 0;

    return (
        <div className="@container"><div className="flex flex-col items-center gap-4 @sm:flex-row @sm:items-start">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={slices.map((s) => `${s.label} ${format(s.value)}`).join(', ')} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius - stroke / 2} fill="none" stroke="var(--viz-grid)" strokeWidth={stroke} />
                    {total > 0 && slices.map((slice, i) => {
                        const length = (slice.value / total) * circumference;
                        const gap = slices.filter((s) => s.value > 0).length > 1 ? Math.min(2, length) : 0;
                        const element = slice.value > 0 && (
                            <circle key={slice.key} cx={size / 2} cy={size / 2} r={radius - stroke / 2} fill="none" stroke={vizColor(i)}
                                strokeWidth={active === i ? stroke + 4 : stroke} strokeDasharray={`${Math.max(0, length - gap)} ${circumference}`} strokeDashoffset={-offset}
                                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className="transition-[stroke-width]">
                                <title>{`${slice.label}: ${format(slice.value)}`}</title>
                            </circle>
                        );
                        offset += length;
                        return element;
                    })}
                </svg>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                        <p className="text-xl font-semibold text-navy-900 tabular-nums dark:text-white">{format(active !== null ? slices[active].value : total)}</p>
                        <p className="max-w-24 truncate text-[11px] text-navy-500">{active !== null ? slices[active].label : (centerLabel ?? t('Total'))}</p>
                    </div>
                </div>
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
                {slices.map((slice, i) => {
                    const share = total > 0 ? Math.round((slice.value / total) * 1000) / 10 : 0;
                    const body = (
                        <span className="flex items-center justify-between gap-3">
                            <span className="inline-flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-sm" style={{ background: vizColor(i) }} /><span className="truncate text-navy-700 dark:text-navy-200">{slice.label}</span></span>
                            <span className="shrink-0 tabular-nums"><span className="font-medium text-navy-900 dark:text-white">{format(slice.value)}</span><span className="ms-1.5 text-xs text-navy-500">{share}%</span></span>
                        </span>
                    );
                    return (
                        <li key={slice.key} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className={cn('rounded px-1.5 py-0.5', active === i && 'bg-navy-50 dark:bg-navy-800')}>
                            {slice.href ? <Link href={slice.href} className="block hover:underline">{body}</Link> : body}
                        </li>
                    );
                })}
            </ul>
        </div></div>
    );
}

/** Ranked horizontal bars (leaderboards, comparisons). Rows can link to the records behind them. */
export function RankedBars({ data, format = (v) => compact.format(v), limit = 10, color = vizColor(0), ranked = true }: { data: (Slice & { hint?: ReactNode })[]; format?: (value: number) => string; limit?: number; color?: string; ranked?: boolean }) {
    const t = useT();
    const rows = data.slice(0, limit);
    const max = Math.max(1, ...rows.map((d) => d.value));
    if (rows.length === 0 || rows.every((r) => r.value === 0)) return <p className="py-6 text-center text-sm text-navy-500">{t('No records in this period.')}</p>;
    return (
        <ol className="space-y-2.5">
            {rows.map((row, i) => {
                const label = <span className="truncate text-navy-700 dark:text-navy-200">{row.label}</span>;
                return (
                    <li key={row.key} title={`${row.label}: ${format(row.value)}`}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                                {ranked && <span className="w-4 shrink-0 text-end text-xs text-navy-400 tabular-nums">{i + 1}</span>}
                                {row.href ? <Link href={row.href} className="min-w-0 truncate hover:underline">{label}</Link> : label}
                                {row.hint && <span className="shrink-0 text-xs text-navy-500">{row.hint}</span>}
                            </span>
                            <span className="shrink-0 font-medium text-navy-900 tabular-nums dark:text-white">{format(row.value)}</span>
                        </div>
                        <div className={cn('h-1.5 rounded-full bg-navy-50 dark:bg-navy-800', ranked && 'ms-6')}>
                            <div className="h-1.5 rounded-full" style={{ width: `${(row.value / max) * 100}%`, background: color }} />
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

/** A KPI with the change against the previous period. `inverse` when lower is better. */
export function KpiCard({ label, value, change, previous, hint, href, icon, inverse = false, unavailable }: {
    label: ReactNode; value: ReactNode; change?: number | null; previous?: ReactNode; hint?: ReactNode; href?: string | null; icon?: ReactNode; inverse?: boolean; unavailable?: ReactNode;
}) {
    const t = useT();
    const good = change !== null && change !== undefined && (inverse ? change < 0 : change > 0);
    const bad = change !== null && change !== undefined && (inverse ? change > 0 : change < 0);
    const body = (
        <div className="flex h-full flex-col rounded-card border border-navy-100 bg-white px-4 py-3.5 transition-colors dark:border-navy-800 dark:bg-navy-900">
            <p className="flex items-center gap-1.5 text-[13px] text-navy-600 dark:text-navy-300">
                {icon && <span className="shrink-0 text-navy-400 [&>svg]:size-4" aria-hidden>{icon}</span>}
                <span className="truncate">{label}</span>
            </p>
            {unavailable ? (
                <p className="mt-1.5 text-sm font-medium text-navy-500">{unavailable}</p>
            ) : (
                <p className="mt-1 text-2xl font-semibold text-navy-900 tabular-nums dark:text-white">{value}</p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1 text-xs">
                {change !== undefined && !unavailable && (
                    change === null ? (
                        <span className="inline-flex items-center gap-0.5 text-navy-500"><Minus className="size-3" />{t('No earlier data')}</span>
                    ) : (
                        <span className={cn('inline-flex items-center gap-0.5 font-medium tabular-nums', good && 'text-verdant-700 dark:text-verdant-300', bad && 'text-red-700 dark:text-red-300', !good && !bad && 'text-navy-500')}>
                            {change > 0 ? <ArrowUp className="size-3" /> : change < 0 ? <ArrowDown className="size-3" /> : <Minus className="size-3" />}
                            {`${change > 0 ? '+' : ''}${change}%`}
                        </span>
                    )
                )}
                {previous !== undefined && change !== null && !unavailable && <span className="text-navy-500">{t('vs :value', { value: String(previous) })}</span>}
                {hint && <span className="text-navy-500">{hint}</span>}
            </div>
        </div>
    );
    return href ? <Link href={href} className="block h-full rounded-card hover:[&>div]:border-navy-300 dark:hover:[&>div]:border-navy-600">{body}</Link> : body;
}

export type SortColumn<T> = { key: string; label: string; render?: (row: T) => ReactNode; value?: (row: T) => number | string | null; align?: 'start' | 'end'; hideOnMobile?: boolean };

/** Client-side sortable, filterable table for dashboard rankings (rows are already aggregated). */
export function SortableTable<T extends Record<string, unknown>>({ rows, columns, initialSort, search, pageSize = 10, empty, rowKey }: {
    rows: T[]; columns: SortColumn<T>[]; initialSort?: { key: string; direction: 'asc' | 'desc' }; search?: (row: T) => string; pageSize?: number; empty?: string; rowKey: (row: T) => string | number;
}) {
    const t = useT();
    const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, direction: 'desc' as 'asc' | 'desc' });
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);
    const valueOf = (row: T, key: string) => {
        const column = columns.find((c) => c.key === key);
        return column?.value ? column.value(row) : (row[key] as number | string | null);
    };
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const list = needle && search ? rows.filter((row) => search(row).toLowerCase().includes(needle)) : rows;
        return [...list].sort((a, b) => {
            const left = valueOf(a, sort.key);
            const right = valueOf(b, sort.key);
            const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left ?? '').localeCompare(String(right ?? ''));
            return sort.direction === 'asc' ? order : -order;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, query, sort]);
    const visible = expanded ? filtered : filtered.slice(0, pageSize);

    return (
        <div>
            {search && (
                <div className="border-b border-navy-100 px-4 py-2.5 dark:border-navy-800">
                    <label className="relative block max-w-xs">
                        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Filter')} aria-label={t('Filter')}
                            className="w-full rounded-md border border-navy-200 bg-white py-1.5 ps-8 pe-3 text-sm focus:border-navy-400 focus:outline-none dark:border-navy-700 dark:bg-navy-950" />
                    </label>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-navy-100 text-xs text-navy-500 dark:border-navy-800">
                            {columns.map((column) => (
                                <th key={column.key} scope="col" className={cn('px-4 py-2 font-medium whitespace-nowrap', column.align === 'end' ? 'text-end' : 'text-start', column.hideOnMobile && 'hidden md:table-cell')}
                                    aria-sort={sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                    <button type="button" className="inline-flex items-center gap-1 hover:text-navy-800 dark:hover:text-white"
                                        onClick={() => setSort((s) => ({ key: column.key, direction: s.key === column.key && s.direction === 'desc' ? 'asc' : 'desc' }))}>
                                        {column.label}
                                        {sort.key === column.key ? (sort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-navy-500">{empty ?? t('No records in this period.')}</td></tr>}
                        {visible.map((row) => (
                            <tr key={rowKey(row)} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/60 dark:border-navy-800/60 dark:hover:bg-navy-800/40">
                                {columns.map((column) => (
                                    <td key={column.key} className={cn('px-4 py-2.5', column.align === 'end' ? 'text-end tabular-nums' : 'text-start', column.hideOnMobile && 'hidden md:table-cell')}>
                                        {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filtered.length > pageSize && (
                <div className="border-t border-navy-100 px-4 py-2 text-center dark:border-navy-800">
                    <button type="button" onClick={() => setExpanded((v) => !v)} className="text-sm font-medium text-navy-700 hover:underline dark:text-navy-200">
                        {expanded ? t('Show fewer') : t('Show all :count', { count: filtered.length })}
                    </button>
                </div>
            )}
        </div>
    );
}
