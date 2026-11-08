import { useForm } from '@inertiajs/react';
import { Alert, Button, Card, CardBody, CardHeader, DetailList, Input, PageHeader, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

export default function Settings({ settings, plans, env }: { settings: Record<string, string | null>; plans: SelectOption[]; env: Record<string, string | boolean> }) {
    const t = useT();
    const form = useForm({ default_plan: settings.default_plan ?? 'free', support_email: settings.support_email ?? '', ai_enabled: settings.ai_enabled ?? '0', ai_redact_personal_data: settings.ai_redact_personal_data ?? '1', reviews_require_moderation: settings.reviews_require_moderation ?? '1' });
    const yesNo = [{ value: '1', label: t('Yes') }, { value: '0', label: t('No') }];
    return (
        <AppLayout title={t('Settings')} area="admin">
            <PageHeader title={t('Platform settings')} />
            <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader title={t('General')} />
                    <CardBody className="space-y-4">
                        <Select label={t('Plan for new organizations')} value={form.data.default_plan} onChange={(e) => form.setData('default_plan', e.target.value)} options={plans} />
                        <Input label={t('Support email')} type="email" value={form.data.support_email} onChange={(e) => form.setData('support_email', e.target.value)} error={form.errors.support_email} />
                        <Select label={t('Enable AI assistant')} value={form.data.ai_enabled} onChange={(e) => form.setData('ai_enabled', e.target.value)} options={yesNo} hint={env.ai ? undefined : t('No AI provider key is configured on the server.')} />
                        <Select label={t('Mask personal data before sending to AI')} value={form.data.ai_redact_personal_data} onChange={(e) => form.setData('ai_redact_personal_data', e.target.value)} options={yesNo} />
                        {form.data.ai_redact_personal_data === '0' && <Alert tone="warning">{t('Disabling masking sends client names and identifiers to the AI provider.')}</Alert>}
                        <Button loading={form.processing} onClick={() => form.put(route('admin.settings.update'), { preserveScroll: true })}>{t('Save')}</Button>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Server configuration')} description={t('Secrets are set in the server environment, never in the database.')} />
                    <CardBody><DetailList columns={1} items={Object.entries(env).map(([k, v]) => ({ label: k, value: typeof v === 'boolean' ? (v ? t('Configured') : t('Awaiting credentials')) : String(v) }))} /></CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
