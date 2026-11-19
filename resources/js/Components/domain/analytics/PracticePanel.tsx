import { Star } from 'lucide-react';
import { Card, CardHeader, DonutChart, KpiCard, RankedBars, SortableTable, Stat, TrendChart, vizColor } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { ChartCard, KpiGrid, NameCell, SectionTitle, single, useFormat, type Item, type Kpi, type PanelProps, type Point, type Trend } from './shared';

type Lawyer = { id: number; name: string; avatar: string | null; organization: string | null; profile_url: string | null; cases: number; active: number; closed: number; new_cases: number; hearings: number; hearings_held: number; appointments: number; appointments_completed: number; rating: number | null; reviews: number };
type Firm = { id: number; name: string; type: string; type_label: string; status: string; plan: string | null; cases: number; active_cases: number; clients: number; members: number; hearings: number; appointments: number; collected: number };
type ClientAccount = { id: number; name: string; avatar: string | null; cases: number; appointments: number; chambers: number };

export type PracticeData = {
    kpis: {
        cases_total: number; cases_active: number; cases_pending: number; cases_closed: number; cases_new: Kpi; cases_decided: Kpi;
        hearings: Kpi; hearings_held: Kpi; hearings_adjourned: Kpi; upcoming_7: number; upcoming_30: number; overdue_outcomes: number;
        clients_total: number; clients_new: Kpi; clients_portal: number;
    };
    case_groups: Item[]; case_statuses: Item[]; case_trend: Trend; case_types: Item[]; case_courts: Item[]; case_areas: Item[];
    hearing_statuses: Item[]; hearing_trend: Point[]; hearing_courts: Item[]; tasks: Item[];
    lawyers: Lawyer[]; firms: Firm[];
    clients: { types: Item[]; trend: Point[]; top: ClientAccount[] };
};

