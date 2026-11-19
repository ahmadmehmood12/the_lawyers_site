import { Card, CardHeader, DonutChart, KpiCard, RankedBars, SortableTable, Stat, TrendChart } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { ChartCard, KpiGrid, NameCell, SectionTitle, useFormat, type Item, type Kpi, type PanelProps, type Trend } from './shared';

type LawyerRow = { id: number; name: string; avatar: string | null; organization: string | null; total: number; completed: number; cancelled: number; pending: number; fees: number };

export type AppointmentsData = {
    kpis: { booked: Kpi; pending: number; accepted: number; completed: Kpi; cancelled: number; no_show: number; acceptance_rate: number | null; completion_rate: number | null; fees: Kpi; upcoming: number; awaiting_reply: number };
    statuses: Item[]; trend: Trend; modes: Item[]; kinds: Item[]; weekdays: Item[]; lawyers: LawyerRow[];
};

export function AppointmentsPanel({ data, select }: PanelProps<AppointmentsData>) {
    const t = useT();
    const f = useFormat();
    const k = data.kpis;
    const statusHref = (status: string) => route('admin.appointments.index', { status });

    return (
        <>
            <p className="mb-4 text-sm text-navy-500">{t('Appointments booked in the selected period, by booking date. Requested = pending a reply, confirmed = accepted.')}</p>
            <KpiGrid columns={4}>
                <KpiCard label={t('Booked')} value={f.number(k.booked.value)} change={k.booked.change} previous={f.number(k.booked.previous)} href={route('admin.appointments.index')} />
                <Stat label={t('Pending')} value={f.number(k.pending)} tone="gold" href={statusHref('requested')} />
                <Stat label={t('Accepted')} value={f.number(k.accepted)} tone="green" href={statusHref('confirmed')} />
                <KpiCard label={t('Completed')} value={f.number(k.completed.value)} change={k.completed.change} previous={f.number(k.completed.previous)} href={statusHref('completed')} />
                <Stat label={t('Cancelled or declined')} value={f.number(k.cancelled)} tone={k.cancelled ? 'red' : 'navy'} href={statusHref('cancelled')} />
                <Stat label={t('No-shows')} value={f.number(k.no_show)} href={statusHref('no_show')} />
                <Stat label={t('Acceptance rate')} value={f.percent(k.acceptance_rate)} hint={t('Of requests that got a reply')} />
                <Stat label={t('Completion rate')} value={f.percent(k.completion_rate)} />
                <KpiCard label={t('Consultation fees (completed)')} value={f.money(k.fees.value)} change={k.fees.change} previous={f.money(k.fees.previous)} />
                <Stat label={t('Upcoming confirmed')} value={f.number(k.upcoming)} href={route('admin.appointments.index', { status: 'confirmed', when: 'upcoming' })} />
                <Stat label={t('Upcoming awaiting a reply')} value={f.number(k.awaiting_reply)} tone={k.awaiting_reply ? 'gold' : 'navy'} href={route('admin.appointments.index', { status: 'requested', when: 'upcoming' })} />
            </KpiGrid>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('Bookings over time')} description={t('Click a point to open that period.')}>
                    <TrendChart buckets={data.trend.buckets} series={data.trend.series} onSelect={select} format={f.number} />
                </ChartCard>
                <ChartCard title={t('Status')}><DonutChart data={data.statuses.map((s) => ({ ...s, href: statusHref(s.key) }))} format={f.number} centerLabel={t('Booked')} /></ChartCard>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard title={t('Online or in person')}><DonutChart data={data.modes} format={f.number} /></ChartCard>
                <ChartCard title={t('Day of the week')} description={t('When the booked appointments take place.')}><RankedBars data={data.weekdays} format={f.number} limit={7} ranked={false} /></ChartCard>
                <ChartCard title={t('Appointment types')}><RankedBars data={data.kinds} format={f.number} /></ChartCard>
            </div>

            <SectionTitle>{t('Lawyers with the most appointments')}</SectionTitle>
            <Card>
                <CardHeader title={t('Booked in the selected period')} />
                <SortableTable rows={data.lawyers} rowKey={(r) => r.id} search={(r) => `${r.name} ${r.organization ?? ''}`} initialSort={{ key: 'total', direction: 'desc' }}
                    columns={[
                        { key: 'name', label: t('Lawyer'), render: (r) => <NameCell name={r.name} avatar={r.avatar} subtitle={r.organization} href={route('admin.appointments.index', { search: r.name })} /> },
                        { key: 'total', label: t('Booked'), align: 'end', render: (r) => f.number(r.total) },
                        { key: 'pending', label: t('Pending'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.pending) },
                        { key: 'completed', label: t('Completed'), align: 'end', render: (r) => f.number(r.completed) },
                        { key: 'cancelled', label: t('Cancelled'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.cancelled) },
                        { key: 'fees', label: t('Fees'), align: 'end', render: (r) => f.money(r.fees) },
                    ]} />
            </Card>
        </>
    );
}
