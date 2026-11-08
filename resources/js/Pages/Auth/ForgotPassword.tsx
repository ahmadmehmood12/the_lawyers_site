import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Alert, Button, Input } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

export default function ForgotPassword() {
    const t = useT();
    const status = usePage<{ status?: string }>().props.status;
    const form = useForm({ email: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('password.email'));
    }

    return (
        <AuthLayout title={t('Reset your password')} description={t('Enter your email and we will send you a reset link.')}>
            {status && <Alert tone="success" className="mb-4">{status}</Alert>}
            <form onSubmit={submit} className="space-y-4">
                <Input label={t('Email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required autoFocus />
                <Button type="submit" className="w-full" loading={form.processing}>{t('Email reset link')}</Button>
            </form>
            <p className="mt-6 text-center text-sm"><Link href={route('login')} className="font-medium hover:underline">{t('Back to sign in')}</Link></p>
        </AuthLayout>
    );
}
