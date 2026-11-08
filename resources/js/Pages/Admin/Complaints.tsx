import { router, useForm } from '@inertiajs/react';
import { Button, Card, CardBody, CardHeader, LinkButton, PageHeader, Pagination, Select, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';

export default function Complaints({ complaints, openMessages, statuses }: { complaints: Paginated<any>; openMessages: number; statuses: Option[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Complaints')} area="admin">
            <PageHeader title={t('Complaints & contact messages')} />
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader title={t('Complaints')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {complaints.data.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                        {complaints.data.map((c) => <ComplaintItem key={c.id} complaint={c} statuses={statuses} />)}
                    </ul>
                    <Pagination meta={complaints} />
                </Card>
                <Card>
                    <CardHeader title={t('Contact messages and feedback')} description={t(':count open in the feedback inbox.', { count: openMessages })} />
                    <CardBody><LinkButton href={route('admin.feedback.index')} variant="secondary">{t('Open the feedback inbox')}</LinkButton></CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}

function ComplaintItem({ complaint: c, statuses }: { complaint: any; statuses: Option[] }) {
    const t = useT();
    const form = useForm({ status: c.status, resolution: c.resolution ?? '' });
    return (
        <li className="space-y-2 px-5 py-3 text-sm">
            <div className="flex items-center justify-between"><p className="font-medium">{c.subject}</p><StatusBadge value={c.status} label={c.status_label} /></div>
            <p>{c.body}</p>
            <p className="text-xs text-navy-500">{c.name}, {c.email}{c.lawyer ? `, ${t('About')}: ${c.lawyer}` : ''}</p>
            <div className="flex flex-wrap items-end gap-2"><Select aria-label={t('Status')} value={form.data.status} onChange={(e) => form.setData('status', e.target.value)} options={statuses} wrapperClassName="w-36" /><Textarea aria-label={t('Resolution')} rows={1} wrapperClassName="flex-1" value={form.data.resolution} onChange={(e) => form.setData('resolution', e.target.value)} /><Button size="sm" loading={form.processing} onClick={() => form.put(route('admin.complaints.update', c.id), { preserveScroll: true })}>{t('Save')}</Button></div>
        </li>
    );
}
