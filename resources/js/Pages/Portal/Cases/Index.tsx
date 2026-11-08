import { Link } from '@inertiajs/react';
import { Briefcase } from 'lucide-react';
import { Card, EmptyState, PageHeader, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Row = { id: number; title: string; case_number: string | null; status: string; status_label: string; court: string | null; organization: string; lawyers: string[]; next_hearing_at: string | null };

export default function PortalCases({ cases }: { cases: Row[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('My Cases')} area="portal">
            <PageHeader title={t('My Cases')} />
            <Card>
                {cases.length === 0 ? <EmptyState icon={<Briefcase className="size-5" />} title={t('No cases shared with you yet')} description={t('When your lawyer links you to a case, it appears here.')} /> : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {cases.map((c) => (
                            <li key={c.id}>
                                <Link href={route('portal.cases.show', c.id)} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-navy-50/60 dark:hover:bg-navy-800/40">
                                    <div className="min-w-0"><p className="font-semibold">{c.title}</p><p className="text-xs text-navy-500">{[c.case_number, c.court, c.organization].filter(Boolean).join(', ')}</p><p className="text-xs text-navy-500">{c.lawyers.join(', ')}</p></div>
                                    <div className="flex items-center gap-3 text-sm">{c.next_hearing_at && <span>{t('Next hearing')}: <b>{formatDate(c.next_hearing_at, locale)}</b></span>}<StatusBadge value={c.status} label={c.status_label} /></div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </AppLayout>
    );
}
