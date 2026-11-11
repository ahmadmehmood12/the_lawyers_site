import { Link, router, useForm } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, CodeInput, useCooldown } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

/** Step 2 of the code reset: check the code, then continue to Auth/ResetPassword. */
export default function ResetCode({ email }: { email: string }) {
    const t = useT();
    const form = useForm({ email, code: '' });
    const cooldown = useCooldown(60);
    const [sending, setSending] = useState(false);
    const [resendError, setResendError] = useState<string | null>(null);

    function submit(event?: FormEvent, code = form.data.code) {
        event?.preventDefault();
        if (code.length !== 6 || form.processing) return;
        form.transform(() => ({ email, code }));
        form.post(route('password.code.verify'), { onError: () => form.setData('code', '') });
    }

    function resend() {
        router.post(route('password.email'), { email }, {
            preserveScroll: true,
            onStart: () => { setSending(true); setResendError(null); },
            onFinish: () => setSending(false),
            onSuccess: () => { cooldown.restart(); form.setData('code', ''); form.clearErrors(); },
            onError: (errors) => setResendError(errors.email ?? null),
        });
    }

    return (
        <AuthLayout demo="phone" title={t('Enter your reset code')} description={t('Enter the 6-digit code we sent to your email address.')}>
            <div className="mb-5 flex items-center gap-3 rounded-lg bg-navy-50 p-3 text-sm ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                <MailCheck className="size-5 shrink-0 text-gold-600" />
                <span className="min-w-0 truncate">{t('Code sent to')} <strong dir="ltr">{email}</strong></span>
            </div>
            <form onSubmit={submit} className="space-y-5">
                <CodeInput value={form.data.code} onChange={(code) => form.setData('code', code)} onComplete={(code) => submit(undefined, code)} error={form.errors.code ?? form.errors.email} disabled={form.processing} />
                <Button type="submit" className="w-full" loading={form.processing} disabled={form.data.code.length !== 6}>{t('Continue')}</Button>
            </form>
            <div className="mt-5 flex flex-col items-center gap-3 text-sm">
                <p className="text-navy-600 dark:text-navy-300">
                    {t('Did not get it?')}{' '}
                    {cooldown.left > 0
                        ? <span className="tabular-nums">{t('Send again in')} {cooldown.left}s</span>
                        : <button type="button" onClick={resend} disabled={sending} className="font-semibold text-navy-900 hover:underline disabled:opacity-60 dark:text-white">{sending ? t('Sending…') : t('Send a new code')}</button>}
                </p>
                {resendError && <p className="text-red-600 dark:text-red-400">{resendError}</p>}
                <Link href={route('password.request')} className="text-navy-600 hover:underline dark:text-navy-300">{t('Use a different email')}</Link>
            </div>
        </AuthLayout>
    );
}
