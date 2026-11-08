import { router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, Input, LinkButton, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Reminder = { event: string; days_before: number; notify_lawyer: boolean; notify_client: boolean };
type Props = {
    organization: Record<string, any>;
    canManage: boolean;
    reminders: Reminder[];
    subscription: { plan: { slug: string; name: string; features: { label: string; limit: number | null }[] } | null; status: string | null; ends_at: string | null; trial_ends_at: string | null };
    plans: { slug: string; name: string; price_monthly: number; audience: string }[];
    cities: SelectOption[];
    whatsappConfigured: boolean;
};

export default function OrganizationSettings({ organization: o, canManage, reminders, subscription, plans, cities, whatsappConfigured }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    const form = useForm({ name: s(o.name), description: s(o.description), description_ur: s(o.description_ur), email: s(o.email), phone: s(o.phone), website: s(o.website), address: s(o.address), city_id: s(o.city_id), registration_number: s(o.registration_number), ntn: s(o.ntn), founded_year: s(o.founded_year), is_public: !!o.is_public });
    const rem = useForm({ reminders });
    const logo = useForm<{ logo: File | null }>({ logo: null });
    const setRem = (i: number, patch: Partial<Reminder>) => rem.setData('reminders', rem.data.reminders.map((r, j) => (j === i ? { ...r, ...patch } : r)));

    return (
        <AppLayout title={t('Settings')}>
            <PageHeader title={t('Organization settings')} actions={<LinkButton href={route('account.edit')} variant="secondary">{t('My account')}</LinkButton>} />
            <div className="grid gap-6 lg:grid-cols-3">
                <form className="space-y-6 lg:col-span-2" onSubmit={(e) => { e.preventDefault(); form.transform((d) => ({ ...d, city_id: d.city_id || null, founded_year: d.founded_year || null })); form.put(route('settings.organization.update'), { preserveScroll: true }); }}>
                    <Card>
                        <CardHeader title={t('Logo')} description={t('Appears on your public firm page, directory cards, invoices and the workspace header.')} />
                        <CardBody className="flex flex-wrap items-center gap-4">
                            {o.logo_url ? <img src={o.logo_url} alt="" className="size-20 rounded-lg border border-navy-100 bg-white object-contain p-1 dark:border-navy-700" /> : <span className="flex size-20 items-center justify-center rounded-lg border border-dashed border-navy-300 text-xs text-navy-500 dark:border-navy-600">{t('No logo')}</span>}
                            {canManage && (
                                <div className="min-w-48 flex-1 space-y-2">
                                    <input type="file" accept="image/png,image/jpeg,image/webp" aria-label={t('Logo')} onChange={(e) => logo.setData('logo', e.target.files?.[0] ?? null)} className="block w-full text-sm text-navy-700 file:me-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:bg-navy-200 dark:text-navy-200 dark:file:bg-navy-800 dark:file:text-navy-100" />
                                    {logo.errors.logo && <p className="text-xs font-medium text-red-600">{logo.errors.logo}</p>}
                                    <p className="text-xs text-navy-500 dark:text-navy-400">{t('PNG with a transparent background works best. Up to 2 MB.')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button type="button" size="sm" disabled={!logo.data.logo} loading={logo.processing} onClick={() => logo.post(route('settings.organization.logo.update'), { forceFormData: true, preserveScroll: true, onSuccess: () => logo.reset() })}>{t('Upload logo')}</Button>
                                        {o.logo_url && <Button type="button" size="sm" variant="secondary" onClick={() => router.delete(route('settings.organization.logo.destroy'), { preserveScroll: true })}>{t('Remove logo')}</Button>}
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={o.type === 'firm' ? t('Firm profile') : t('Practice details')} description={t('Shown on invoices and receipts. Firm profiles can be listed publicly.')} />
                        <CardBody className="grid gap-4 sm:grid-cols-2">
                            <fieldset disabled={!canManage} className="contents">
                                <Input wrapperClassName="sm:col-span-2" label={t('Name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                                <Input label={t('Email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
                                <Input label={t('Phone')} type="tel" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                                <Input wrapperClassName="sm:col-span-2" label={t('Address')} value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                                <Select label={t('City')} value={form.data.city_id} onChange={(e) => form.setData('city_id', e.target.value)} options={cities} placeholder={t('Select')} />
                                <Input label={t('Website')} type="url" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} error={form.errors.website} />
                                <Input label={t('Registration no.')} value={form.data.registration_number} onChange={(e) => form.setData('registration_number', e.target.value)} />
                                <Input label={t('NTN')} value={form.data.ntn} onChange={(e) => form.setData('ntn', e.target.value)} />
                                <Input label={t('Founded')} type="number" value={form.data.founded_year} onChange={(e) => form.setData('founded_year', e.target.value)} error={form.errors.founded_year} />
                                <Textarea wrapperClassName="sm:col-span-2" label={t('About (English)')} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                                <Textarea wrapperClassName="sm:col-span-2" dir="rtl" label={t('About (Urdu)')} value={form.data.description_ur} onChange={(e) => form.setData('description_ur', e.target.value)} />
                                {o.type === 'firm' && <div className="sm:col-span-2"><Checkbox label={t('List this firm in the public law-firm directory')} checked={form.data.is_public} onChange={(e) => form.setData('is_public', e.target.checked)} /></div>}
                            </fieldset>
                        </CardBody>
                        {canManage && <div className="flex justify-end border-t border-navy-100 px-5 py-3 dark:border-navy-800"><Button type="submit" loading={form.processing}>{t('Save')}</Button></div>}
                    </Card>
                    <Card>
                        <CardHeader title={t('Reminder schedule')} description={t('When reminders are sent before hearings, appointments and payments.')} />
                        <CardBody className="space-y-2">
                            {!whatsappConfigured && <Alert tone="info">{t('WhatsApp is not connected on this platform yet; reminders currently go by in-app notification and email.')}</Alert>}
                            {rem.data.reminders.map((r, i) => (
                                <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-navy-100 px-3 py-2 text-sm dark:border-navy-800">
                                    <select disabled={!canManage} value={r.event} onChange={(e) => setRem(i, { event: e.target.value })} className="rounded-md border-0 py-1 text-sm ring-1 ring-navy-200 dark:bg-navy-900 dark:ring-navy-700" aria-label={t('Event')}><option value="hearing">{t('Hearing')}</option><option value="appointment">{t('Appointment')}</option><option value="payment">{t('Payment')}</option></select>
                                    <select disabled={!canManage} value={r.days_before} onChange={(e) => setRem(i, { days_before: Number(e.target.value) })} className="rounded-md border-0 py-1 text-sm ring-1 ring-navy-200 dark:bg-navy-900 dark:ring-navy-700" aria-label={t('When')}>{[0, 1, 2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d === 0 ? t('Same day') : t(':count days before', { count: d })}</option>)}</select>
                                    <Checkbox disabled={!canManage} label={t('Lawyer')} checked={r.notify_lawyer} onChange={(e) => setRem(i, { notify_lawyer: e.target.checked })} />
                                    <Checkbox disabled={!canManage} label={t('Client')} checked={r.notify_client} onChange={(e) => setRem(i, { notify_client: e.target.checked })} />
                                    {canManage && <button type="button" className="ms-auto text-navy-400 hover:text-red-600" onClick={() => rem.setData('reminders', rem.data.reminders.filter((_, j) => j !== i))} aria-label={t('Remove')}><Trash2 className="size-4" /></button>}
                                </div>
                            ))}
                            {canManage && <div className="flex justify-between pt-2"><Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => rem.setData('reminders', [...rem.data.reminders, { event: 'hearing', days_before: 1, notify_lawyer: true, notify_client: true }])}>{t('Add reminder')}</Button><Button size="sm" loading={rem.processing} onClick={() => rem.put(route('settings.reminders.update'), { preserveScroll: true })}>{t('Save schedule')}</Button></div>}
                        </CardBody>
                    </Card>
                </form>
                <Card>
                    <CardHeader title={t('Subscription')} />
                    <CardBody className="space-y-3 text-sm">
                        <p className="text-lg font-semibold">{subscription.plan?.name ?? '—'} {subscription.status && <Badge>{subscription.status}</Badge>}</p>
                        {subscription.trial_ends_at && <p>{t('Trial ends :date', { date: formatDate(subscription.trial_ends_at, locale) })}</p>}
                        {subscription.ends_at && <p>{t('Renews / ends :date', { date: formatDate(subscription.ends_at, locale) })}</p>}
                        <ul className="space-y-1 text-navy-600 dark:text-navy-300">{subscription.plan?.features.map((f) => <li key={f.label} className="flex justify-between"><span>{f.label}</span><span>{f.limit === null ? t('Unlimited') : f.limit === 0 ? '—' : f.limit}</span></li>)}</ul>
                        <p className="text-xs text-navy-500">{t('Existing records stay accessible even if a subscription ends.')}</p>
                        {canManage && (
                            <div className="space-y-2 border-t border-navy-100 pt-3 dark:border-navy-800">
                                {plans.filter((p) => p.slug !== subscription.plan?.slug).map((p) => (
                                    <div key={p.slug} className="flex items-center justify-between"><span>{p.name}, {p.price_monthly ? `${formatMoney(p.price_monthly, locale)}/${t('mo')}` : t('Free')}</span><Button size="sm" variant="secondary" onClick={() => router.post(route('settings.plan'), { plan: p.slug }, { preserveScroll: true })}>{t('Switch')}</Button></div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
