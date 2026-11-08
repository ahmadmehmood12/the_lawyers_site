import { cn } from '@/lib/cn';

type Datum = { label: string; value: number };

/** Horizontal bar list: readable on mobile and in RTL without an axis. */
export function BarList({ data, format = (v) => String(v), className }: { data: Datum[]; format?: (value: number) => string; className?: string }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    if (data.length === 0) return <p className="py-6 text-center text-sm text-navy-500">—</p>;
    return (
        <ul className={cn('space-y-2.5', className)}>
            {data.map((datum) => (
                <li key={datum.label}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-navy-700 dark:text-navy-200">{datum.label}</span>
                        <span className="font-medium text-navy-900 tabular-nums dark:text-white">{format(datum.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-navy-50 dark:bg-navy-800">
                        <div className="h-2 rounded-full bg-navy-700 dark:bg-gold-500" style={{ width: `${(datum.value / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Vertical column chart for monthly series (SVG, no dependency). */
export function ColumnChart({ data, format = (v) => String(v), height = 180 }: { data: Datum[]; format?: (value: number) => string; height?: number }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    const barWidth = 100 / Math.max(1, data.length);
    return (
        <div>
            <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="Chart">
                {[0.25, 0.5, 0.75, 1].map((f) => (
                    <line key={f} x1="0" x2="100" y1={height - (height - 20) * f} y2={height - (height - 20) * f} className="stroke-navy-100 dark:stroke-navy-800" strokeWidth="0.3" />
                ))}
                {data.map((datum, i) => {
                    const h = ((height - 20) * datum.value) / max;
                    return (
                        <rect key={datum.label} x={i * barWidth + barWidth * 0.18} width={barWidth * 0.64} y={height - h} height={h} rx="1" className="fill-navy-700 dark:fill-gold-500">
                            <title>{`${datum.label}: ${format(datum.value)}`}</title>
                        </rect>
                    );
                })}
            </svg>
            <div className="mt-1 grid text-center text-[10px] text-navy-500" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
                {data.map((datum) => (
                    <span key={datum.label} className="truncate">
                        {datum.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
