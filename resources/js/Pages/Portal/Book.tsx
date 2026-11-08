import { useForm } from '@inertiajs/react';
import { CalendarClock } from 'lucide-react';
import { useMemo } from 'react';
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option } from '@/types';

export default function Book({ lawyer, slots, modes }: { lawyer: { slug: string; name: string; fee: number | null; accepting: boolean }; slots: { starts_at: string; mode: string }[]; modes: Option[] }) {
    const t = useT();
    const { locale } = useLocale();
    const form = useForm({ starts_at: '', mode: modes[0]?.value ?? 'in_person', message: '' });
    const byDay = useMemo(() => {
        const map = new Map<string, typeof slots>();
        slots.filter((s) => s.mode === 'both' || s.mode === form.data.mode).forEach((s) => map.set(s.starts_at.slice(0, 10), [...(map.get(s.starts_at.slice(0, 10)) ?? []), s]));
        return [...map.entries()];
    }, [slots, form.data.mode]);

    return (
        <AppLayout title={t('Book a consultation')} area="portal">
            <PageHeader title={t('Book a consultation')} description={lawyer.name} breadcrumbs={[{ label: lawyer.name, href: route('lawyers.show', lawyer.slug) }, { label: t('Book') }]} />
            {!lawyer.accepting && <Alert tone="warning" className="mb-4">{t('This lawyer is not accepting new clients right now.')}</Alert>}
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Choose a time')} />
                    <CardBody className="space-y-4">
                        {byDay.length === 0 ? <EmptyState icon={<CalendarClock className="size-5" />} title={t('No open slots in the next two weeks')} description={t('Try messaging the chambers or check back later.')} /> : byDay.map(([day, items]) => (
                            <div key={day}>
                                <p className="mb-2 text-sm font-semibold">{formatDate(day, locale, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                                <div className="flex flex-wrap gap-2">{items.map((s) => <button key={s.starts_at} type="button" onClick={() => form.setData('starts_at', s.starts_at)} className={cn('ltr-nums rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset', form.data.starts_at === s.starts_at ? 'bg-navy-900 text-white ring-navy-900 dark:bg-gold-500 dark:text-navy-950' : 'ring-navy-200 hover:bg-navy-50 dark:ring-navy-700')}>{new Date(s.starts_at).toLocaleTimeString(locale === 'ur' ? 'ur-PK' : 'en-PK', { hour: 'numeric', minute: '2-digit' })}</button>)}</div>
                            </div>
                        ))}
                        {form.errors.starts_at && <p className="text-sm text-red-600">{form.errors.starts_at}</p>}
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="space-y-4">
                        {lawyer.fee && <p className="text-sm">{t('Consultation fee from :fee', { fee: formatMoney(lawyer.fee, locale) })}</p>}
                        <Select label={t('Consultation type')} value={form.data.mode} onChange={(e) => form.setData((d) => ({ ...d, mode: e.target.value, starts_at: '' }))} options={modes} />
                        <Textarea label={t('Briefly describe your matter')} hint={t('Do not include sensitive details. Your lawyer will ask in person.')} value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} />
                        <Button className="w-full" disabled={!form.data.starts_at || !lawyer.accepting} loading={form.processing} onClick={() => form.post(route('portal.book.store', lawyer.slug))}>{t('Request appointment')}</Button>
                        <p className="text-xs text-navy-500">{t('The lawyer will confirm or suggest another time.')}</p>
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
