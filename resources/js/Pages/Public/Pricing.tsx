import { Check } from 'lucide-react';
import { useState } from 'react';
import { LinkButton, Tabs } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Plan = { slug: string; name: string; description: string | null; audience: string; price_monthly: number; price_yearly: number; trial_days: number; features: { key: string; label: string; limit: number | null }[] };

export default function Pricing({ plans, canonical }: { plans: Plan[]; canonical: string }) {
    const t = useT();
    const { locale } = useLocale();
    const [cycle, setCycle] = useState('monthly');
    return (
        <PublicLayout seo={{ title: t('Pricing'), description: t('Plans for individual advocates and law firms.'), canonical }}>
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                <div className="mb-8 text-center"><h1 className="text-4xl font-semibold">{t('Simple plans for every practice')}</h1><p className="mt-2 text-navy-600 dark:text-navy-300">{t('Your records stay yours — they remain accessible even if you stop paying.')}</p></div>
                <div className="mb-8 flex justify-center"><Tabs className="border-0" active={cycle} onChange={setCycle} tabs={[{ key: 'monthly', label: t('Monthly') }, { key: 'yearly', label: t('Yearly') }]} /></div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {plans.map((p) => {
                        const featured = p.slug === 'professional';
                        const price = cycle === 'yearly' ? p.price_yearly : p.price_monthly;
                        return (
                            <div key={p.slug} className={cn('flex flex-col rounded-card border bg-white p-5 dark:bg-navy-900', featured ? 'border-gold-500 shadow-pop' : 'border-navy-100 dark:border-navy-800')}>
                                <p className="font-serif text-xl font-semibold">{p.name}</p>
                                <p className="mt-1 min-h-10 text-sm text-navy-600 dark:text-navy-300">{p.description}</p>
                                <p className="mt-4 text-3xl font-semibold">{price ? formatMoney(price, locale) : t('Free')}{price > 0 && <span className="text-sm font-normal text-navy-500">/{cycle === 'yearly' ? t('yr') : t('mo')}</span>}</p>
                                {p.trial_days > 0 && price > 0 && <p className="text-xs text-verdant-700">{t(':count-day free trial', { count: p.trial_days })}</p>}
                                <ul className="mt-5 space-y-2 text-sm">
                                    {p.features.filter((f) => f.limit !== 0).map((f) => <li key={f.key} className="flex gap-2"><Check className="size-4 shrink-0 text-verdant-600" />{f.label}{f.limit !== null && ['max_active_cases', 'max_clients', 'max_team_members', 'storage_mb', 'whatsapp_reminders', 'ai_assistant'].includes(f.key) ? `: ${f.limit.toLocaleString()}` : ''}</li>)}
                                </ul>
                                <div className="mt-auto pt-6"><LinkButton href={route('register', { type: p.audience === 'firm' ? 'firm' : 'lawyer' })} variant={featured ? 'gold' : 'secondary'} className="w-full">{t('Get started')}</LinkButton></div>
                            </div>
                        );
                    })}
                </div>
                <p className="mt-6 text-center text-xs text-navy-500">{t('Prices in PKR. Paid upgrades are activated after payment is confirmed by our team.')}</p>
            </div>
        </PublicLayout>
    );
}
