import { useForm, usePage } from '@inertiajs/react';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, Input, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, SharedProps } from '@/types';

type Mine = { reference: string; subject: string; kind: string; status: 'new' | 'in_progress' | 'resolved'; status_label: string; created_at: string };

const statusTone = { new: 'amber', in_progress: 'navy', resolved: 'green' } as const;

export default function Feedback({ area, categories, mine }: { area: 'workspace' | 'portal' | 'admin'; categories: Option[]; mine: Mine[] }) {
    const t = useT();
    const { locale } = useLocale();
    const { auth } = usePage<SharedProps>().props;
    const form = useForm({ category: 'general', subject: '', body: '', phone: auth.user?.phone ?? '', whatsapp_consent: false });

    return (
        <AppLayout title={t('Feedback')} area={area}>
            <PageHeader title={t('Send feedback')} description={t('Tell us what is working, what is not, or what you need. Your message goes to the platform team only.')} />
            <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Card>
                    <CardBody>
                        <form
                            onSubmit={(e) => { e.preventDefault(); form.post(route('feedback.store'), { preserveScroll: true, onSuccess: () => form.reset('subject', 'body') }); }}
                            className="grid gap-4"
                        >
                            <Select label={t('Topic')} value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} options={categories} error={form.errors.category} required />
                            <Input label={t('Subject')} value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} error={form.errors.subject} required maxLength={160} />
                            <Textarea label={t('Message')} rows={6} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} required hint={t('Please do not include passwords or confidential case documents.')} />
                            <Input label={t('WhatsApp number (optional)')} type="tel" placeholder="03XX XXXXXXX" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                            {form.data.phone && <Checkbox label={t('Send me a WhatsApp confirmation with my reference number')} checked={form.data.whatsapp_consent} onChange={(e) => form.setData('whatsapp_consent', e.target.checked)} />}
                            <p className="text-xs text-navy-500 dark:text-navy-400">{t('A confirmation with your reference number is sent to :email.', { email: auth.user?.email ?? '' })}</p>
                            <div><Button type="submit" loading={form.processing}>{t('Send feedback')}</Button></div>
                        </form>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Your messages')} />
                    {mine.length === 0 ? (
                        <CardBody><p className="text-sm text-navy-500">{t('Nothing sent yet.')}</p></CardBody>
                    ) : (
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {mine.map((m) => (
                                <li key={m.reference} className="flex items-start justify-between gap-3 px-5 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{m.subject}</p>
                                        <p className="ltr-nums text-xs text-navy-500">{m.reference}, {formatDate(m.created_at, locale)}</p>
                                    </div>
                                    <Badge tone={statusTone[m.status]}>{m.status_label}</Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
