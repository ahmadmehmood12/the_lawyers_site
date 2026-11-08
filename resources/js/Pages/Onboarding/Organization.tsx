import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Alert, Button, Input, Select } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';

export default function OrganizationOnboarding({ isLawyer }: { isLawyer: boolean }) {
    const t = useT();
    const form = useForm({ type: 'solo', name: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('onboarding.organization.store'));
    }

    if (!isLawyer) {
        return (
            <AuthLayout title={t('No workspace yet')}>
                <Alert tone="info">{t('You are not a member of any chambers or firm. Ask your firm to send you an invitation.')}</Alert>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={t('Set up your practice')} description={t('Every case and client lives inside a practice. You can join firms later by invitation.')}>
            <form onSubmit={submit} className="space-y-4">
                <Select label={t('Practice type')} value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} options={[{ value: 'solo', label: t('Individual practice') }, { value: 'firm', label: t('Law firm') }]} />
                {form.data.type === 'firm' && <Input label={t('Firm name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />}
                <Button type="submit" className="w-full" loading={form.processing}>{t('Continue')}</Button>
            </form>
        </AuthLayout>
    );
}
