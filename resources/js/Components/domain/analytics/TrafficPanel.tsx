import { ExternalLink, Info, Link2Off, PlugZap } from 'lucide-react';
import { Alert, Badge, Card, CardHeader, DonutChart, KpiCard, RankedBars, SortableTable, TrendChart, vizColor } from '@/Components/ui';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { Change, ChartCard, KpiGrid, SectionTitle, useFormat, type Item, type Kpi, type PanelProps, type Trend } from './shared';

type Source = Item & { views: number; previous: number; change: number | null };
type Network = { network: string; label: string; profile_url: string | null; connected: boolean; available: boolean; insights: Record<string, number | null> | null; visits: number; views: number; previous: number; change: number | null };
type Subject = { id: number; title: string; views: number; visitors: number; url: string };

export type TrafficData = {
    recording: boolean;
    recording_since: string | null;
    kpis: Record<'views' | 'visitors' | 'sessions' | 'pages_per_session' | 'bounce_rate' | 'social_visits' | 'returning_visitors', Kpi>;
    trend: Trend;
    sources: Source[];
    social: { networks: Network[]; trend: Trend };
    devices: Item[];
    pages: { path: string; views: number; visitors: number; entries: number }[];
    subjects: Record<'articles' | 'judgments' | 'lawyers', Subject[]>;
    referrers: Item[];
    campaigns: Item[];
};

const SOCIAL_ORDER = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'];

