import { Link, router, useForm } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, CodeInput, useCooldown } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

/** Email verification by six-digit code (OneTimeCodeController::verifyEmail). */
export default function VerifyEmail({ email }: { email: string }) {
    const t = useT();
    const form = useForm({ code: '' });
    const cooldown = useCooldown(60);
    const [sending, setSending] = useState(false);

    function submit(event?: FormEvent, code = form.data.code) {
        event?.preventDefault();
        if (code.length !== 6 || form.processing) return;
        form.transform(() => ({ code }));
        form.post(route('verification.code'), { onError: () => form.setData('code', '') });
    }

    function resend() {
        router.post(route('verification.send'), {}, {
            preserveScroll: true,
            onStart: () => setSending(true),
            onFinish: () => setSending(false),
            onSuccess: () => { cooldown.restart(); form.setData('code', ''); form.clearErrors(); },
        });
    }

    return (
        <AuthLayout title={t('Verify your email')} description={t('Enter the 6-digit code we sent to your email address.')}>
            <div className="mb-5 flex items-center gap-3 rounded-lg bg-navy-50 p-3 text-sm ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                <MailCheck className="size-5 shrink-0 text-gold-600" />
                <span className="min-w-0 truncate">{t('Code sent to')} <strong dir="ltr">{email}</strong></span>
            </div>
            <form onSubmit={submit} className="space-y-5">
                <CodeInput value={form.data.code} onChange={(code) => form.setData('code', code)} onComplete={(code) => submit(undefined, code)} error={form.errors.code} disabled={form.processing} />
                <Button type="submit" className="w-full" loading={form.processing} disabled={form.data.code.length !== 6}>{t('Verify email')}</Button>
            </form>
            <div className="mt-5 flex flex-col items-center gap-3 text-sm">
                <p className="text-navy-600 dark:text-navy-300">
                    {t('Did not get it?')}{' '}
                    {cooldown.left > 0
                        ? <span className="tabular-nums">{t('Send again in')} {cooldown.left}s</span>
                        : <button type="button" onClick={resend} disabled={sending} className="font-semibold text-navy-900 hover:underline disabled:opacity-60 dark:text-white">{sending ? t('Sending…') : t('Send a new code')}</button>}
                </p>
                <Link href={route('logout')} method="post" as="button" className="text-navy-600 hover:underline dark:text-navy-300">{t('Sign out')}</Link>
            </div>
        </AuthLayout>
    );
}
