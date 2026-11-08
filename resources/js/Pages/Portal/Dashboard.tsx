import { Link } from '@inertiajs/react';
import { Briefcase, CalendarDays, FileText, Search, Wallet } from 'lucide-react';
import { Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader, Stat, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatDateTime, formatMoney, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Hearing = { id: number; hearing_date: string; hearing_time: string | null; status: string; status_label: string; purpose: string | null; court: string | null; case: { id: number; title: string } | null };

export default function PortalDashboard({ stats, nextHearings, appointments, lawyers }: { stats: { cases: number; upcoming: number; documents: number; due: number }; nextHearings: Hearing[]; appointments: { id: number; starts_at: string; status: string; status_label: string; lawyer: string }[]; lawyers: { name: string; slug: string | null }[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('My Dashboard')} area="portal">
            <PageHeader title={t('Welcome')} description={t('Follow your cases, hearings and documents in one place.')} actions={<LinkButton href={route('lawyers.index')} variant="secondary" icon={<Search className="size-4" />}>{t('Find a Lawyer')}</LinkButton>} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label={t('My cases')} value={stats.cases} icon={<Briefcase className="size-5" />} href={route('portal.cases.index')} />
                <Stat label={t('Upcoming hearings')} value={stats.upcoming} icon={<CalendarDays className="size-5" />} tone="gold" />
                <Stat label={t('Shared documents')} value={stats.documents} icon={<FileText className="size-5" />} href={route('portal.documents.index')} />
                <Stat label={t('Amount due')} value={formatMoney(stats.due, locale)} icon={<Wallet className="size-5" />} tone={stats.due > 0 ? 'red' : 'green'} href={route('portal.invoices.index')} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Upcoming hearings')} />
                    {nextHearings.length === 0 ? <EmptyState icon={<CalendarDays className="size-5" />} title={t('No upcoming hearings shared with you')} /> : (
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {nextHearings.map((h) => (
                                <li key={h.id}>
                                    <Link href={route('portal.cases.show', h.case?.id ?? 0)} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-navy-50/60 dark:hover:bg-navy-800/40">
                                        <div><p className="font-medium">{h.case?.title}</p><p className="text-xs text-navy-500">{[h.court, h.purpose].filter(Boolean).join(', ')}</p></div>
                                        <p className="text-sm font-semibold">{formatDate(h.hearing_date, locale, { weekday: 'short', day: 'numeric', month: 'short' })}{h.hearing_time ? `, ${formatTime(h.hearing_time, locale)}` : ''}</p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('My lawyers')} />
                        <CardBody className="space-y-2 text-sm">
                            {lawyers.length === 0 ? <p className="text-navy-500">—</p> : lawyers.map((l) => l.slug ? <Link key={l.name} href={route('lawyers.show', l.slug)} className="block font-medium hover:underline">{l.name}</Link> : <p key={l.name}>{l.name}</p>)}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={t('Appointments')} actions={<LinkButton href={route('portal.appointments.index')} variant="ghost" size="sm">{t('All')}</LinkButton>} />
                        <CardBody className="space-y-2 text-sm">
                            {appointments.length === 0 ? <p className="text-navy-500">—</p> : appointments.map((a) => <div key={a.id} className="flex items-center justify-between gap-2"><span>{formatDateTime(a.starts_at, locale)}, {a.lawyer}</span><StatusBadge value={a.status} label={a.status_label} /></div>)}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
