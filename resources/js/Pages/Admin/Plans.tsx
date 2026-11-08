import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, CardHeader, Checkbox, Input, Modal, PageHeader, Select, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option } from '@/types';

type Plan = { id: number; slug: string; name: string; name_ur: string | null; audience: string; description: string | null; price_monthly: number; price_yearly: number; trial_days: number; is_active: boolean; sort_order: number; features: Record<string, number | null> };

export default function Plans({ plans, features, subscriptions }: { plans: Plan[]; features: Option[]; subscriptions: any[] }) {
    const t = useT();
    const { locale } = useLocale();
    const [editing, setEditing] = useState<Plan | null | undefined>(undefined);
    return (
        <AppLayout title={t('Plans')} area="admin" wide>
            <PageHeader title={t('Plans & subscriptions')} description={t('Entitlements are configured here — never hardcoded. Empty limit = unlimited, 0 = not included.')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('New plan')}</Button>} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {plans.map((p) => <button key={p.id} type="button" onClick={() => setEditing(p)} className="rounded-card border border-navy-100 bg-white p-4 text-start hover:border-navy-300 dark:border-navy-800 dark:bg-navy-900"><p className="font-semibold">{p.name} {!p.is_active && <span className="text-xs text-red-600">({t('inactive')})</span>}</p><p className="text-sm">{formatMoney(p.price_monthly, locale)}/{t('mo')}</p><ul className="mt-2 space-y-0.5 text-xs text-navy-500">{features.map((f) => <li key={f.value}>{f.label}: {p.features[f.value] === null ? '∞' : p.features[f.value]}</li>)}</ul></button>)}
            </div>
            <Card className="mt-6">
                <CardHeader title={t('Recent subscriptions')} />
                <div className="overflow-x-auto"><table className="min-w-full text-sm"><tbody className="divide-y divide-navy-100 dark:divide-navy-800">{subscriptions.map((s) => <tr key={s.id}><td className="px-5 py-2">{s.organization}</td><td className="px-2 py-2">{s.plan}</td><td className="px-2 py-2"><StatusBadge value={s.status} label={s.status_label} /></td><td className="px-5 py-2 text-xs text-navy-500">{s.starts_at} → {s.ends_at ?? '∞'}</td></tr>)}</tbody></table></div>
            </Card>
            {editing !== undefined && <PlanDialog key={editing?.id ?? 'new'} plan={editing} features={features} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function PlanDialog({ plan, features, onClose }: { plan: Plan | null; features: Option[]; onClose: () => void }) {
    const t = useT();
    const form = useForm({ slug: plan?.slug ?? '', name: plan?.name ?? '', name_ur: plan?.name_ur ?? '', audience: plan?.audience ?? 'lawyer', description: plan?.description ?? '', price_monthly: String(plan?.price_monthly ?? 0), price_yearly: String(plan?.price_yearly ?? 0), trial_days: String(plan?.trial_days ?? 0), is_active: plan?.is_active ?? true, sort_order: String(plan?.sort_order ?? 0), features: Object.fromEntries(features.map((f) => [f.value, plan ? (plan.features[f.value] === null ? '' : String(plan.features[f.value])) : '0'])) as Record<string, string> });
    function save() {
        form.transform((d) => ({ ...d, features: Object.fromEntries(Object.entries(d.features).map(([k, v]) => [k, v === '' ? null : Number(v)])) }));
        plan ? form.put(route('admin.plans.update', plan.id), { onSuccess: onClose }) : form.post(route('admin.plans.store'), { onSuccess: onClose });
    }
    return (
        <Modal open onClose={onClose} size="lg" title={plan ? t('Edit plan') : t('New plan')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={save}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-3">
                <Input label={t('Slug')} value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} error={form.errors.slug} />
                <Input label={t('Name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                <Input label={t('Name (Urdu)')} dir="rtl" value={form.data.name_ur} onChange={(e) => form.setData('name_ur', e.target.value)} />
                <Select label={t('Audience')} value={form.data.audience} onChange={(e) => form.setData('audience', e.target.value)} options={[{ value: 'lawyer', label: t('Advocate') }, { value: 'firm', label: t('Law firm') }]} />
                <Input label={t('Monthly (PKR)')} type="number" value={form.data.price_monthly} onChange={(e) => form.setData('price_monthly', e.target.value)} />
                <Input label={t('Yearly (PKR)')} type="number" value={form.data.price_yearly} onChange={(e) => form.setData('price_yearly', e.target.value)} />
                <Input label={t('Trial days')} type="number" value={form.data.trial_days} onChange={(e) => form.setData('trial_days', e.target.value)} />
                <Input label={t('Sort order')} type="number" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} />
                <div className="flex items-end"><Checkbox label={t('Active')} checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} /></div>
                <Textarea wrapperClassName="sm:col-span-3" label={t('Description')} rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                {features.map((f) => <Input key={f.value} label={f.label} type="number" min={0} placeholder="∞" value={form.data.features[f.value]} onChange={(e) => form.setData('features', { ...form.data.features, [f.value]: e.target.value })} />)}
            </div>
        </Modal>
    );
}
