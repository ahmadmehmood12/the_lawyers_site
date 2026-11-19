import { CalendarCheck, Eye, FolderOpen, Gavel, Newspaper, Star, UserPlus, Users, Wallet, Banknote } from 'lucide-react';
import { KpiCard, Stat, TrendChart } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { ChartCard, KpiGrid, SectionTitle, useFormat, type Kpi, type PanelProps, type Trend } from './shared';

export type OverviewData = {
    kpis: Record<'views' | 'visitors' | 'signups' | 'cases' | 'hearings' | 'appointments' | 'revenue' | 'collected' | 'reviews' | 'articles', Kpi>;
    totals: Record<'lawyers' | 'verified' | 'pending_verification' | 'firms' | 'clients' | 'client_accounts' | 'active_cases' | 'paid_subscriptions', number>;
    activity: Trend;
    traffic: Trend;
    tracking_since: string | null;
};

export function OverviewPanel({ data, select, tabHref }: PanelProps<OverviewData>) {
    const t = useT();
    const f = useFormat();
    const k = data.kpis;
    const noTraffic = data.tracking_since === null;

    return (
        <>
            <KpiGrid>
                <KpiCard label={t('Page views')} icon={<Eye />} value={f.number(k.views.value)} change={k.views.change} previous={f.number(k.views.previous)} href={tabHref('traffic')} unavailable={noTraffic ? t('Recording starts with the next visit') : undefined} />
                <KpiCard label={t('Unique visitors')} icon={<Users />} value={f.number(k.visitors.value)} change={k.visitors.change} previous={f.number(k.visitors.previous)} href={tabHref('traffic')} unavailable={noTraffic ? t('Recording starts with the next visit') : undefined} />
                <KpiCard label={t('New accounts')} icon={<UserPlus />} value={f.number(k.signups.value)} change={k.signups.change} previous={f.number(k.signups.previous)} href={tabHref('modules')} />
                <KpiCard label={t('New cases')} icon={<FolderOpen />} value={f.number(k.cases.value)} change={k.cases.change} previous={f.number(k.cases.previous)} href={tabHref('practice')} />
                <KpiCard label={t('Hearings held')} icon={<Gavel />} value={f.number(k.hearings.value)} change={k.hearings.change} previous={f.number(k.hearings.previous)} href={tabHref('practice')} />
                <KpiCard label={t('Appointments booked')} icon={<CalendarCheck />} value={f.number(k.appointments.value)} change={k.appointments.change} previous={f.number(k.appointments.previous)} href={tabHref('appointments')} />
                <KpiCard label={t('Platform revenue')} icon={<Wallet />} value={f.money(k.revenue.value)} change={k.revenue.change} previous={f.money(k.revenue.previous)} href={tabHref('finance')} hint={t('Plan payments')} />
                <KpiCard label={t('Fees collected')} icon={<Banknote />} value={f.money(k.collected.value)} change={k.collected.change} previous={f.money(k.collected.previous)} href={tabHref('finance')} hint={t('By chambers')} />
                <KpiCard label={t('New reviews')} icon={<Star />} value={f.number(k.reviews.value)} change={k.reviews.change} previous={f.number(k.reviews.previous)} href={route('admin.reviews.index')} />
                <KpiCard label={t('Articles published')} icon={<Newspaper />} value={f.number(k.articles.value)} change={k.articles.change} previous={f.number(k.articles.previous)} href={tabHref('content')} />
            </KpiGrid>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <ChartCard title={t('Platform activity')} description={t('Click a point to open that day, week or month.')}>
                    <TrendChart buckets={data.activity.buckets} series={data.activity.series} onSelect={select} format={f.number} />
                </ChartCard>
                <ChartCard title={t('Website traffic')} description={noTraffic ? t('Page views are recorded from now on; earlier visits were not measured.') : t('Public pages only. Staff and bots are not counted.')}>
                    <TrendChart area buckets={data.traffic.buckets} series={data.traffic.series} onSelect={select} format={f.number} emptyLabel={t('No visits in this period yet.')} />
                </ChartCard>
            </div>

            <SectionTitle description={t('All-time totals, not limited to the selected period.')}>{t('Platform totals')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label={t('Lawyers')} value={f.number(data.totals.lawyers)} href={route('admin.users.index', { type: 'lawyer' })} />
                <Stat label={t('Verified lawyers')} value={f.number(data.totals.verified)} tone="green" href={route('admin.verifications.index')} />
                <Stat label={t('Awaiting verification')} value={f.number(data.totals.pending_verification)} tone="gold" href={route('admin.verifications.index')} />
                <Stat label={t('Law firms')} value={f.number(data.totals.firms)} href={route('admin.organizations.index', { type: 'firm' })} />
                <Stat label={t('Client records')} value={f.number(data.totals.clients)} href={tabHref('practice')} />
                <Stat label={t('Client accounts')} value={f.number(data.totals.client_accounts)} href={route('admin.users.index', { type: 'client' })} />
                <Stat label={t('Open cases')} value={f.number(data.totals.active_cases)} href={tabHref('practice')} />
                <Stat label={t('Paid subscriptions')} value={f.number(data.totals.paid_subscriptions)} href={route('admin.plans.index')} />
            </div>
        </>
    );
}
