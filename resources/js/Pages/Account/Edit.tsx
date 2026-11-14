import { router, useForm, usePage } from '@inertiajs/react';
import { Camera, KeyRound, LogOut, MessageCircle, MonitorSmartphone, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, Avatar, Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

type Session = { id: string; ip_address: string | null; agent: string; last_active: string; current: boolean };

type WhatsAppConsentInfo = { consent: boolean; consent_at: string | null; revoked_at: string | null; source: string | null; phone: string | null };

export default function AccountEdit({ sessions, deletionRequestedAt, area, whatsapp }: { sessions: Session[]; deletionRequestedAt: string | null; area: 'workspace' | 'portal' | 'admin'; whatsapp: WhatsAppConsentInfo }) {
    const t = useT();
    const { locale } = useLocale();
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user!;
    const profile = useForm({ name: user.name, email: user.email, phone: user.phone ?? '', locale: user.locale });
    const avatar = useForm<{ avatar: File | null }>({ avatar: null });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    const sessionsForm = useForm({ password: '' });
    const deletion = useForm({ password: '' });

    return (
        <AppLayout title={t('Account settings')} area={area}>
            <PageHeader title={t('Account settings')} />
            <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Profile photo')} description={t('Your photo appears in the header, messages and activity feeds.')} />
                    <CardBody>
                        <form onSubmit={(e) => { e.preventDefault(); avatar.post(route('account.avatar.update'), { forceFormData: true, preserveScroll: true, onSuccess: () => avatar.reset() }); }} className="flex flex-wrap items-center gap-4">
                            <Avatar name={user.name} src={user.avatar_url} size="xl" />
                            <div className="min-w-48 flex-1 space-y-2">
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => avatar.setData('avatar', e.target.files?.[0] ?? null)}
                                    className="block w-full text-sm text-navy-700 file:me-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800 dark:text-navy-200 dark:file:bg-gold-500 dark:file:text-navy-950"
                                    aria-label={t('Profile photo')}
                                />
                                {avatar.errors.avatar && <p className="text-xs font-medium text-red-600">{avatar.errors.avatar}</p>}
                                <p className="text-xs text-navy-500 dark:text-navy-400">{t('Square JPG, PNG or WebP, up to 3 MB.')}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" icon={<Camera className="size-4" />} loading={avatar.processing} disabled={!avatar.data.avatar}>{t('Upload photo')}</Button>
                                {user.avatar_url && <Button type="button" variant="secondary" onClick={() => router.delete(route('account.avatar.destroy'), { preserveScroll: true })}>{t('Remove photo')}</Button>}
                            </div>
                        </form>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Profile')} />
                    <CardBody>
                        <form onSubmit={(e) => { e.preventDefault(); profile.put(route('user-profile-information.update'), { preserveScroll: true, errorBag: 'updateProfileInformation', onSuccess: () => profile.data.locale !== user.locale && window.location.reload() }); }} className="space-y-4">
                            <Input label={t('Full name')} value={profile.data.name} onChange={(e) => profile.setData('name', e.target.value)} error={profile.errors.name} />
                            <Input label={t('Email')} type="email" value={profile.data.email} onChange={(e) => profile.setData('email', e.target.value)} error={profile.errors.email} hint={!user.email_verified ? t('Not verified yet') : undefined} />
                            <Input label={t('Mobile number')} type="tel" value={profile.data.phone} onChange={(e) => profile.setData('phone', e.target.value)} error={profile.errors.phone} />
                            <Select label={t('Language')} value={profile.data.locale} onChange={(e) => profile.setData('locale', e.target.value as 'en' | 'ur')} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                            <Button type="submit" loading={profile.processing}>{t('Save')}</Button>
                        </form>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Password')} />
                    <CardBody>
                        <form onSubmit={(e) => { e.preventDefault(); password.put(route('user-password.update'), { preserveScroll: true, errorBag: 'updatePassword', onSuccess: () => password.reset() }); }} className="space-y-4">
                            <Input label={t('Current password')} type="password" autoComplete="current-password" value={password.data.current_password} onChange={(e) => password.setData('current_password', e.target.value)} error={password.errors.current_password} />
                            <Input label={t('New password')} type="password" autoComplete="new-password" value={password.data.password} onChange={(e) => password.setData('password', e.target.value)} error={password.errors.password} />
                            <Input label={t('Confirm password')} type="password" autoComplete="new-password" value={password.data.password_confirmation} onChange={(e) => password.setData('password_confirmation', e.target.value)} />
                            <Button type="submit" icon={<KeyRound className="size-4" />} loading={password.processing}>{t('Change password')}</Button>
                        </form>
                    </CardBody>
                </Card>
                <TwoFactor enabled={user.two_factor_enabled} />
                {area !== 'admin' && <WhatsAppConsentCard info={whatsapp} />}
                <Card>
                    <CardHeader title={t('Active sessions')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {sessions.map((s) => (
                            <li key={s.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                                <MonitorSmartphone className="mt-0.5 size-4 text-navy-400" />
                                <div className="min-w-0 flex-1"><p className="truncate">{s.agent}</p><p className="ltr-nums text-xs text-navy-500">{s.ip_address}, {formatDateTime(s.last_active, locale)}</p></div>
                                {s.current && <Badge tone="green">{t('This device')}</Badge>}
                            </li>
                        ))}
                    </ul>
                    <CardBody className="border-t border-navy-100 dark:border-navy-800">
                        <form onSubmit={(e) => { e.preventDefault(); sessionsForm.post(route('account.sessions.logout'), { preserveScroll: true, onSuccess: () => sessionsForm.reset() }); }} className="flex items-end gap-2">
                            <Input wrapperClassName="flex-1" label={t('Password')} type="password" value={sessionsForm.data.password} onChange={(e) => sessionsForm.setData('password', e.target.value)} error={sessionsForm.errors.password} />
                            <Button type="submit" variant="secondary" icon={<LogOut className="size-4" />} loading={sessionsForm.processing}>{t('Sign out others')}</Button>
                        </form>
                    </CardBody>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Delete account')} />
                    <CardBody className="space-y-3">
                        <p className="text-sm text-navy-600 dark:text-navy-300">{t('Deletion is reviewed by our team. Records that the law requires to be kept (such as issued invoices) are retained; everything else is removed.')}</p>
                        {deletionRequestedAt ? (
                            <Alert tone="warning" action={<Button size="sm" variant="secondary" onClick={() => router.delete(route('account.deletion.cancel'), { preserveScroll: true })}>{t('Cancel request')}</Button>}>{t('Deletion requested on :date.', { date: formatDateTime(deletionRequestedAt, locale) })}</Alert>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); deletion.post(route('account.deletion.request'), { preserveScroll: true }); }} className="flex items-end gap-2">
                                <Input wrapperClassName="flex-1 max-w-xs" label={t('Password')} type="password" value={deletion.data.password} onChange={(e) => deletion.setData('password', e.target.value)} error={deletion.errors.password} />
                                <Button type="submit" variant="danger" icon={<Trash2 className="size-4" />} loading={deletion.processing}>{t('Request deletion')}</Button>
                            </form>
                        )}
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}

