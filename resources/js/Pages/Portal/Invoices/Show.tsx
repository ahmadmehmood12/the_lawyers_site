import { Download, Printer } from 'lucide-react';
import { Alert, Card, CardBody, CardHeader, PageHeader, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

export default function PortalInvoice({ invoice: i }: { invoice: Record<string, any> }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={i.number} area="portal">
            <PageHeader title={<span className="ltr-nums">{i.number}</span>} breadcrumbs={[{ label: t('Invoices'), href: route('portal.invoices.index') }, { label: i.number }]} description={<StatusBadge value={i.status} label={i.status_label} />}
                actions={<a href={route('portal.invoices.pdf', i.id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-medium text-white dark:bg-gold-500 dark:text-navy-950"><Download className="size-4" />{t('Download PDF')}</a>} />
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardBody className="space-y-4 text-sm">
                        <div className="flex justify-between"><div><p className="font-semibold">{i.organization.name}</p><p className="text-navy-500">{i.organization.address}</p></div><div className="text-end"><p>{t('Issued')}: {formatDate(i.issue_date, locale)}</p>{i.due_date && <p>{t('Due')}: {formatDate(i.due_date, locale)}</p>}</div></div>
                        {i.case && <p>{t('Matter')}: {i.case}</p>}
                        <table className="min-w-full"><tbody className="divide-y divide-navy-100 dark:divide-navy-800">{i.items.map((it: any, n: number) => <tr key={n}><td className="py-2">{it.description}</td><td className="py-2 text-end tabular-nums">{formatMoney(it.amount, locale)}</td></tr>)}</tbody></table>
                        <dl className="ms-auto max-w-xs space-y-1"><div className="flex justify-between font-semibold"><dt>{t('Total')}</dt><dd>{formatMoney(i.total, locale)}</dd></div><div className="flex justify-between"><dt>{t('Paid')}</dt><dd>{formatMoney(i.amount_paid, locale)}</dd></div><div className="flex justify-between text-base font-semibold"><dt>{t('Balance')}</dt><dd>{formatMoney(i.balance, locale)}</dd></div></dl>
                        {Number(i.balance) > 0 && <Alert tone="info">{t('Please contact your lawyer’s office to pay. Online payment is not available yet.')}</Alert>}
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Receipts')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {i.payments.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                        {i.payments.map((p: any) => <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm"><div><p className="font-medium">{formatMoney(p.amount, locale)}</p><p className="text-xs text-navy-500">{formatDate(p.paid_on, locale)}, {p.method}</p></div><a href={route('portal.receipts.show', p.id)} className="inline-flex items-center gap-1 text-xs underline"><Printer className="size-3.5" />{p.receipt_number}</a></li>)}
                    </ul>
                </Card>
            </div>
        </AppLayout>
    );
}
