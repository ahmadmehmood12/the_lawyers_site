import { Alert, BarList, Button, Card, CardBody, CardHeader, ColumnChart, PageHeader, Stat } from '@/Components/ui';
import { Crown } from 'lucide-react';
import { openUpgrade, type UpgradeOffer } from '@/Components/domain/UpgradeModal';
import AppLayout from '@/Layouts/AppLayout';
import { formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Series = { label: string; value: number }[];
type Props = { planAllows: boolean; upgrade: UpgradeOffer | null; totals: Record<string, number>; registrations: Series; hearingsHeld: Series; byCourt: Series; byStatus: Series; workload: Series; finance: { revenue: Series; expenses: Series; outstanding: number; outstandingCount: number } | null };

export default function Analytics({ planAllows, upgrade, totals, registrations, hearingsHeld, byCourt, byStatus, workload, finance }: Props) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Analytics')} wide>
            <PageHeader title={t('Practice analytics')} description={t('Workload and finances for your organization. Case outcomes are not a measure of competence and are not ranked.')} />
            {!planAllows && <Alert tone="info" className="mb-5" action={upgrade && <Button size="sm" icon={<Crown className="size-4" />} onClick={() => openUpgrade(upgrade)}>{t('Upgrade')}</Button>}>{t('Detailed analytics are included in paid plans. Basic totals are shown below.')}</Alert>}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Stat label={t('Active cases')} value={totals.active} />
                <Stat label={t('Closed cases')} value={totals.closed} />
                <Stat label={t('Upcoming hearings')} value={totals.upcoming} tone="gold" />
                <Stat label={t('Open tasks')} value={totals.openTasks} />
                <Stat label={t('Overdue tasks')} value={totals.overdueTasks} tone={totals.overdueTasks ? 'red' : 'navy'} />
            </div>
            {planAllows && (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <Card><CardHeader title={t('New cases per month')} /><CardBody><ColumnChart data={registrations} /></CardBody></Card>
                    <Card><CardHeader title={t('Hearings attended per month')} /><CardBody><ColumnChart data={hearingsHeld} /></CardBody></Card>
                    <Card><CardHeader title={t('Active cases by court')} /><CardBody><BarList data={byCourt} /></CardBody></Card>
                    <Card><CardHeader title={t('Lawyer workload (active cases)')} /><CardBody><BarList data={workload} /></CardBody></Card>
                    <Card><CardHeader title={t('Cases by status')} /><CardBody><BarList data={byStatus} /></CardBody></Card>
                    {finance && (
                        <Card>
                            <CardHeader title={t('Revenue collected')} description={t('Outstanding: :amount across :count invoices', { amount: formatMoney(finance.outstanding, locale), count: finance.outstandingCount })} />
                            <CardBody className="space-y-6">
                                <ColumnChart data={finance.revenue} format={(v) => formatMoney(v, locale)} />
                                <div><p className="mb-2 text-sm font-medium">{t('Expenses')}</p><ColumnChart data={finance.expenses} format={(v) => formatMoney(v, locale)} height={120} /></div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            )}
        </AppLayout>
    );
}
