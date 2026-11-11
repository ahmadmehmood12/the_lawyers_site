import { router, useForm } from '@inertiajs/react';
import { Building2, Check, CreditCard, Landmark, ReceiptText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/cn';

type Plan = {
    id: number;
    slug: string;
    name: string;
    audience: string | null;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
};

type Method = {
    id: number;
    key: string;
    name: string;
    kind: 'stripe' | 'manual';
    instructions: string | null;
    details: { label: string; value: string }[];
};

type Payment = {
    id: number;
    plan: string | null;
    method: string | null;
    billing_cycle: string;
    amount: string;
    currency: string;
    status: string;
    status_label: string;
    reference: string | null;
    admin_notes: string | null;
    created_at: string | null;
    paid_at: string | null;
};

type Props = {
    canManage: boolean;
    stripeConfigured: boolean;
    subscription: { plan: string | null; status: string | null; ends_at: string | null; trial_ends_at: string | null; billing_cycle: string | null };
    plans: Plan[];
    methods: Method[];
    payments: Payment[];
    currentPlan: string | null;
    defaultEmail: string;
};

export default function BillingIndex({ canManage, stripeConfigured, subscription, plans, methods, payments, currentPlan, defaultEmail }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const paidPlans = plans.filter((plan) => plan.price_monthly > 0 || plan.price_yearly > 0);
    const [planSlug, setPlanSlug] = useState(paidPlans.find((plan) => plan.slug === currentPlan)?.slug ?? paidPlans[0]?.slug ?? '');
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [methodId, setMethodId] = useState<number | null>(methods[0]?.id ?? null);
    const selectedPlan = paidPlans.find((plan) => plan.slug === planSlug) ?? null;
    const selectedMethod = methods.find((method) => method.id === methodId) ?? null;
    const amount = selectedPlan ? (cycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly) : 0;

    const manual = useForm<{ account_email: string; reference: string; notes: string; screenshot: File | null }>({
        account_email: defaultEmail,
        reference: '',
        notes: '',
        screenshot: null,
    });

    function startStripe() {
        if (!selectedPlan || !selectedMethod) return;
        router.post(route('billing.checkout'), { plan: selectedPlan.slug, billing_cycle: cycle, payment_method_id: selectedMethod.id });
    }

    function submitManual() {
        if (!selectedPlan || !selectedMethod) return;
        manual.transform((data) => ({
            plan: selectedPlan.slug,
            billing_cycle: cycle,
            payment_method_id: selectedMethod.id,
            account_email: data.account_email,
            reference: data.reference,
            notes: data.notes,
            screenshot: data.screenshot,
        }));
        manual.post(route('billing.manual'), { forceFormData: true, preserveScroll: true });
    }

    return (
        <AppLayout title={t('Billing')} wide>
            <PageHeader
                title={t('Billing & plans')}
                description={t('Buy or renew a plan with a card or a manual transfer. Manual payments are verified by our team.')}
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Choose a plan')} description={t('Yearly plans save compared with paying monthly.')} />
                    <CardBody className="space-y-5">
                        <div className="grid gap-3 md:grid-cols-2">
                            {paidPlans.map((plan) => (
                                <button
                                    key={plan.slug}
                                    type="button"
                                    onClick={() => setPlanSlug(plan.slug)}
                                    className={cn(
                                        'rounded-card border p-4 text-start transition-colors',
                                        planSlug === plan.slug
                                            ? 'border-navy-900 bg-navy-50 ring-2 ring-navy-900/10 dark:border-gold-500 dark:bg-navy-800'
                                            : 'border-navy-100 bg-white hover:border-navy-300 dark:border-navy-800 dark:bg-navy-900',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-navy-900 dark:text-white">{plan.name}</p>
                                            <p className="text-xs text-navy-500 dark:text-navy-400">{plan.audience === 'firm' ? t('Law firm') : t('Advocate')}</p>
                                        </div>
                                        {planSlug === plan.slug && <Check className="size-5 text-navy-900 dark:text-gold-400" />}
                                    </div>
                                    {plan.description && <p className="mt-2 line-clamp-2 text-xs text-navy-500 dark:text-navy-400">{plan.description}</p>}
                                    <p className="mt-3 text-lg font-semibold">
                                        {formatMoney(plan.price_monthly, locale)}
                                        <span className="text-xs font-normal text-navy-500">/{t('mo')}</span>
                                    </p>
                                    {plan.trial_days > 0 && <p className="mt-1 text-xs text-verdant-700 dark:text-verdant-400">{t(':days-day trial', { days: plan.trial_days })}</p>}
                                </button>
                            ))}
                        </div>

                        {paidPlans.length === 0 && <Alert tone="info">{t('No paid plans are available right now.')}</Alert>}

                        <div className="inline-flex rounded-lg border border-navy-200 p-1 dark:border-navy-700">
                            {(['monthly', 'yearly'] as const).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setCycle(option)}
                                    className={cn(
                                        'rounded-md px-4 py-1.5 text-sm font-medium',
                                        cycle === option ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-600 hover:bg-navy-50 dark:text-navy-300 dark:hover:bg-navy-800',
                                    )}
                                >
                                    {option === 'monthly' ? t('Monthly') : t('Yearly')}
                                </button>
                            ))}
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-medium text-navy-800 dark:text-navy-200">{t('Payment method')}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {methods.map((method) => {
                                    const disabled = method.kind === 'stripe' && !stripeConfigured;
                                    return (
                                        <button
                                            key={method.id}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => setMethodId(method.id)}
                                            className={cn(
                                                'flex items-start gap-3 rounded-lg border p-3 text-start disabled:cursor-not-allowed disabled:opacity-60',
                                                methodId === method.id
                                                    ? 'border-navy-900 bg-navy-50 ring-2 ring-navy-900/10 dark:border-gold-500 dark:bg-navy-800'
                                                    : 'border-navy-200 bg-white hover:border-navy-300 dark:border-navy-700 dark:bg-navy-900',
                                            )}
                                        >
                                            {method.kind === 'stripe' ? <CreditCard className="mt-0.5 size-5 shrink-0" /> : <Landmark className="mt-0.5 size-5 shrink-0" />}
                                            <span>
                                                <span className="block text-sm font-semibold">{method.name}</span>
                                                <span className="block text-xs text-navy-500 dark:text-navy-400">
                                                    {method.kind === 'stripe' ? (stripeConfigured ? t('Pay securely by card') : t('Not configured yet')) : t('Transfer and upload a screenshot')}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {methods.length === 0 && <Alert tone="info">{t('No payment methods are enabled. Please contact support.')}</Alert>}
                        </div>

                        {selectedMethod?.kind === 'stripe' && (
                            <div className="rounded-lg border border-navy-100 bg-navy-50/60 p-4 dark:border-navy-800 dark:bg-navy-800/40">
                                <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4" />{t('Secure card payment')}</p>
                                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">{selectedMethod.instructions}</p>
                                <Button className="mt-3" disabled={!canManage || !selectedPlan || !stripeConfigured} onClick={startStripe}>
                                    {t('Pay :amount with card', { amount: formatMoney(amount, locale) })}
                                </Button>
                            </div>
                        )}

                        {selectedMethod?.kind === 'manual' && (
                            <form
                                className="space-y-4 rounded-lg border border-navy-100 bg-navy-50/60 p-4 dark:border-navy-800 dark:bg-navy-800/40"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    submitManual();
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <ReceiptText className="size-4" />
                                    <p className="text-sm font-semibold">{t('Manual transfer details')}</p>
                                </div>
                                {selectedMethod.details.length > 0 ? (
                                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                                        {selectedMethod.details.map((row) => (
                                            <div key={row.label} className="rounded-md bg-white px-3 py-2 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-700">
                                                <dt className="text-xs text-navy-500 dark:text-navy-400">{row.label}</dt>
                                                <dd className="font-medium break-all">{row.value || '—'}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : (
                                    <Alert tone="warning">{t('Bank details have not been added yet. Please contact support.')}</Alert>
                                )}
                                {selectedMethod.instructions && <p className="text-xs text-navy-500 dark:text-navy-400">{selectedMethod.instructions}</p>}

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input label={t('Account email')} type="email" value={manual.data.account_email} onChange={(event) => manual.setData('account_email', event.target.value)} error={manual.errors.account_email} hint={t('The email on your account so we can match the payment.')} />
                                    <Input label={t('Payment reference')} value={manual.data.reference} onChange={(event) => manual.setData('reference', event.target.value)} error={manual.errors.reference} hint={t('Transaction ID or sender name.')} />
                                </div>
                                <Textarea label={t('Notes')} rows={2} value={manual.data.notes} onChange={(event) => manual.setData('notes', event.target.value)} error={manual.errors.notes} />
                                <div>
                                    <label className="block text-sm font-medium text-navy-800 dark:text-navy-200">{t('Payment screenshot')}</label>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(event) => manual.setData('screenshot', event.target.files?.[0] ?? null)}
                                        className="mt-1.5 block w-full text-sm text-navy-700 file:me-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:bg-navy-200 dark:text-navy-200 dark:file:bg-navy-800 dark:file:text-navy-100"
                                    />
                                    {manual.errors.screenshot && <p className="mt-1 text-xs font-medium text-red-600">{manual.errors.screenshot}</p>}
                                </div>
                                <Button type="submit" loading={manual.processing} disabled={!canManage || !selectedPlan || selectedMethod.details.length === 0 || !manual.data.screenshot}>
                                    {t('Submit payment for verification')}
                                </Button>
                                {!canManage && <p className="text-xs text-navy-500">{t('Only an organization owner or manager can buy a plan.')}</p>}
                            </form>
                        )}
                    </CardBody>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Current subscription')} />
                        <CardBody className="space-y-3 text-sm">
                            <p className="text-lg font-semibold">{subscription.plan ?? '—'} {subscription.status && <Badge>{subscription.status}</Badge>}</p>
                            {subscription.trial_ends_at && <p>{t('Trial ends :date', { date: formatDate(subscription.trial_ends_at, locale) })}</p>}
                            {subscription.ends_at && <p>{t('Renews / ends :date', { date: formatDate(subscription.ends_at, locale) })}</p>}
                            <p className="text-xs text-navy-500 dark:text-navy-400">{t('Existing records stay accessible even if a subscription ends.')}</p>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Renewals')} />
                        <CardBody className="space-y-3 text-sm text-navy-600 dark:text-navy-300">
                            <p>{t('For renewals, send payment screenshot and mention your existing account email. Write "Renewal" in the subject line and send email to info@pakistanlawbot.com to renew your subscription next month.')}</p>
                            <p className="flex items-start gap-2 rounded-md bg-verdant-50 p-3 text-xs text-verdant-800 dark:bg-verdant-950/40 dark:text-verdant-300">
                                <Check className="mt-0.5 size-4 shrink-0" />
                                {t('Your subscription will be activated or renewed manually after verifying your payment. This may take up to 24 hours.')}
                            </p>
                        </CardBody>
                    </Card>
                </div>

                <Card className="lg:col-span-3">
                    <CardHeader title={t('Recent payments')} description={t('Manual payments show as awaiting verification until our team approves them.')} />
                    <CardBody className="overflow-x-auto">
                        {payments.length === 0 ? (
                            <p className="py-4 text-sm text-navy-500">{t('No plan payments yet.')}</p>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead className="border-b border-navy-100 text-start text-xs text-navy-500 dark:border-navy-800">
                                    <tr>
                                        <th className="px-3 py-2 text-start font-semibold">{t('Plan')}</th>
                                        <th className="px-3 py-2 text-start font-semibold">{t('Method')}</th>
                                        <th className="px-3 py-2 text-start font-semibold">{t('Amount')}</th>
                                        <th className="px-3 py-2 text-start font-semibold">{t('Status')}</th>
                                        <th className="px-3 py-2 text-start font-semibold">{t('Submitted')}</th>
                                        <th className="px-3 py-2 text-start font-semibold">{t('Reference')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                                    {payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="px-3 py-2">{payment.plan} <span className="text-xs text-navy-500">({payment.billing_cycle})</span></td>
                                            <td className="px-3 py-2">{payment.method ?? '—'}</td>
                                            <td className="px-3 py-2">{formatMoney(Number(payment.amount), locale)}</td>
                                            <td className="px-3 py-2"><StatusBadge value={payment.status} label={payment.status_label} /></td>
                                            <td className="px-3 py-2 text-xs text-navy-500">{payment.created_at ? formatDate(payment.created_at, locale) : '—'}</td>
                                            <td className="px-3 py-2 text-xs text-navy-500">
                                                {payment.reference ?? '—'}
                                                {payment.admin_notes && <span className="mt-1 block text-red-600">{payment.admin_notes}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
