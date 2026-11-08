import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, Input } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

export default function TwoFactorChallenge() {
    const t = useT();
    const [recovery, setRecovery] = useState(false);
    const form = useForm({ code: '', recovery_code: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('two-factor.login.store'));
    }

    return (
        <AuthLayout title={t('Two-factor authentication')} description={recovery ? t('Enter one of your emergency recovery codes.') : t('Enter the 6-digit code from your authenticator app.')}>
            <form onSubmit={submit} className="space-y-4">
                {recovery ? (
                    <Input label={t('Recovery code')} value={form.data.recovery_code} onChange={(e) => form.setData('recovery_code', e.target.value)} error={form.errors.recovery_code} autoFocus />
                ) : (
                    <Input label={t('Code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} error={form.errors.code} autoFocus className="ltr-nums text-center text-lg tracking-[0.4em]" />
                )}
                <Button type="submit" className="w-full" loading={form.processing}>{t('Continue')}</Button>
                <button type="button" onClick={() => setRecovery(!recovery)} className="w-full text-sm text-navy-600 hover:underline">
                    {recovery ? t('Use an authentication code') : t('Use a recovery code')}
                </button>
            </form>
        </AuthLayout>
    );
}
