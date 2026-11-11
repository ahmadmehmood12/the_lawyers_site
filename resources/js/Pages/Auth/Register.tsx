import { Link, useForm } from '@inertiajs/react';
import { Briefcase, Building2, ChevronDown, Gift, TicketPercent, User } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Button, Checkbox, Input, Select } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

type RegistrationType = 'lawyer' | 'firm' | 'client';
type Option = { value: number; label: string };

export default function Register({ type, barCouncils }: { type: RegistrationType; barCouncils: Option[] }) {
    const t = useT();
    const form = useForm({
        registration_type: type,
        name: '',
        email: '',
        phone: '',
        firm_name: '',
        firm_registration_number: '',
        cnic: '',
        bar_council_id: '',
        enrollment_number: '',
        firm_invite_code: '',
        referral_code: '',
        coupon_code: '',
        password: '',
        password_confirmation: '',
        terms: false,
    });
    const choices: { value: RegistrationType; label: string; hint: string; icon: typeof User }[] = [
        { value: 'lawyer', label: t('Advocate'), hint: t('Individual practice'), icon: Briefcase },
        { value: 'firm', label: t('Law Firm'), hint: t('Team & shared diary'), icon: Building2 },
        { value: 'client', label: t('Client'), hint: t('Find & work with a lawyer'), icon: User },
    ];
    const professional = form.data.registration_type !== 'client';
    const [codes, setCodes] = useState({ referral: false, coupon: false, firm: false });

    function chooseType(value: RegistrationType) {
        form.setData((data) => ({
            ...data,
            registration_type: value,
            ...(value === 'client' ? { cnic: '', bar_council_id: '', enrollment_number: '', firm_name: '', firm_registration_number: '', firm_invite_code: '' } : {}),
            ...(value !== 'lawyer' ? { firm_invite_code: '' } : {}),
        }));
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('register'), { onFinish: () => form.reset('password', 'password_confirmation') });
    }

    return (
        <AuthLayout demo="case" wide={professional} title={t('Create your account')} description={form.data.registration_type === 'client' ? t('Find verified advocates and follow your case online.') : t('Your court diary, cases and clients — in one secure place.')}>
            <div className="mb-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('Account type')}>
                {choices.map((choice) => (
                    <button
                        key={choice.value}
                        type="button"
                        role="radio"
                        aria-checked={form.data.registration_type === choice.value}
                        onClick={() => chooseType(choice.value)}
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
                {/* 1. Personal / business information */}
                {form.data.registration_type === 'firm' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label={t('Firm name')} value={form.data.firm_name} onChange={(e) => form.setData('firm_name', e.target.value)} error={form.errors.firm_name} required />
                        <Input label={t('Firm registration number')} value={form.data.firm_registration_number} onChange={(e) => form.setData('firm_registration_number', e.target.value)} error={form.errors.firm_registration_number} required />
                    </div>
                )}
                <div className={cn('grid gap-4', professional && 'sm:grid-cols-2')}>
                    <Input wrapperClassName={professional ? 'sm:col-span-2' : undefined} label={form.data.registration_type === 'firm' ? t('Your full name') : t('Full name')} autoComplete="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                    <Input label={t('Email')} type="email" autoComplete="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
                    <Input label={t('Mobile number')} type="tel" autoComplete="tel" placeholder="03XX XXXXXXX" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} required />
                </div>

                {/* 2. Registration details */}

                {professional && (
                    <div className="space-y-4 rounded-lg border border-navy-100 p-4 dark:border-navy-700">
                        <p className="text-sm font-semibold text-navy-800 dark:text-navy-100">{t('Bar enrollment')}</p>
                        <p className="text-xs text-navy-500 dark:text-navy-400">
                            {t('Your CNIC, Bar Council and enrollment number are compulsory. They are checked by our verification team and are never shown publicly.')}
                        </p>
                        <Input
                            label={t('CNIC')}
                            inputMode="numeric"
                            placeholder="12345-1234567-1"
                            value={form.data.cnic}
                            onChange={(e) => form.setData('cnic', e.target.value)}
                            error={form.errors.cnic}
                            required
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select
                                label={t('Bar Council')}
                                options={barCouncils}
                                placeholder={t('Select your Bar Council')}
                                value={form.data.bar_council_id}
                                onChange={(e) => form.setData('bar_council_id', e.target.value)}
                                error={form.errors.bar_council_id}
                                required
                            />
                            <Input
                                label={t('Enrollment number')}
                                value={form.data.enrollment_number}
                                onChange={(e) => form.setData('enrollment_number', e.target.value)}
                                error={form.errors.enrollment_number}
                                hint={t('As printed on your Bar license.')}
                                required
                            />
                        </div>
                    </div>
                )}

                {/* 3-4. Password before the optional codes. */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label={t('Password')} type="password" autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} required />
                    <Input label={t('Confirm password')} type="password" autoComplete="new-password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} required />
                </div>

                {/* 5-7. Optional codes: each opens its own field when asked for. */}
                {professional && (
                    <div className="space-y-2">
                        <OptionalCode
                            icon={<Gift className="size-4" aria-hidden />}
                            question={t('Have a referral code?')}
                            open={codes.referral || !!form.errors.referral_code}
                            onToggle={() => setCodes((c) => ({ ...c, referral: !c.referral }))}
                        >
                            <Input label={t('Referral code')} placeholder="WD-REF-2026" value={form.data.referral_code} onChange={(e) => form.setData('referral_code', e.target.value.toUpperCase())} error={form.errors.referral_code} />
                        </OptionalCode>
                        <OptionalCode
                            icon={<TicketPercent className="size-4" aria-hidden />}
                            question={t('Have a coupon code?')}
                            open={codes.coupon || !!form.errors.coupon_code}
                            onToggle={() => setCodes((c) => ({ ...c, coupon: !c.coupon }))}
                        >
                            <Input label={t('Coupon code')} placeholder="WD-TRIAL-14" value={form.data.coupon_code} onChange={(e) => form.setData('coupon_code', e.target.value.toUpperCase())} error={form.errors.coupon_code} />
                        </OptionalCode>
                        {form.data.registration_type === 'lawyer' && (
                            <OptionalCode
                                icon={<Building2 className="size-4" aria-hidden />}
                                question={t('Joining an existing law firm?')}
                                open={codes.firm || !!form.errors.firm_invite_code}
                                onToggle={() => setCodes((c) => ({ ...c, firm: !c.firm }))}
                            >
                                <Input label={t('Firm invite code')} placeholder="WD-ABC123" value={form.data.firm_invite_code} onChange={(e) => form.setData('firm_invite_code', e.target.value.toUpperCase())} error={form.errors.firm_invite_code} hint={t('Enter the code your firm shared. Leave blank to start your own chambers.')} />
                            </OptionalCode>
                        )}
                    </div>
                )}

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

/** "Have a … code?" row that reveals its field on click. */
function OptionalCode({ icon, question, open, onToggle, children }: { icon: ReactNode; question: string; open: boolean; onToggle: () => void; children: ReactNode }) {
    return (
        <div className="rounded-lg border border-navy-100 dark:border-navy-700">
            <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between px-4 py-3 text-start text-sm font-medium text-navy-800 hover:bg-navy-50 dark:text-navy-100 dark:hover:bg-white/5">
                <span className="inline-flex items-center gap-2 text-navy-700 dark:text-navy-200">{icon}{question}</span>
                <ChevronDown className={cn('size-4 text-navy-400 transition-transform', open && 'rotate-180')} aria-hidden />
            </button>
            {open && <div className="border-t border-navy-100 px-4 py-4 dark:border-navy-700">{children}</div>}
        </div>
    );
}
