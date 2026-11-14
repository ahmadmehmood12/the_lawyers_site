import { router, useForm } from '@inertiajs/react';
import { CheckCircle2, Copy, PlugZap, Radio } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, Input, Select } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

export type WhatsAppSettings = {
    enabled: boolean;
    provider: 'meta' | 'green_api';
    display_name: string;
    configured: boolean;
    meta: { configured: boolean; phone_number_id: string; api_version: string; has_token: boolean; has_app_secret: boolean; has_verify_token: boolean; webhook_url: string };
    green_api: { configured: boolean; api_url: string; id_instance: string; has_token: boolean; has_webhook_token: boolean; webhook_url: string };
};

/**
 * Admin, Settings, WhatsApp (PlatformController::saveWhatsAppSettings). One active provider at a time;
 * credentials for both are kept. Secrets are write only: the page only learns whether one is saved.
 */
export function WhatsAppSettingsPanel({ whatsapp }: { whatsapp: WhatsAppSettings }) {
    const t = useT();
    const form = useForm({
        enabled: whatsapp.enabled ? '1' : '0',
        provider: whatsapp.provider,
        display_name: whatsapp.display_name,
        phone_number_id: whatsapp.meta.phone_number_id,
        api_version: whatsapp.meta.api_version,
        token: '', app_secret: '', verify_token: '',
        clear_token: false, clear_app_secret: false, clear_verify_token: false,
        green_api_url: whatsapp.green_api.api_url,
        green_api_id_instance: whatsapp.green_api.id_instance,
        green_api_token: '', green_api_webhook_token: '',
        clear_green_api_token: false, clear_green_api_webhook_token: false,
    });
    const [testing, setTesting] = useState<string | null>(null);
    const saved = (has: boolean) => (has ? t('Saved. Leave blank to keep it.') : t('Not saved yet.'));
    const secrets = ['token', 'app_secret', 'verify_token', 'green_api_token', 'green_api_webhook_token', 'clear_token', 'clear_app_secret', 'clear_verify_token', 'clear_green_api_token', 'clear_green_api_webhook_token'] as const;
    const save = () => form.put(route('admin.whatsapp-settings.update'), { preserveScroll: true, onSuccess: () => form.reset(...secrets) });
    const test = (provider: 'meta' | 'green_api') => router.post(route('admin.whatsapp-settings.test'), { provider }, { preserveScroll: true, onStart: () => setTesting(provider), onFinish: () => setTesting(null) });

    const providers = [
        { key: 'meta' as const, title: 'Meta WhatsApp Cloud API', text: t('Official API. Needs a Meta Business account and templates approved by Meta.'), configured: whatsapp.meta.configured },
        { key: 'green_api' as const, title: 'Green-API', text: t('Sends from a linked WhatsApp number. Uses your own template text; no Meta approval step.'), configured: whatsapp.green_api.configured },
    ];

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader title={t('WhatsApp alerts')} description={t('Hearing reminders, appointment updates and other alerts. Messages go only to people who agreed to WhatsApp, through the active provider.')}
                    actions={<Badge tone={whatsapp.configured ? 'green' : 'amber'}>{whatsapp.configured ? t('Ready to send') : t('Not sending')}</Badge>} />
                <CardBody className="space-y-5">
                    {!whatsapp.configured && <Alert tone="warning">{t('Until the active provider is configured, WhatsApp deliveries are recorded as skipped, never as sent.')}</Alert>}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select label={t('WhatsApp alerts')} value={form.data.enabled} onChange={(e) => form.setData('enabled', e.target.value)} options={[{ value: '1', label: t('On') }, { value: '0', label: t('Off') }]} />
                        <Input label={t('Sender display name')} value={form.data.display_name} onChange={(e) => form.setData('display_name', e.target.value)} error={form.errors.display_name} hint={t('Used in message text and, for Meta, must match the approved display name.')} />
                    </div>
                    <fieldset>
                        <legend className="mb-2 text-sm font-medium">{t('Active provider')}</legend>
                        <div className="grid gap-3 md:grid-cols-2" role="radiogroup">
                            {providers.map((p) => (
                                <button key={p.key} type="button" role="radio" aria-checked={form.data.provider === p.key} onClick={() => form.setData('provider', p.key)}
                                    className={cn('flex items-start gap-3 rounded-lg border p-4 text-start transition', form.data.provider === p.key ? 'border-navy-900 ring-1 ring-navy-900 dark:border-gold-400 dark:ring-gold-400' : 'border-navy-200 hover:border-navy-300 dark:border-navy-700')}>
                                    <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2', form.data.provider === p.key ? 'border-navy-900 dark:border-gold-400' : 'border-navy-300')}>
                                        {form.data.provider === p.key && <span className="size-2.5 rounded-full bg-navy-900 dark:bg-gold-400" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="flex flex-wrap items-center gap-2 font-semibold">{p.title}{p.configured ? <Badge tone="green">{t('Credentials saved')}</Badge> : <Badge tone="amber">{t('Needs credentials')}</Badge>}{whatsapp.provider === p.key && <Badge tone="navy">{t('Active now')}</Badge>}</span>
                                        <span className="mt-1 block text-sm text-navy-600 dark:text-navy-300">{p.text}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        {form.errors.provider && <p className="mt-2 text-sm text-red-600">{form.errors.provider}</p>}
                        {form.data.provider !== whatsapp.provider && <p className="mt-2 text-sm text-gold-700 dark:text-gold-300">{t('Saving switches all WhatsApp alerts to this provider. Messages already sent are never sent again.')}</p>}
                    </fieldset>
                </CardBody>
            </Card>

            <ProviderCard title="Meta WhatsApp Cloud API" icon={<CheckCircle2 className="size-4" />} configured={whatsapp.meta.configured} active={whatsapp.provider === 'meta'}
                onTest={() => test('meta')} testing={testing === 'meta'}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label={t('Phone number ID')} value={form.data.phone_number_id} onChange={(e) => form.setData('phone_number_id', e.target.value)} error={form.errors.phone_number_id} hint={t('Meta Business Suite, WhatsApp, API setup.')} />
                    <Input label={t('API version')} value={form.data.api_version} onChange={(e) => form.setData('api_version', e.target.value)} error={form.errors.api_version} placeholder="v21.0" />
                    <Input label={t('Access token')} type="password" autoComplete="new-password" value={form.data.token} onChange={(e) => form.setData('token', e.target.value)} error={form.errors.token} hint={saved(whatsapp.meta.has_token)} />
                    <Input label={t('App secret')} type="password" autoComplete="new-password" value={form.data.app_secret} onChange={(e) => form.setData('app_secret', e.target.value)} error={form.errors.app_secret} hint={saved(whatsapp.meta.has_app_secret)} />
                    <Input label={t('Webhook verify token')} type="password" autoComplete="new-password" value={form.data.verify_token} onChange={(e) => form.setData('verify_token', e.target.value)} error={form.errors.verify_token} hint={saved(whatsapp.meta.has_verify_token)} />
                    <CopyField label={t('Webhook URL')} value={whatsapp.meta.webhook_url} hint={t('Add it in Meta and subscribe to the “messages” field.')} />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-navy-500">{t('Remove saved')}:</span>
                    <Checkbox label={t('Access token')} checked={form.data.clear_token} onChange={(e) => form.setData('clear_token', e.target.checked)} />
                    <Checkbox label={t('App secret')} checked={form.data.clear_app_secret} onChange={(e) => form.setData('clear_app_secret', e.target.checked)} />
                    <Checkbox label={t('Verify token')} checked={form.data.clear_verify_token} onChange={(e) => form.setData('clear_verify_token', e.target.checked)} />
                </div>
            </ProviderCard>

            <ProviderCard title="Green-API" icon={<Radio className="size-4" />} configured={whatsapp.green_api.configured} active={whatsapp.provider === 'green_api'}
                onTest={() => test('green_api')} testing={testing === 'green_api'}>
                <Alert tone="info">{t('In the Green-API console: link the WhatsApp phone by QR code, set the webhook URL below with the same webhook token, and turn on incoming and outgoing message notifications. Every template is sent as its own text, so keep template wording professional.')}</Alert>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label={t('API URL')} value={form.data.green_api_url} onChange={(e) => form.setData('green_api_url', e.target.value)} error={form.errors.green_api_url} hint={t('Shown as apiUrl in the console, for example https://7103.api.greenapi.com.')} />
                    <Input label={t('Instance ID')} value={form.data.green_api_id_instance} onChange={(e) => form.setData('green_api_id_instance', e.target.value)} error={form.errors.green_api_id_instance} hint={t('idInstance from the console.')} />
                    <Input label={t('API token')} type="password" autoComplete="new-password" value={form.data.green_api_token} onChange={(e) => form.setData('green_api_token', e.target.value)} error={form.errors.green_api_token} hint={saved(whatsapp.green_api.has_token)} />
                    <Input label={t('Webhook token')} type="password" autoComplete="new-password" value={form.data.green_api_webhook_token} onChange={(e) => form.setData('green_api_webhook_token', e.target.value)} error={form.errors.green_api_webhook_token} hint={saved(whatsapp.green_api.has_webhook_token)} />
                    <CopyField label={t('Webhook URL')} value={whatsapp.green_api.webhook_url} hint={t('Paste into webhookUrl; put the webhook token in webhookUrlToken.')} />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-navy-500">{t('Remove saved')}:</span>
                    <Checkbox label={t('API token')} checked={form.data.clear_green_api_token} onChange={(e) => form.setData('clear_green_api_token', e.target.checked)} />
                    <Checkbox label={t('Webhook token')} checked={form.data.clear_green_api_webhook_token} onChange={(e) => form.setData('clear_green_api_webhook_token', e.target.checked)} />
                </div>
            </ProviderCard>

            <div className="flex justify-end">
                <Button size="lg" loading={form.processing} onClick={save}>{t('Save WhatsApp settings')}</Button>
            </div>
        </div>
    );
}

function ProviderCard({ title, icon, configured, active, onTest, testing, children }: { title: string; icon: ReactNode; configured: boolean; active: boolean; onTest: () => void; testing: boolean; children: ReactNode }) {
    const t = useT();
    return (
        <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2">{icon}{title}{active && <Badge tone="navy">{t('Active')}</Badge>}</span>}
                actions={<Button variant="secondary" size="sm" icon={<PlugZap className="size-4" />} loading={testing} disabled={!configured} onClick={onTest}>{t('Test connection')}</Button>} />
            <CardBody className="space-y-4">
                {!configured && <p className="text-sm text-navy-500">{t('Save the credentials first, then test the connection.')}</p>}
                {children}
            </CardBody>
        </Card>
    );
}

function CopyField({ label, value, hint }: { label: string; value: string; hint: string }) {
    const t = useT();
    const [copied, setCopied] = useState(false);
    return (
        <div className="space-y-1">
            <div className="flex items-end gap-2">
                <Input wrapperClassName="flex-1" label={label} value={value} readOnly onFocus={(e) => e.currentTarget.select()} />
                <Button variant="ghost" icon={<Copy className="size-4" />} aria-label={t('Copy')} onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? t('Copied') : ''}</Button>
            </div>
            <p className="text-xs text-navy-500 dark:text-navy-400">{hint}</p>
        </div>
    );
}