/** Fortify TOTP flow: enable → scan QR → confirm with code → recovery codes. */
function TwoFactor({ enabled }: { enabled: boolean }) {
    const t = useT();
    const [qr, setQr] = useState<string | null>(null);
    const [codes, setCodes] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const confirm = useForm({ code: '' });
    const getJson = async (url: string) => (await fetch(url, { headers: { Accept: 'application/json' } })).json();

    function enable() {
        router.post(route('two-factor.enable'), {}, {
            preserveScroll: true,
            onSuccess: async () => setQr((await getJson(route('two-factor.qr-code'))).svg),
            onError: () => setError(t('Please confirm your password first.')),
        });
    }

    return (
        <Card>
            <CardHeader title={t('Two-factor authentication')} actions={enabled ? <Badge tone="green" icon={<ShieldCheck className="size-3" />}>{t('Enabled')}</Badge> : undefined} />
            <CardBody className="space-y-3 text-sm">
                <p className="text-navy-600 dark:text-navy-300">{t('Protect your account with a code from an authenticator app.')}</p>
                {error && <Alert tone="warning">{error} <a href={route('password.confirm')} className="font-semibold underline">{t('Confirm')}</a></Alert>}
                {!enabled && !qr && <Button variant="secondary" onClick={enable}>{t('Enable')}</Button>}
                {qr && !enabled && (
                    <div className="space-y-3">
                        <div className="inline-block rounded-lg bg-white p-3" dangerouslySetInnerHTML={{ __html: qr }} />
                        <form onSubmit={(e) => { e.preventDefault(); confirm.post(route('two-factor.confirm'), { preserveScroll: true, errorBag: 'confirmTwoFactorAuthentication', onSuccess: async () => { setQr(null); setCodes(await getJson(route('two-factor.recovery-codes'))); } }); }} className="flex items-end gap-2">
                            <Input label={t('Code')} inputMode="numeric" value={confirm.data.code} onChange={(e) => confirm.setData('code', e.target.value)} error={confirm.errors.code} className="ltr-nums" />
                            <Button type="submit" loading={confirm.processing}>{t('Confirm')}</Button>
                        </form>
                    </div>
                )}
                {codes.length > 0 && <div><p className="font-medium">{t('Store these recovery codes safely:')}</p><pre className="ltr-nums mt-2 rounded bg-navy-50 p-3 text-xs dark:bg-navy-800">{codes.join('\n')}</pre></div>}
                {enabled && <Button variant="ghost" onClick={() => router.delete(route('two-factor.disable'), { preserveScroll: true })}>{t('Disable')}</Button>}
            </CardBody>
        </Card>
    );
}

