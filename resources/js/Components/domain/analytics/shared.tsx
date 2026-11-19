import type { ReactNode } from 'react';
import { Card, CardBody, CardHeader, type Bucket, type Series } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { formatMoney, formatNumber } from '@/lib/format';
import { useLocale } from '@/lib/i18n';

export type Kpi = { value: number; previous: number; change: number | null };
export type Item = { key: string; label: string; value: number };
export type Point = Bucket & { key: string; value: number };
export type Trend = { buckets: Bucket[]; series: Series[] };
export type Period = { preset: string; from: string; to: string; interval: string; previous_from: string; previous_to: string };

/** What every tab panel receives: its data, a drill-down into one chart bucket and links to other tabs. */
export type PanelProps<T> = { data: T; select: (bucket: Bucket) => void; tabHref: (tab: string) => string; period: Period };

export function useFormat() {
    const { locale } = useLocale();
    return {
        number: (value: number | null | undefined) => formatNumber(value ?? 0, locale),
        money: (value: number | null | undefined) => formatMoney(value ?? 0, locale),
        percent: (value: number | null | undefined) => (value === null || value === undefined ? '—' : `${formatNumber(value, locale)}%`),
    };
}

/** A single series of points as chart input. */
export const single = (points: Point[], label: string): Trend => ({
    buckets: points.map(({ label: l, from, to }) => ({ label: l, from, to })),
    series: [{ key: 'value', label, values: points.map((p) => p.value) }],
});

export function ChartCard({ title, description, actions, children, className, bodyClassName }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
    return (
        <Card className={cn('min-w-0', className)}>
            <CardHeader title={title} description={description} actions={actions} />
            <CardBody className={bodyClassName}>{children}</CardBody>
        </Card>
    );
}

const KPI_COLUMNS = { 4: 'md:grid-cols-4', 5: 'md:grid-cols-3 xl:grid-cols-5', 7: 'md:grid-cols-4 2xl:grid-cols-7' } as const;

export function KpiGrid({ children, columns = 5 }: { children: ReactNode; columns?: keyof typeof KPI_COLUMNS }) {
    return <div className={cn('grid grid-cols-2 gap-3', KPI_COLUMNS[columns])}>{children}</div>;
}

export function SectionTitle({ children, description }: { children: ReactNode; description?: ReactNode }) {
    return (
        <div className="mt-8 mb-3">
            <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{children}</h2>
            {description && <p className="text-sm text-navy-500">{description}</p>}
        </div>
    );
}

/** A name with an optional avatar, linking to the record when there is one. */
export function NameCell({ name, avatar, subtitle, href }: { name: string; avatar?: string | null; subtitle?: ReactNode; href?: string | null }) {
    const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    return (
        <span className="flex min-w-0 items-center gap-2.5">
            {avatar ? <img src={avatar} alt="" className="size-8 shrink-0 rounded-full object-cover" /> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700 dark:bg-navy-800 dark:text-navy-200">{initials}</span>}
            <span className="min-w-0">
                {href ? <a href={href} className="block truncate font-medium text-navy-900 hover:underline dark:text-white">{name}</a> : <span className="block truncate font-medium text-navy-900 dark:text-white">{name}</span>}
                {subtitle && <span className="block truncate text-xs text-navy-500">{subtitle}</span>}
            </span>
        </span>
    );
}

export function Change({ value }: { value: number | null }) {
    if (value === null) return <span className="text-navy-400">—</span>;
    return <span className={cn('font-medium', value > 0 ? 'text-verdant-700 dark:text-verdant-300' : value < 0 ? 'text-red-700 dark:text-red-300' : 'text-navy-500')}>{`${value > 0 ? '+' : ''}${value}%`}</span>;
}
