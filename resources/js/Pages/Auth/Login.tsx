import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, Checkbox, Input } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

export default function Login({ canResetPassword }: { canResetPassword: boolean }) {
    const t = useT();
    const form = useForm({ email: '', password: '', remember: false });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('login'), { onFinish: () => form.reset('password') });
    }

    return (
        <AuthLayout title={t('Sign in')} description={t('Welcome back. Sign in to your diary.')}>
            <form onSubmit={submit} className="space-y-4">
                <Input label={t('Email')} type="email" autoComplete="username" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required autoFocus />
                <Input label={t('Password')} type="password" autoComplete="current-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required />
                <div className="flex items-center justify-between">
                    <Checkbox label={t('Remember me')} checked={form.data.remember} onChange={(e) => form.setData('remember', e.target.checked)} />
                    {canResetPassword && (
                        <Link href={route('password.request')} className="text-sm font-medium text-navy-700 hover:underline dark:text-gold-300">
                            {t('Forgot password?')}
                        </Link>
                    )}
                </div>
                <Button type="submit" className="w-full" loading={form.processing}>
                    {t('Sign in')}
                </Button>
            </form>
            <div className="mt-6 grid gap-2 border-t border-navy-100 pt-5 text-center text-sm text-navy-600 dark:border-navy-800 dark:text-navy-300">
                <p>{t('New here?')}</p>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-medium">
                    <Link href={route('register', { type: 'lawyer' })} className="text-navy-900 hover:underline dark:text-gold-300">{t('Join as a Lawyer')}</Link>
                    <Link href={route('register', { type: 'firm' })} className="text-navy-900 hover:underline dark:text-gold-300">{t('Register a Law Firm')}</Link>
                    <Link href={route('register', { type: 'client' })} className="text-navy-900 hover:underline dark:text-gold-300">{t('I need a lawyer')}</Link>
                </div>
            </div>
        </AuthLayout>
    );
}
