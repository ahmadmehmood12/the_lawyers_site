import { DonutChart, KpiCard, RankedBars, Stat, TrendChart, vizColor } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { ChartCard, KpiGrid, SectionTitle, single, useFormat, type Item, type Kpi, type PanelProps, type Point, type Trend } from './shared';

export type FinanceData = {
    platform: {
        kpis: { revenue: Kpi; payments: Kpi; awaiting: { count: number; amount: number }; mrr: number; paid_subscriptions: number; new_subscriptions: Kpi; expiring_30: number };
        trend: Point[]; by_plan: (Item & { payments: number })[]; subscriptions: Item[]; payment_statuses: Item[];
    };
    practice: {
        kpis: { invoiced: Kpi; collected: Kpi; refunds: Kpi; outstanding: number; overdue: number; overdue_count: number; expenses: Kpi; collection_rate: number | null };
        trend: Trend; invoice_statuses: Item[]; methods: Item[]; expense_categories: Item[]; ageing: Item[];
    };
};

export function FinancePanel({ data, select }: PanelProps<FinanceData>) {
    const t = useT();
    const f = useFormat();
    const p = data.platform.kpis;
    const c = data.practice.kpis;

    return (
        <>
            <SectionTitle description={t('What chambers and firms pay this platform for their plans (verified plan payments only).')}>{t('Platform revenue')}</SectionTitle>
            <KpiGrid columns={4}>
                <KpiCard label={t('Revenue')} value={f.money(p.revenue.value)} change={p.revenue.change} previous={f.money(p.revenue.previous)} href={route('admin.payments.index', { status: 'paid' })} />
                <KpiCard label={t('Paid plan payments')} value={f.number(p.payments.value)} change={p.payments.change} previous={f.number(p.payments.previous)} href={route('admin.payments.index', { status: 'paid' })} />
                <Stat label={t('Awaiting verification')} value={f.money(p.awaiting.amount)} hint={t(':count payments', { count: p.awaiting.count })} tone={p.awaiting.count ? 'gold' : 'navy'} href={route('admin.payments.index', { status: 'awaiting_verification' })} />
                <Stat label={t('Monthly recurring value')} value={f.money(p.mrr)} hint={t('Active paid plans; yearly plans counted per month')} />
                <Stat label={t('Paid subscriptions')} value={f.number(p.paid_subscriptions)} href={route('admin.plans.index')} />
                <KpiCard label={t('New paid subscriptions')} value={f.number(p.new_subscriptions.value)} change={p.new_subscriptions.change} previous={f.number(p.new_subscriptions.previous)} />
                <Stat label={t('Ending in 30 days')} value={f.number(p.expiring_30)} tone={p.expiring_30 ? 'gold' : 'navy'} />
            </KpiGrid>
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('Revenue over time')} description={t('By the date each payment was verified.')}>
                    <TrendChart area {...single(data.platform.trend, t('Revenue'))} onSelect={select} format={f.money} emptyLabel={t('No plan payments in this period.')} />
                </ChartCard>
                <ChartCard title={t('Active subscriptions by plan')}><DonutChart data={data.platform.subscriptions} format={f.number} centerLabel={t('Subscriptions')} /></ChartCard>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ChartCard title={t('Revenue by plan')}><RankedBars data={data.platform.by_plan.map((r) => ({ ...r, hint: t(':count payments', { count: r.payments }) }))} format={f.money} /></ChartCard>
                <ChartCard title={t('Plan payments by status')} description={t('Submitted in the selected period.')}><RankedBars data={data.platform.payment_statuses.map((s) => ({ ...s, href: route('admin.payments.index', { status: s.key }) }))} format={f.number} color={vizColor(2)} /></ChartCard>
            </div>

            <SectionTitle description={t('Totals across every chamber: what lawyers invoice their clients and collect. No client account is shown.')}>{t('Practice fees and payments')}</SectionTitle>
            <KpiGrid columns={4}>
                <KpiCard label={t('Invoiced')} value={f.money(c.invoiced.value)} change={c.invoiced.change} previous={f.money(c.invoiced.previous)} />
                <KpiCard label={t('Collected (after refunds)')} value={f.money(c.collected.value)} change={c.collected.change} previous={f.money(c.collected.previous)} />
                <Stat label={t('Outstanding balance')} value={f.money(c.outstanding)} hint={t('All unpaid invoices')} />
                <Stat label={t('Overdue')} value={f.money(c.overdue)} hint={t(':count invoices', { count: c.overdue_count })} tone={c.overdue ? 'red' : 'navy'} />
                <Stat label={t('Collection rate')} value={f.percent(c.collection_rate)} hint={t('Paid share of invoices issued in the period')} />
                <KpiCard label={t('Refunds')} value={f.money(c.refunds.value)} change={c.refunds.change} previous={f.money(c.refunds.previous)} inverse />
                <KpiCard label={t('Case expenses')} value={f.money(c.expenses.value)} change={c.expenses.change} previous={f.money(c.expenses.previous)} />
            </KpiGrid>
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('Invoiced and collected')} description={t('Click a point to open that period.')}>
                    <TrendChart buckets={data.practice.trend.buckets} series={data.practice.trend.series} onSelect={select} format={f.money} />
                </ChartCard>
                <ChartCard title={t('Outstanding by age')}><RankedBars data={data.practice.ageing} format={f.money} color={vizColor(7)} ranked={false} /></ChartCard>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard title={t('Invoices by status')} description={t('Issued in the selected period.')}><DonutChart data={data.practice.invoice_statuses} format={f.number} centerLabel={t('Invoices')} /></ChartCard>
                <ChartCard title={t('Payment methods')}><DonutChart data={data.practice.methods} format={f.money} centerLabel={t('Collected')} /></ChartCard>
                <ChartCard title={t('Expenses by category')}><RankedBars data={data.practice.expense_categories} format={f.money} color={vizColor(3)} /></ChartCard>
            </div>
        </>
    );
}
