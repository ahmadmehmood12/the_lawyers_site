import { Link } from '@inertiajs/react';
import { Receipt } from 'lucide-react';
import { Card, EmptyState, PageHeader, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Row = { id: number; number: string; issue_date: string; due_date: string | null; total: string; amount_paid: string; balance: string; status: string; status_label: string; organization: string; case: string | null };

export default function PortalInvoices({ invoices }: { invoices: Row[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Invoices')} area="portal">
            <PageHeader title={t('Invoices & receipts')} />
            <Card>
                {invoices.length === 0 ? <EmptyState icon={<Receipt className="size-5" />} title={t('No invoices')} /> : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {invoices.map((i) => (
                            <li key={i.id}><Link href={route('portal.invoices.show', i.id)} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-navy-50/60 dark:hover:bg-navy-800/40">
                                <div><p className="ltr-nums font-medium">{i.number}</p><p className="text-xs text-navy-500">{i.organization}{i.case ? `, ${i.case}` : ''}, {formatDate(i.issue_date, locale)}</p></div>
                                <div className="flex items-center gap-3"><span className="tabular-nums">{t('Due')}: {formatMoney(i.balance, locale)}</span><StatusBadge value={i.status} label={i.status_label} /></div>
                            </Link></li>
                        ))}
                    </ul>
                )}
            </Card>
        </AppLayout>
    );
}
