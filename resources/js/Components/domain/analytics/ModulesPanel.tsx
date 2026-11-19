import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, DonutChart, KpiCard, RankedBars, Select, SortableTable, Stat, TrendChart, vizColor } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { Change, ChartCard, KpiGrid, SectionTitle, useFormat, type Item, type Kpi, type PanelProps, type Trend } from './shared';

type ModuleRow = { key: string; group: string; label: string; total: number; current: number; previous: number; change: number | null; href: string | null };

export type ModulesData = {
    kpis: { users: number; signups: Kpi; active_users: Kpi; verified_email: { value: number | null; count: number }; two_factor: { value: number | null; count: number }; google: number; lawyers_verified: number; verifications_decided: Kpi };
    account_types: Item[]; user_statuses: Item[]; signup_trend: Trend; verification: Item[];
    organizations: { types: Item[]; statuses: Item[] }; drafts: Item[];
    deliveries: { channels: Item[]; statuses: Item[] }; ai: { features: Item[]; tokens: number };
    modules: ModuleRow[];
};

export function ModulesPanel({ data, select }: PanelProps<ModulesData>) {
    const t = useT();
    const f = useFormat();
    const k = data.kpis;
    const [group, setGroup] = useState('');
    const groups = [...new Set(data.modules.map((m) => m.group))];
    const modules = group ? data.modules.filter((m) => m.group === group) : data.modules;

    return (
        <>
            <KpiGrid columns={4}>
                <Stat label={t('User accounts')} value={f.number(k.users)} href={route('admin.users.index')} />
                <KpiCard label={t('New accounts')} value={f.number(k.signups.value)} change={k.signups.change} previous={f.number(k.signups.previous)} href={route('admin.users.index')} />
                <KpiCard label={t('Signed in during period')} value={f.number(k.active_users.value)} change={k.active_users.change} previous={f.number(k.active_users.previous)} hint={t('By last sign-in')} />
                <Stat label={t('Verified email')} value={f.percent(k.verified_email.value)} hint={t(':count accounts', { count: k.verified_email.count })} />
                <Stat label={t('Two-factor on')} value={f.percent(k.two_factor.value)} hint={t(':count accounts', { count: k.two_factor.count })} />
                <Stat label={t('Linked to Google')} value={f.number(k.google)} />
                <Stat label={t('Verified lawyers')} value={f.number(k.lawyers_verified)} tone="green" href={route('admin.verifications.index')} />
                <KpiCard label={t('Verifications decided')} value={f.number(k.verifications_decided.value)} change={k.verifications_decided.change} previous={f.number(k.verifications_decided.previous)} href={route('admin.verifications.index')} />
            </KpiGrid>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('New accounts by type')} description={t('Click a point to open that period.')}>
                    <TrendChart buckets={data.signup_trend.buckets} series={data.signup_trend.series} onSelect={select} format={f.number} />
                </ChartCard>
                <ChartCard title={t('Account types')}><DonutChart data={data.account_types.map((a) => ({ ...a, href: route('admin.users.index', { type: a.key }) }))} format={f.number} centerLabel={t('Accounts')} /></ChartCard>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard title={t('Lawyer verification')}><RankedBars data={data.verification.map((v) => ({ ...v, href: route('admin.verifications.index') }))} format={f.number} limit={8} /></ChartCard>
                <ChartCard title={t('Account status')}><DonutChart data={data.user_statuses.map((s) => ({ ...s, href: route('admin.users.index', { status: s.key }) }))} format={f.number} /></ChartCard>
                <ChartCard title={t('Organizations')}><DonutChart data={data.organizations.types.map((o) => ({ ...o, href: route('admin.organizations.index', { type: o.key }) }))} format={f.number} /></ChartCard>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard title={t('Notifications sent')} description={t('By channel, selected period.')}><RankedBars data={data.deliveries.channels} format={f.number} color={vizColor(2)} /></ChartCard>
                <ChartCard title={t('Delivery status')}><RankedBars data={data.deliveries.statuses.map((s) => ({ ...s, href: route('admin.notifications.index', { status: s.key }) }))} format={f.number} color={vizColor(3)} /></ChartCard>
                <ChartCard title={t('AI assistant')} description={t(':count tokens used in the period', { count: f.number(data.ai.tokens) })}><RankedBars data={data.ai.features} format={f.number} color={vizColor(6)} /></ChartCard>
            </div>

            <SectionTitle description={t('Records in every module: all-time total, created in the selected period, and the change against the previous period.')}>{t('Module usage')}</SectionTitle>
            <Card>
                <CardHeader title={t('All modules')} actions={<Select aria-label={t('Area')} wrapperClassName="w-44" value={group} onChange={(e) => setGroup(e.target.value)} options={groups.map((g) => ({ value: g, label: g }))} placeholder={t('All areas')} />} />
                <SortableTable rows={modules} rowKey={(r) => r.key} search={(r) => `${r.label} ${r.group}`} pageSize={40} initialSort={{ key: 'current', direction: 'desc' }}
                    columns={[
                        { key: 'label', label: t('Module'), render: (r) => (r.href ? <Link href={r.href} className="inline-flex items-center gap-1 font-medium hover:underline">{r.label}<ArrowUpRight className="size-3.5 text-navy-400" /></Link> : <span className="font-medium">{r.label}</span>) },
                        { key: 'group', label: t('Area'), hideOnMobile: true, render: (r) => <span className="text-navy-500">{r.group}</span> },
                        { key: 'total', label: t('Total'), align: 'end', render: (r) => f.number(r.total) },
                        { key: 'current', label: t('In period'), align: 'end', render: (r) => f.number(r.current) },
                        { key: 'previous', label: t('Previous'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.previous) },
                        { key: 'change', label: t('Change'), align: 'end', value: (r) => r.change ?? -Infinity, render: (r) => <Change value={r.change} /> },
                    ]} />
            </Card>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ChartCard title={t('Legal drafts by status')}><DonutChart data={data.drafts} format={f.number} centerLabel={t('Drafts')} /></ChartCard>
                <ChartCard title={t('Organization status')}><DonutChart data={data.organizations.statuses} format={f.number} /></ChartCard>
            </div>
        </>
    );
}
