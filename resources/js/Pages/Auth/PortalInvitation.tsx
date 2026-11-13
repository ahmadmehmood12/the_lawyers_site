import { useForm } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Input } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

/** Client portal invitation: choose a password (Auth\PortalInvitationController). */
export default function PortalInvitation({ name, email, action }: { name: string; email: string; action: string }) {
    const t = useT();
    const form = useForm({ password: '', password_confirmation: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(action, { onFinish: () => form.reset('password', 'password_confirmation') });
    }

    return (
        <AuthLayout demo="phone" title={t('Welcome, :name', { name })} description={t('Choose a password to open your case portal.')}>
            <div className="mb-5 flex items-center gap-3 rounded-lg bg-navy-50 p-3 text-sm ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                <MailCheck className="size-5 shrink-0 text-gold-600" />
                <span className="min-w-0 truncate" dir="ltr">{email}</span>
            </div>
            <form onSubmit={submit} className="space-y-4">
                <Input label={t('Password')} type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required autoFocus />
                <Input label={t('Confirm password')} type="password" autoComplete="new-password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} required />
                <Button type="submit" className="w-full" loading={form.processing}>{t('Open my portal')}</Button>
            </form>
        </AuthLayout>
    );
}
