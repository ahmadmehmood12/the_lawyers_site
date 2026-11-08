import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, Input } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

export default function ConfirmPassword() {
    const t = useT();
    const form = useForm({ password: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('password.confirm.store'), { onFinish: () => form.reset() });
    }

    return (
        <AuthLayout title={t('Confirm your password')} description={t('This is a secure area. Please confirm your password to continue.')}>
            <form onSubmit={submit} className="space-y-4">
                <Input label={t('Password')} type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required autoFocus />
                <Button type="submit" className="w-full" loading={form.processing}>{t('Confirm')}</Button>
            </form>
        </AuthLayout>
    );
}