export function PracticePanel({ data, select }: PanelProps<PracticeData>) {
    const t = useT();
    const f = useFormat();
    const k = data.kpis;

    return (
        <>
            <p className="mb-4 text-sm text-navy-500">{t('Counts across every chamber and firm. Case titles, parties and notes are never shown to platform staff.')}</p>
            <KpiGrid columns={4}>
                <Stat label={t('Total cases')} value={f.number(k.cases_total)} />
                <Stat label={t('Active cases')} value={f.number(k.cases_active)} tone="green" hint={t('Before the court')} />
                <Stat label={t('Pending cases')} value={f.number(k.cases_pending)} tone="gold" hint={t('Draft or filed, not yet heard')} />
                <Stat label={t('Closed cases')} value={f.number(k.cases_closed)} hint={t('Decided, withdrawn, dismissed, disposed or archived')} />
                <KpiCard label={t('Cases opened')} value={f.number(k.cases_new.value)} change={k.cases_new.change} previous={f.number(k.cases_new.previous)} />
                <KpiCard label={t('Cases decided')} value={f.number(k.cases_decided.value)} change={k.cases_decided.change} previous={f.number(k.cases_decided.previous)} />
                <KpiCard label={t('Hearings in period')} value={f.number(k.hearings.value)} change={k.hearings.change} previous={f.number(k.hearings.previous)} />
                <KpiCard label={t('Hearings held')} value={f.number(k.hearings_held.value)} change={k.hearings_held.change} previous={f.number(k.hearings_held.previous)} />
                <KpiCard label={t('Hearings adjourned')} value={f.number(k.hearings_adjourned.value)} change={k.hearings_adjourned.change} previous={f.number(k.hearings_adjourned.previous)} inverse />
                <Stat label={t('Upcoming hearings, 7 days')} value={f.number(k.upcoming_7)} />
                <Stat label={t('Upcoming hearings, 30 days')} value={f.number(k.upcoming_30)} />
                <Stat label={t('Past hearings without outcome')} value={f.number(k.overdue_outcomes)} tone={k.overdue_outcomes ? 'red' : 'navy'} hint={t('Still marked scheduled')} />
            </KpiGrid>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard title={t('Case progress')} description={t('All cases on the platform.')}>
                    <DonutChart data={data.case_groups} format={f.number} centerLabel={t('Cases')} />
                </ChartCard>
                <ChartCard className="xl:col-span-2" title={t('Cases opened and decided')} description={t('Click a point to open that period.')}>
                    <TrendChart buckets={data.case_trend.buckets} series={data.case_trend.series} onSelect={select} format={f.number} />
                </ChartCard>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard title={t('Cases by status')}><RankedBars data={data.case_statuses} format={f.number} limit={14} /></ChartCard>
                <ChartCard title={t('Cases by type')}><RankedBars data={data.case_types} format={f.number} limit={14} color={vizColor(2)} /></ChartCard>
                <div className="space-y-6">
                    <ChartCard title={t('Busiest courts (cases)')}><RankedBars data={data.case_courts} format={f.number} limit={6} color={vizColor(6)} /></ChartCard>
                    <ChartCard title={t('Practice areas')}><RankedBars data={data.case_areas} format={f.number} limit={6} color={vizColor(3)} /></ChartCard>
                </div>
            </div>

            <SectionTitle>{t('Court hearings')}</SectionTitle>
            <div className="grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('Hearings per period')} description={t('By hearing date, including scheduled ones.')}>
                    <TrendChart {...single(data.hearing_trend, t('Hearings'))} onSelect={select} format={f.number} />
                </ChartCard>
                <ChartCard title={t('Hearing outcomes')}><DonutChart data={data.hearing_statuses} format={f.number} centerLabel={t('Hearings')} /></ChartCard>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ChartCard title={t('Courts with the most hearings')}><RankedBars data={data.hearing_courts} format={f.number} /></ChartCard>
                <ChartCard title={t('Tasks created in period')}><DonutChart data={data.tasks} format={f.number} centerLabel={t('Tasks')} /></ChartCard>
            </div>

            <SectionTitle description={t('Lawyers ranked by assigned cases. Hearings and appointments are for the selected period.')}>{t('Lawyer performance')}</SectionTitle>
            <Card>
                <SortableTable rows={data.lawyers} rowKey={(r) => r.id} search={(r) => `${r.name} ${r.organization ?? ''}`} initialSort={{ key: 'cases', direction: 'desc' }}
                    columns={[
                        { key: 'name', label: t('Lawyer'), render: (r) => <NameCell name={r.name} avatar={r.avatar} subtitle={r.organization} href={r.profile_url ?? route('admin.users.index', { search: r.name })} /> },
                        { key: 'cases', label: t('Cases'), align: 'end', render: (r) => f.number(r.cases) },
                        { key: 'active', label: t('Open'), align: 'end', render: (r) => f.number(r.active) },
                        { key: 'closed', label: t('Closed'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.closed) },
                        { key: 'new_cases', label: t('New'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.new_cases) },
                        { key: 'hearings', label: t('Hearings'), align: 'end', render: (r) => `${f.number(r.hearings_held)} / ${f.number(r.hearings)}` },
                        { key: 'appointments', label: t('Appointments'), align: 'end', hideOnMobile: true, render: (r) => `${f.number(r.appointments_completed)} / ${f.number(r.appointments)}` },
                        { key: 'rating', label: t('Rating'), align: 'end', value: (r) => r.rating ?? 0, render: (r) => (r.rating ? <span className="inline-flex items-center gap-1">{r.rating}<Star className="size-3 fill-gold-500 text-gold-500" /><span className="text-xs text-navy-500">({r.reviews})</span></span> : '—') },
                    ]} />
            </Card>
            <p className="mt-2 text-xs text-navy-500">{t('Hearings: held / assigned. Appointments: completed / booked.')}</p>

            <SectionTitle description={t('Firms and solo chambers compared. Fees are payments recorded in the selected period.')}>{t('Law firm comparison')}</SectionTitle>
            <Card>
                <SortableTable rows={data.firms} rowKey={(r) => r.id} search={(r) => `${r.name} ${r.plan ?? ''}`} initialSort={{ key: 'cases', direction: 'desc' }}
                    columns={[
                        { key: 'name', label: t('Organization'), render: (r) => <NameCell name={r.name} subtitle={`${r.type_label}${r.plan ? ` · ${r.plan}` : ''}`} href={route('admin.organizations.index', { search: r.name })} /> },
                        { key: 'members', label: t('Team'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.members) },
                        { key: 'cases', label: t('Cases'), align: 'end', render: (r) => f.number(r.cases) },
                        { key: 'active_cases', label: t('Open'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.active_cases) },
                        { key: 'clients', label: t('Clients'), align: 'end', render: (r) => f.number(r.clients) },
                        { key: 'hearings', label: t('Hearings'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.hearings) },
                        { key: 'appointments', label: t('Appointments'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.appointments) },
                        { key: 'collected', label: t('Fees collected'), align: 'end', render: (r) => f.money(r.collected) },
                    ]} />
            </Card>

            <SectionTitle>{t('Clients')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat label={t('Client records')} value={f.number(k.clients_total)} />
                <KpiCard label={t('New clients')} value={f.number(k.clients_new.value)} change={k.clients_new.change} previous={f.number(k.clients_new.previous)} />
                <Stat label={t('With portal access')} value={f.number(k.clients_portal)} href={route('admin.users.index', { type: 'client' })} />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('New clients per period')}><TrendChart {...single(data.clients.trend, t('New clients'))} onSelect={select} format={f.number} /></ChartCard>
                <ChartCard title={t('Client types')}><DonutChart data={data.clients.types} format={f.number} centerLabel={t('Clients')} /></ChartCard>
            </div>
            <Card className="mt-6">
                <CardHeader title={t('Most active client accounts')} description={t('Portal users ranked by linked cases and appointments.')} />
                <SortableTable rows={data.clients.top} rowKey={(r) => r.id} initialSort={{ key: 'appointments', direction: 'desc' }}
                    columns={[
                        { key: 'name', label: t('Client'), render: (r) => <NameCell name={r.name} avatar={r.avatar} href={route('admin.users.index', { search: r.name })} /> },
                        { key: 'cases', label: t('Cases'), align: 'end', render: (r) => f.number(r.cases) },
                        { key: 'appointments', label: t('Appointments'), align: 'end', render: (r) => f.number(r.appointments) },
                        { key: 'chambers', label: t('Chambers'), align: 'end', render: (r) => f.number(r.chambers) },
                    ]} />
            </Card>
        </>
    );
}