/**
 * WhatsApp opt in (AccountController::giveWhatsAppConsent). Nothing is sent on WhatsApp without it,
 * and withdrawing stops every message, including ones already queued.
 */
function WhatsAppConsentCard({ info }: { info: WhatsAppConsentInfo }) {
    const t = useT();
    const { locale } = useLocale();
    const form = useForm({ phone: info.phone ?? '', agree: false });
    const sources: Record<string, string> = {
        account_settings: t('Account settings'), notification_preferences: t('Notification settings'), client_portal: t('Client portal'),
        recorded_by_lawyer: t('Recorded by your lawyer'), whatsapp_reply: t('WhatsApp reply'), admin: t('Platform team'), contact_form: t('Contact form'),
    };
    return (
        <Card>
            <CardHeader title={t('WhatsApp notifications')} actions={info.consent ? <Badge tone="green" icon={<MessageCircle className="size-3" />}>{t('On')}</Badge> : <Badge>{t('Off')}</Badge>} />
            <CardBody className="space-y-4">
                {info.consent ? (
                    <>
                        <p className="text-sm text-navy-600 dark:text-navy-300">{t('You agreed to receive WhatsApp messages on :phone.', { phone: info.phone ?? '' })}</p>
                        <p className="text-xs text-navy-500">{t('Agreed on :date via :source.', { date: info.consent_at ? formatDateTime(info.consent_at, locale) : '—', source: sources[info.source ?? ''] ?? info.source ?? '—' })}</p>
                        <p className="text-sm text-navy-600 dark:text-navy-300">{t('Choose which alerts come on WhatsApp in Notifications. You can also reply STOP to any of our WhatsApp messages.')}</p>
                        <Button variant="secondary" onClick={() => router.delete(route('account.whatsapp-consent.destroy'), { preserveScroll: true })}>{t('Stop WhatsApp messages')}</Button>
                    </>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); form.post(route('account.whatsapp-consent.store'), { preserveScroll: true }); }} className="space-y-4">
                        <p className="text-sm text-navy-600 dark:text-navy-300">{t('Get hearing reminders and appointment updates on WhatsApp. We only send the alerts you choose, never marketing.')}</p>
                        {info.revoked_at && <p className="text-xs text-navy-500">{t('You stopped WhatsApp messages on :date.', { date: formatDateTime(info.revoked_at, locale) })}</p>}
                        <Input label={t('WhatsApp number')} type="tel" placeholder="+92 300 1234567" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                        <label className="flex items-start gap-2.5 text-sm">
                            <input type="checkbox" checked={form.data.agree} onChange={(e) => form.setData('agree', e.target.checked)} className="mt-0.5 size-4 accent-navy-900" />
                            <span>{t('I agree to receive WhatsApp messages about my cases, hearings and appointments on this number. I can stop them at any time.')}</span>
                        </label>
                        {form.errors.agree && <p className="text-xs text-red-600">{form.errors.agree}</p>}
                        <Button type="submit" icon={<MessageCircle className="size-4" />} loading={form.processing} disabled={!form.data.agree || !form.data.phone}>{t('Turn on WhatsApp messages')}</Button>
                    </form>
                )}
            </CardBody>
        </Card>
    );
}
