import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, Input } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

export default function ResetPassword({ email, token }: { email: string; token: string }) {
    const t = useT();
    const form = useForm({ token, email: email ?? '', password: '', password_confirmation: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('password.update'), { onFinish: () => form.reset('password', 'password_confirmation') });
    }

    return (
        <AuthLayout title={t('Choose a new password')}>
            <form onSubmit={submit} className="space-y-4">
                <Input label={t('Email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
                <Input label={t('New password')} type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required />
                <Input label={t('Confirm password')} type="password" autoComplete="new-password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} required />
                <Button type="submit" className="w-full" loading={form.processing}>{t('Reset password')}</Button>
            </form>
        </AuthLayout>
    );
}
