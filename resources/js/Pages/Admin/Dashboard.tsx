import { Link } from '@inertiajs/react';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { FirmCard, type FirmCardData } from '@/Components/domain/FirmCard';
import { LawyerCard, type LawyerCardData } from '@/Components/domain/LawyerCard';
import { PracticeAreaCard, type PracticeAreaCardData } from '@/Components/domain/PracticeAreaCard';
import { Card, CardBody, CardHeader, ColumnChart, EmptyState, PageHeader, Stat } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';

type Directory = { lawyers: LawyerCardData[]; firms: FirmCardData[]; practiceAreas: PracticeAreaCardData[] };

export default function AdminDashboard({ kpis, signups, deliveries, integrations, directory }: { kpis: Record<string, number>; signups: { label: string; value: number }[]; deliveries: Record<string, number>; integrations: Record<string, boolean>; directory: Directory }) {
    const t = useT();
    return (
        <AppLayout title={t('Admin')} area="admin">
            <PageHeader title={t('Platform overview')} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Stat label={t('Lawyers')} value={kpis.lawyers} />
                <Stat label={t('Verified')} value={kpis.verified} tone="green" />
                <Stat label={t('Awaiting verification')} value={kpis.pendingVerification} tone="gold" href={route('admin.verifications.index')} />
                <Stat label={t('Clients')} value={kpis.clients} />
                <Stat label={t('Law firms')} value={kpis.firms} />
                <Stat label={t('Cases on platform')} value={kpis.cases} />
                <Stat label={t('Paid subscriptions')} value={kpis.paidSubscriptions} />
                <Stat label={t('Reviews to moderate')} value={kpis.pendingReviews} href={route('admin.reviews.index')} />
                <Stat label={t('Open complaints')} value={kpis.openComplaints} tone={kpis.openComplaints ? 'red' : 'navy'} href={route('admin.complaints.index')} />
                <Stat label={t('Deletion requests')} value={kpis.deletionRequests} href={route('admin.users.index', { deletion: 1 })} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2"><CardHeader title={t('New accounts per month')} /><CardBody><ColumnChart data={signups} /></CardBody></Card>
                <Card>
                    <CardHeader title={t('Integrations')} />
                    <CardBody className="space-y-2 text-sm">
                        {Object.entries(integrations).map(([k, v]) => <p key={k} className="flex items-center gap-2">{v ? <CheckCircle2 className="size-4 text-verdant-600" /> : <CircleDashed className="size-4 text-navy-400" />}{t(`integration.${k}`)}: <span className={v ? 'text-verdant-700' : 'text-navy-500'}>{v ? t('Configured') : t('Awaiting credentials')}</span></p>)}
                        <p className="pt-2 text-xs text-navy-500">{t('WhatsApp deliveries (30 days)')}: {Object.entries(deliveries).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}</p>
                    </CardBody>
                </Card>
            </div>

            <section className="mt-8">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-semibold">{t('Directory snapshot')}</h2>
                        <p className="text-sm text-navy-500">{t('How the platform looks to clients right now.')}</p>
                    </div>
                    <div className="flex gap-3 text-sm font-medium">
                        <Link href={route('lawyers.index')} className="hover:underline">{t('Lawyers')}</Link>
                        <Link href={route('firms.index')} className="hover:underline">{t('Law firms')}</Link>
                        <Link href={route('specializations.index')} className="hover:underline">{t('Practice areas')}</Link>
                    </div>
                </div>
                {directory.lawyers.length === 0 && directory.firms.length === 0 ? (
                    <EmptyState title={t('Nothing published yet')} description={t('Verified lawyers and public firms appear here.')} />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {directory.lawyers.map((l) => <LawyerCard key={l.slug} lawyer={l} />)}
                        {directory.firms.map((f) => <FirmCard key={f.slug} firm={f} />)}
                    </div>
                )}
                {directory.practiceAreas.length > 0 && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {directory.practiceAreas.map((a) => <PracticeAreaCard key={a.slug} area={a} />)}
                    </div>
                )}
            </section>
        </AppLayout>
    );
}
