import { Link, useForm, usePage } from '@inertiajs/react';
import { Alert, Button } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

export default function VerifyEmail() {
    const t = useT();
    const status = usePage<{ status?: string }>().props.status;
    const form = useForm({});

    return (
        <AuthLayout title={t('Verify your email')} description={t('We sent a verification link to your email address. Click it to continue.')}>
            {status === 'verification-link-sent' && <Alert tone="success" className="mb-4">{t('A new verification link has been sent.')}</Alert>}
            <div className="flex flex-col gap-3">
                <Button loading={form.processing} onClick={() => form.post(route('verification.send'))}>{t('Resend verification email')}</Button>
                <Link href={route('logout')} method="post" as="button" className="text-sm text-navy-600 hover:underline">{t('Sign out')}</Link>
            </div>
        </AuthLayout>
    );
}