export function TrafficPanel({ data, select }: PanelProps<TrafficData>) {
    const t = useT();
    const f = useFormat();
    const { locale } = useLocale();
    const k = data.kpis;
    const trend = { ...data.trend, series: data.trend.series.map((s) => (s.key === 'previous' ? { ...s, dashed: true, color: 'var(--viz-muted)' } : s)) };
    const socialTrend = { ...data.social.trend, series: data.social.trend.series.map((s) => ({ ...s, color: vizColor(SOCIAL_ORDER.indexOf(s.key)) })) };

    return (
        <>
            {!data.recording && <Alert tone="warning" className="mb-4" title={t('Visit recording is switched off')}>{t('Set ANALYTICS_TRACK_VISITS=true in .env to measure website traffic.')}</Alert>}
            {data.recording && (
                <p className="mb-4 flex items-start gap-2 text-sm text-navy-500">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    {data.recording_since
                        ? t('Website traffic has been recorded since :date. Public pages only; platform staff, bots and background requests are not counted. No IP addresses are stored.', { date: formatDate(data.recording_since, locale) })
                        : t('Website traffic is recorded from now on. Earlier visits were not measured, so they show as no data rather than zero.')}
                </p>
            )}

            <KpiGrid columns={7}>
                <KpiCard label={t('Page views')} value={f.number(k.views.value)} change={k.views.change} previous={f.number(k.views.previous)} />
                <KpiCard label={t('Unique visitors')} value={f.number(k.visitors.value)} change={k.visitors.change} previous={f.number(k.visitors.previous)} />
                <KpiCard label={t('Visits (sessions)')} value={f.number(k.sessions.value)} change={k.sessions.change} previous={f.number(k.sessions.previous)} />
                <KpiCard label={t('Pages per visit')} value={f.number(k.pages_per_session.value)} change={k.pages_per_session.change} previous={f.number(k.pages_per_session.previous)} />
                <KpiCard label={t('Bounce rate')} value={f.percent(k.bounce_rate.value)} change={k.bounce_rate.change} previous={f.percent(k.bounce_rate.previous)} inverse hint={t('One page only')} />
                <KpiCard label={t('Returning visitors')} value={f.number(k.returning_visitors.value)} change={k.returning_visitors.change} previous={f.number(k.returning_visitors.previous)} />
                <KpiCard label={t('Visits from social media')} value={f.number(k.social_visits.value)} change={k.social_visits.change} previous={f.number(k.social_visits.previous)} />
            </KpiGrid>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('Traffic trend')} description={t('Dashed line: page views in the previous period. Click a point to open it.')}>
                    <TrendChart area buckets={trend.buckets} series={trend.series} onSelect={select} format={f.number} emptyLabel={t('No visits in this period yet.')} />
                </ChartCard>
                <ChartCard title={t('Devices')} description={t('Page views by device type.')}>
                    <DonutChart data={data.devices.map((d) => ({ ...d, label: t(d.label) }))} format={f.number} centerLabel={t('Page views')} />
                </ChartCard>
            </div>

            <SectionTitle description={t('Visits from each network are measured on this website from referring links and utm_source tags. Follower and reach numbers need each network’s API.')}>{t('Social media')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {SOCIAL_ORDER.map((key) => data.social.networks.find((n) => n.network === key)).filter((n): n is Network => Boolean(n)).map((network) => (
                    <Card key={network.network} className="flex flex-col p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="inline-flex items-center gap-2 font-semibold"><span className="size-2.5 rounded-sm" style={{ background: vizColor(SOCIAL_ORDER.indexOf(network.network)) }} />{network.label}</p>
                            {network.profile_url && <a href={network.profile_url} target="_blank" rel="noreferrer" className="text-navy-400 hover:text-navy-700" aria-label={t('Open profile')}><ExternalLink className="size-4" /></a>}
                        </div>
                        <p className="mt-2 text-2xl font-semibold tabular-nums">{f.number(network.visits)}</p>
                        <p className="text-xs text-navy-500">{t('visits')} · {f.number(network.views)} {t('page views')}</p>
                        <p className="mt-1 text-xs"><Change value={network.change} /> <span className="text-navy-500">{t('vs :value', { value: f.number(network.previous) })}</span></p>
                        <div className="mt-3 border-t border-navy-100 pt-2 text-xs dark:border-navy-800">
                            {network.available && network.insights ? (
                                <dl className="grid grid-cols-2 gap-1">
                                    {Object.entries(network.insights).map(([name, value]) => <div key={name}><dt className="text-navy-500">{t(name)}</dt><dd className="font-medium tabular-nums">{value === null ? '—' : f.number(value)}</dd></div>)}
                                </dl>
                            ) : network.connected ? (
                                <Badge tone="amber" icon={<PlugZap className="size-3" />}>{t('API unavailable')}</Badge>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-navy-500"><Link2Off className="size-3.5" />{t('Account insights: not connected')}</span>
                            )}
                            {!network.profile_url && <p className="mt-1 text-navy-400">{t('No profile link in Settings')}</p>}
                        </div>
                    </Card>
                ))}
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('Social media visits over time')}>
                    <TrendChart buckets={socialTrend.buckets} series={socialTrend.series} onSelect={select} format={f.number} emptyLabel={t('No visits from social media in this period.')} />
                </ChartCard>
                <Card className="min-w-0">
                    <CardHeader title={t('Traffic sources')} description={t('Visits by where they came from, with growth.')} />
                    <SortableTable rows={data.sources} rowKey={(r) => r.key} pageSize={9} initialSort={{ key: 'value', direction: 'desc' }}
                        columns={[
                            { key: 'label', label: t('Source'), render: (r) => <span className="inline-flex items-center gap-2"><span className="size-2 rounded-sm" style={{ background: SOCIAL_ORDER.includes(r.key) ? vizColor(SOCIAL_ORDER.indexOf(r.key)) : 'var(--viz-muted)' }} />{r.label}</span> },
                            { key: 'value', label: t('Visits'), align: 'end', render: (r) => f.number(r.value) },
                            { key: 'change', label: t('Change'), align: 'end', value: (r) => r.change ?? -Infinity, render: (r) => <Change value={r.change} /> },
                        ]} />
                </Card>
            </div>

            <SectionTitle>{t('Most viewed')}</SectionTitle>
            <div className="grid gap-6 lg:grid-cols-3">
                <ChartCard title={t('Articles')}><RankedBars data={data.subjects.articles.map((s) => ({ key: String(s.id), label: s.title, value: s.views, href: s.url }))} format={f.number} /></ChartCard>
                <ChartCard title={t('Reported judgments')}><RankedBars data={data.subjects.judgments.map((s) => ({ key: String(s.id), label: s.title, value: s.views, href: s.url }))} format={f.number} color={vizColor(2)} /></ChartCard>
                <ChartCard title={t('Lawyer profiles')}><RankedBars data={data.subjects.lawyers.map((s) => ({ key: String(s.id), label: s.title, value: s.views, href: s.url }))} format={f.number} color={vizColor(6)} /></ChartCard>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <Card className="min-w-0 xl:col-span-2">
                    <CardHeader title={t('Top pages')} />
                    <SortableTable rows={data.pages} rowKey={(r) => r.path} search={(r) => r.path} initialSort={{ key: 'views', direction: 'desc' }}
                        columns={[
                            { key: 'path', label: t('Page'), render: (r) => <a href={r.path} target="_blank" rel="noreferrer" className="font-mono text-xs hover:underline">{r.path}</a> },
                            { key: 'views', label: t('Page views'), align: 'end', render: (r) => f.number(r.views) },
                            { key: 'visitors', label: t('Visitors'), align: 'end', render: (r) => f.number(r.visitors) },
                            { key: 'entries', label: t('Entrances'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.entries) },
                        ]} />
                </Card>
                <div className="space-y-6">
                    <ChartCard title={t('Referring websites')}><RankedBars data={data.referrers} format={f.number} limit={8} /></ChartCard>
                    <ChartCard title={t('Campaigns (utm_campaign)')}><RankedBars data={data.campaigns} format={f.number} limit={8} color={vizColor(6)} /></ChartCard>
                </div>
            </div>
        </>
    );
}
