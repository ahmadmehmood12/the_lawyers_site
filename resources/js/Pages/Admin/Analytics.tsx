import { Deferred, router } from '@inertiajs/react';
import { CalendarRange, RefreshCw } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { AppointmentsPanel } from '@/Components/domain/analytics/AppointmentsPanel';
import { ContentPanel } from '@/Components/domain/analytics/ContentPanel';
import { FinancePanel } from '@/Components/domain/analytics/FinancePanel';
import { ModulesPanel } from '@/Components/domain/analytics/ModulesPanel';
import { OverviewPanel } from '@/Components/domain/analytics/OverviewPanel';
import { PracticePanel } from '@/Components/domain/analytics/PracticePanel';
import type { PanelProps, Period } from '@/Components/domain/analytics/shared';
import { TrafficPanel } from '@/Components/domain/analytics/TrafficPanel';
import { Button, DateTimePicker, PageHeader, Select, Skeleton, Tabs, type Bucket } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Filters = { range: string; interval: string; from: string | null; to: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PANELS: Record<string, ComponentType<PanelProps<any>>> = {
    overview: OverviewPanel,
    traffic: TrafficPanel,
    practice: PracticePanel,
    appointments: AppointmentsPanel,
    finance: FinancePanel,
    content: ContentPanel,
    modules: ModulesPanel,
};

/**
 * Admin, Analytics: platform-wide numbers from real records for a date range, one tab at a
 * time (loaded as a deferred prop). KPI cards and chart points drill into the records or into
 * a narrower range. Super Admin and Admin only (analytics.platform).
 */
export default function AdminAnalytics({ tab, filters, period, data }: { tab: string; filters: Filters; period: Period; data?: Record<string, unknown> & { generated_at?: string } }) {
    const t = useT();
    const { locale } = useLocale();
    const [from, setFrom] = useState(filters.from ?? period.from);
    const [to, setTo] = useState(filters.to ?? period.to);

    const params = (overrides: Partial<Filters & { tab: string; fresh: number }> = {}) => {
        const next: Record<string, string | number | null | undefined> = { tab, ...filters, ...overrides };
        if (next.interval === 'auto') delete next.interval;
        if (next.tab === 'overview') delete next.tab;
        return Object.fromEntries(Object.entries(next).filter(([, v]) => v !== null && v !== undefined && v !== ''));
    };
    const visit = (overrides: Partial<Filters & { tab: string; fresh: number }>) => {
        const custom = (overrides.range ?? filters.range) === 'custom';
        router.get(route('admin.analytics.index'), params({ ...overrides, from: custom ? (overrides.from ?? filters.from ?? from) : null, to: custom ? (overrides.to ?? filters.to ?? to) : null }), { preserveState: true, preserveScroll: true, replace: true });
    };
    const tabHref = (key: string) => route('admin.analytics.index', params({ tab: key }));
    const select = (bucket: Bucket) => {
        setFrom(bucket.from);
        setTo(bucket.to);
        visit({ range: 'custom', from: bucket.from, to: bucket.to, interval: 'auto' });
    };

    const presets = [
        { value: 'today', label: t('Today') },
        { value: '7d', label: t('Last 7 days') },
        { value: '30d', label: t('Last 30 days') },
        { value: 'month', label: t('This month') },
        { value: 'year', label: t('This year') },
        { value: 'custom', label: t('Custom') },
    ];
    const tabs = [
        { key: 'overview', label: t('Overview') },
        { key: 'traffic', label: t('Website & social') },
        { key: 'practice', label: t('Cases & lawyers') },
        { key: 'appointments', label: t('Appointments') },
        { key: 'finance', label: t('Revenue & fees') },
        { key: 'content', label: t('Content & reviews') },
        { key: 'modules', label: t('Users & modules') },
    ].map((item) => ({ ...item, href: tabHref(item.key) }));
    const Panel = PANELS[tab] ?? OverviewPanel;

    return (
        <AppLayout title={t('Analytics')} area="admin" wide>
            <PageHeader
                title={t('Analytics')}
                description={t('Live figures from the platform’s own records for the selected period, compared with the period before.')}
                actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} onClick={() => visit({ fresh: 1 })}>{t('Refresh')}</Button>}
            />

            <div className="sticky top-14 z-20 -mx-3 mb-4 border-b border-navy-100 bg-white/90 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-navy-800 dark:bg-navy-950/90">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap gap-1 rounded-lg bg-navy-50 p-1 dark:bg-navy-900" role="group" aria-label={t('Date range')}>
                        {presets.map((preset) => (
                            <button key={preset.value} type="button" aria-pressed={filters.range === preset.value}
                                onClick={() => (preset.value === 'custom' ? visit({ range: 'custom', from, to }) : visit({ range: preset.value }))}
                                className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', filters.range === preset.value ? 'bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-white' : 'text-navy-600 hover:text-navy-900 dark:text-navy-300 dark:hover:text-white')}>
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    {filters.range === 'custom' && (
                        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); visit({ range: 'custom', from, to }); }}>
                            <DateTimePicker type="date" aria-label={t('From')} value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                            <span className="text-navy-400">–</span>
                            <DateTimePicker type="date" aria-label={t('To')} value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />
                            <Button type="submit" size="sm">{t('Apply')}</Button>
                        </form>
                    )}
                    <Select aria-label={t('Group by')} wrapperClassName="w-36 ms-auto" value={filters.interval} onChange={(e) => visit({ interval: e.target.value })}
                        options={[{ value: 'auto', label: t('Automatic') }, { value: 'day', label: t('Daily') }, { value: 'week', label: t('Weekly') }, { value: 'month', label: t('Monthly') }, { value: 'year', label: t('Yearly') }]} />
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-navy-500">
                    <CalendarRange className="size-3.5" />
                    <span className="font-medium text-navy-700 dark:text-navy-200">{formatDate(period.from, locale)} – {formatDate(period.to, locale)}</span>
                    <span>{t('compared with :from – :to', { from: formatDate(period.previous_from, locale), to: formatDate(period.previous_to, locale) })}</span>
                    {data?.generated_at && <span>· {t('Updated :time', { time: formatDateTime(data.generated_at, locale) })}</span>}
                </p>
            </div>

            <Tabs tabs={tabs} active={tab} className="mb-5" />

            <Deferred data="data" fallback={<PanelSkeleton />}>
                {data ? <Panel data={data} select={select} tabHref={tabHref} period={period} /> : <PanelSkeleton />}
            </Deferred>
        </AppLayout>
    );
}

function PanelSkeleton() {
    return (
        <div aria-busy="true" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-24 animate-pulse" />)}</div>
            <div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-72 animate-pulse" /><Skeleton className="h-72 animate-pulse" /></div>
        </div>
    );
}
