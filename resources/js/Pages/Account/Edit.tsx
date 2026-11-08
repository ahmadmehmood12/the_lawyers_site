import { router, useForm, usePage } from '@inertiajs/react';
import { KeyRound, LogOut, MonitorSmartphone, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

type Session = { id: string; ip_address: string | null; agent: string; last_active: string; current: boolean };

export default function AccountEdit({ sessions, deletionRequestedAt, area }: { sessions: Session[]; deletionRequestedAt: string | null; area: 'workspace' | 'portal' | 'admin' }) {
    const t = useT();
    const { locale } = useLocale();
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user!;
    const profile = useForm({ name: user.name, email: user.email, phone: user.phone ?? '', locale: user.locale });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    const sessionsForm = useForm({ password: '' });
    const deletion = useForm({ password: '' });

    return (
        <AppLayout title={t('Account settings')} area={area}>
            <PageHeader title={t('Account settings')} />
            <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
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
