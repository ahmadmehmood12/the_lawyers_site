import { Link, useForm } from '@inertiajs/react';
import { Briefcase, Building2, User } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Checkbox, Input } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

type RegistrationType = 'lawyer' | 'firm' | 'client';

export default function Register({ type }: { type: RegistrationType }) {
    const t = useT();
    const form = useForm({ registration_type: type, name: '', email: '', phone: '', firm_name: '', password: '', password_confirmation: '', terms: false });
    const choices: { value: RegistrationType; label: string; hint: string; icon: typeof User }[] = [
        { value: 'lawyer', label: t('Advocate'), hint: t('Individual practice'), icon: Briefcase },
        { value: 'firm', label: t('Law Firm'), hint: t('Team & shared diary'), icon: Building2 },
        { value: 'client', label: t('Client'), hint: t('Find & work with a lawyer'), icon: User },
    ];

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('register'), { onFinish: () => form.reset('password', 'password_confirmation') });
    }

    return (
        <AuthLayout title={t('Create your account')} description={form.data.registration_type === 'client' ? t('Find verified advocates and follow your case online.') : t('Your court diary, cases and clients — in one secure place.')}>
            <div className="mb-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('Account type')}>
                {choices.map((choice) => (
                    <button
                        key={choice.value}
                        type="button"
                        role="radio"
                        aria-checked={form.data.registration_type === choice.value}
                        onClick={() => form.setData('registration_type', choice.value)}
                        className={cn(
                            'flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition-colors',
                            form.data.registration_type === choice.value ? 'border-navy-900 bg-navy-50 dark:border-gold-500 dark:bg-navy-800' : 'border-navy-100 hover:border-navy-300 dark:border-navy-700',
                        )}
                    >
                        <choice.icon className="size-5 text-navy-700 dark:text-gold-300" />
                        <span className="text-sm font-semibold">{choice.label}</span>
                        <span className="text-[11px] leading-tight text-navy-500">{choice.hint}</span>
                    </button>
                ))}
            </div>
            <form onSubmit={submit} className="space-y-4">
                {form.data.registration_type === 'firm' && (
                    <Input label={t('Firm name')} value={form.data.firm_name} onChange={(e) => form.setData('firm_name', e.target.value)} error={form.errors.firm_name} required />
                )}
                <Input label={form.data.registration_type === 'firm' ? t('Your full name') : t('Full name')} autoComplete="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                <Input label={t('Email')} type="email" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
                <Input label={t('Mobile number')} type="tel" autoComplete="tel" placeholder="03XX XXXXXXX" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} required />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label={t('Password')} type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required />
                    <Input label={t('Confirm password')} type="password" autoComplete="new-password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} required />
                </div>
                <Checkbox
                    label={
                        <>
                            {t('I agree to the')}{' '}
                            <Link href={route('terms')} className="font-medium underline">{t('Terms of Service')}</Link> {t('and')}{' '}
                            <Link href={route('privacy')} className="font-medium underline">{t('Privacy Policy')}</Link>
                        </>
                    }
                    checked={form.data.terms}
                    onChange={(e) => form.setData('terms', e.target.checked)}
                    error={form.errors.terms}
                />
                {form.errors.registration_type && <p className="text-sm text-red-600">{form.errors.registration_type}</p>}
                <Button type="submit" className="w-full" loading={form.processing}>
                    {t('Create account')}
                </Button>
            </form>
            <p className="mt-6 text-center text-sm text-navy-600 dark:text-navy-300">
                {t('Already have an account?')}{' '}
                <Link href={route('login')} className="font-medium text-navy-900 hover:underline dark:text-gold-300">{t('Sign in')}</Link>
            </p>
        </AuthLayout>
    );
}
