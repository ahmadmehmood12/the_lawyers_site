import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, CardBody, Checkbox, Input, LinkButton, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type ClientData = { id?: number; type: string; name: string; company_name: string | null; cnic: string | null; ntn: string | null; email: string | null; phone: string | null; whatsapp: string | null; address: string | null; city_id: number | null; preferred_locale: string; notes: string | null; whatsapp_consent: boolean };

export default function ClientForm({ client, cities }: { client: ClientData | null; cities: SelectOption[] }) {
    const t = useT();
    const form = useForm({
        type: client?.type ?? 'individual', name: client?.name ?? '', company_name: client?.company_name ?? '', cnic: client?.cnic ?? '', ntn: client?.ntn ?? '',
        email: client?.email ?? '', phone: client?.phone ?? '', whatsapp: client?.whatsapp ?? '', address: client?.address ?? '', city_id: client?.city_id ? String(client.city_id) : '',
        preferred_locale: client?.preferred_locale ?? 'en', notes: client?.notes ?? '', whatsapp_consent: client?.whatsapp_consent ?? false,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ ...data, city_id: data.city_id || null }));
        client?.id ? form.put(route('clients.update', client.id)) : form.post(route('clients.store'));
    }

    return (
        <AppLayout title={client ? t('Edit client') : t('New client')} wide>
            <PageHeader title={client ? t('Edit client') : t('New client')} breadcrumbs={[{ label: t('Clients'), href: route('clients.index') }, { label: client?.name ?? t('New') }]} />
            <form onSubmit={submit} className="max-w-3xl space-y-6">
                <Card>
                    <CardBody className="grid gap-4 sm:grid-cols-2">
                        <Select label={t('Client type')} value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} options={[{ value: 'individual', label: t('Individual') }, { value: 'business', label: t('Business') }]} />
                        <Input label={form.data.type === 'business' ? t('Contact person') : t('Full name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                        {form.data.type === 'business' && <Input label={t('Company name')} value={form.data.company_name} onChange={(e) => form.setData('company_name', e.target.value)} error={form.errors.company_name} required />}
                        {form.data.type === 'business' ? (
                            <Input label={t('NTN')} value={form.data.ntn} onChange={(e) => form.setData('ntn', e.target.value)} error={form.errors.ntn} className="ltr-nums" />
                        ) : (
                            <Input label={t('CNIC')} placeholder="12345-1234567-1" value={form.data.cnic} onChange={(e) => form.setData('cnic', e.target.value)} error={form.errors.cnic} className="ltr-nums" hint={t('Stored encrypted.')} />
                        )}
                        <Input label={t('Mobile number')} type="tel" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                        <Input label={t('WhatsApp number')} type="tel" value={form.data.whatsapp} onChange={(e) => form.setData('whatsapp', e.target.value)} error={form.errors.whatsapp} hint={t('Leave empty to use the mobile number.')} />
                        <Input label={t('Email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
                        <Select label={t('City')} value={form.data.city_id} onChange={(e) => form.setData('city_id', e.target.value)} options={cities} placeholder={t('Select city')} />
                        <Input wrapperClassName="sm:col-span-2" label={t('Address')} value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} error={form.errors.address} />
                        <Select label={t('Preferred language')} value={form.data.preferred_locale} onChange={(e) => form.setData('preferred_locale', e.target.value)} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                        <Textarea wrapperClassName="sm:col-span-2" label={t('Private notes')} hint={t('Encrypted. Never visible to the client.')} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} error={form.errors.notes} />
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="space-y-3">
                        <Checkbox label={t('The client has agreed to receive hearing reminders and case updates on WhatsApp.')} checked={form.data.whatsapp_consent} onChange={(e) => form.setData('whatsapp_consent', e.target.checked)} />
                        <Alert tone="info">{t('WhatsApp messages are only sent with recorded consent. The date of consent is stored.')}</Alert>
                    </CardBody>
                </Card>
                <div className="flex justify-end gap-2">
                    <LinkButton href={client?.id ? route('clients.show', client.id) : route('clients.index')} variant="secondary">{t('Cancel')}</LinkButton>
                    <Button type="submit" loading={form.processing}>{t('Save client')}</Button>
                </div>
            </form>
        </AppLayout>
    );
}
