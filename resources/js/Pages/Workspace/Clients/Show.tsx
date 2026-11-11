import { Link } from '@inertiajs/react';
import { Briefcase, MessageSquare, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmAction, DetailList, EmptyState, LinkButton, PageHeader, StatusBadge } from '@/Components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Props = {
    client: { id: number; type: string; name: string; company_name: string | null; ntn: string | null; email: string | null; phone: string | null; whatsapp: string | null; address: string | null; preferred_locale: string; user_id: number | null; city: string | null; cnic: string | null; notes: string | null; whatsapp_consent: boolean; whatsapp_consent_at: string | null; created_at: string };
    cases: { id: number; reference: string; title: string; status: string; status_label: string; court: string | null; next_hearing_at: string | null }[];
    invoices: { id: number; number: string; issue_date: string; total: string; amount_paid: string; status: string; status_label: string }[] | null;
    appointments: { id: number; starts_at: string; status: string; status_label: string }[];
    can: { update: boolean; delete: boolean; sensitive: boolean };
};

export default function ClientShow({ client, cases, invoices, appointments, can }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const perms = usePermissions();

    return (
        <AppLayout title={client.name} wide>
            <PageHeader
                title={client.name}
                description={client.company_name ?? undefined}
                breadcrumbs={[{ label: t('Clients'), href: route('clients.index') }, { label: client.name }]}
                actions={
                    <>
                        {perms.can('cases.create') && <LinkButton href={route('cases.create', { client_id: client.id })} icon={<Plus className="size-4" />}>{t('New case')}</LinkButton>}
                        {perms.can('finance.invoice') && <LinkButton href={route('invoices.create', { client_id: client.id })} variant="secondary" icon={<Receipt className="size-4" />}>{t('Invoice')}</LinkButton>}
                        {client.user_id && perms.can('messages.client') && (
                            <Link href={route('messages.store')} method="post" data={{ client_id: client.id }} as="button" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-navy-200 ring-inset hover:bg-navy-50 dark:bg-navy-900 dark:ring-navy-700">
                                <MessageSquare className="size-4" />{t('Message')}
                            </Link>
                        )}
                        {can.update && <LinkButton href={route('clients.edit', client.id)} variant="secondary" icon={<Pencil className="size-4" />}>{t('Edit')}</LinkButton>}
                        {can.delete && cases.length === 0 && (
                            <ConfirmAction href={route('clients.destroy', client.id)} method="delete" title={t('Remove this client?')} trigger={(open) => <Button variant="ghost" onClick={open} icon={<Trash2 className="size-4" />} aria-label={t('Delete')} />} />
                        )}
                    </>
                }
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title={t('Cases')} />
                        {cases.length === 0 ? (
                            <EmptyState icon={<Briefcase className="size-5" />} title={t('No cases yet')} />
                        ) : (
                            <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                {cases.map((c) => (
                                    <li key={c.id}>
                                        <Link href={route('cases.show', c.id)} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-navy-50/60 dark:hover:bg-navy-800/40">
                                            <div className="min-w-0">
                                                <p className="font-medium">{c.title}</p>
                                                <p className="ltr-nums text-xs text-navy-500">{c.reference}{c.court ? `, ${c.court}` : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-navy-500">
                                                {c.next_hearing_at && <span>{t('Next')}: {formatDate(c.next_hearing_at, locale)}</span>}
                                                <StatusBadge value={c.status} label={c.status_label} />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                    {invoices && (
                        <Card>
                            <CardHeader title={t('Invoices')} />
                            {invoices.length === 0 ? <p className="px-5 py-6 text-sm text-navy-500">{t('No invoices yet.')}</p> : (
                                <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                    {invoices.map((i) => (
                                        <li key={i.id}>
                                            <Link href={route('invoices.show', i.id)} className="flex items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-navy-50/60 dark:hover:bg-navy-800/40">
                                                <span className="ltr-nums font-medium">{i.number}</span>
                                                <span className="text-navy-500">{formatDate(i.issue_date, locale)}</span>
                                                <span>{formatMoney(i.total, locale)}</span>
                                                <StatusBadge value={i.status} label={i.status_label} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    )}
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Contact details')} actions={client.user_id ? <Badge tone="green">{t('Portal access')}</Badge> : undefined} />
                        <CardBody>
                            <DetailList
                                columns={1}
                                items={[
                                    { label: t('Phone'), value: <span className="ltr-nums">{client.phone}</span> },
                                    { label: t('WhatsApp'), value: <span className="ltr-nums">{client.whatsapp ?? client.phone}</span> },
                                    { label: t('WhatsApp consent'), value: client.whatsapp_consent ? <Badge tone="green">{t('Given')} {client.whatsapp_consent_at && formatDate(client.whatsapp_consent_at, locale)}</Badge> : <Badge>{t('Not given')}</Badge> },
                                    { label: t('Email'), value: client.email },
                                    { label: client.type === 'business' ? t('NTN') : t('CNIC'), value: <span className="ltr-nums">{client.type === 'business' ? client.ntn : client.cnic}</span> },
                                    { label: t('Address'), value: [client.address, client.city].filter(Boolean).join(', ') },
                                    { label: t('Preferred language'), value: client.preferred_locale === 'ur' ? 'اردو' : 'English' },
                                    { label: t('Client since'), value: formatDate(client.created_at, locale) },
                                ]}
                            />
                        </CardBody>
                    </Card>
                    {can.sensitive && client.notes && (
                        <Card>
                            <CardHeader title={t('Private notes')} />
                            <CardBody><p className="text-sm whitespace-pre-line">{client.notes}</p></CardBody>
                        </Card>
                    )}
                    <Card>
                        <CardHeader title={t('Appointments')} />
                        <CardBody>
                            {appointments.length === 0 ? <p className="text-sm text-navy-500">—</p> : (
                                <ul className="space-y-2 text-sm">
                                    {appointments.map((a) => (
                                        <li key={a.id} className="flex items-center justify-between gap-2"><span>{formatDateTime(a.starts_at, locale)}</span><StatusBadge value={a.status} label={a.status_label} /></li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
