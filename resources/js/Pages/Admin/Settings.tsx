import { useForm, usePage } from '@inertiajs/react';
import { TypographySettings, type TypographyPayload } from '@/Components/domain/TypographySettings';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, DetailList, Input, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { AuthMedia, SharedProps } from '@/types';
import type { SelectOption } from '@/types/domain';

type WhatsAppSettings = {
    enabled: boolean;
    display_name: string;
    phone_number_id: string;
    api_version: string;
    configured: boolean;
    has_token: boolean;
    has_app_secret: boolean;
    has_verify_token: boolean;
    webhook_url: string;
};

type MailSettings = { mailer: string; scheme: string | null; host: string | null; port: string; username: string | null; from_address: string | null; from_name: string | null; has_password: boolean };

type Branding = {
    site_name: string;
    site_tagline: string;
    logo_url: string | null;
    favicon_url: string | null;
    social: Record<'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'x' | 'whatsapp', string>;
    contact: { email: string; phone: string; address: string };
};

const fileClasses = 'block w-full text-sm text-navy-700 file:me-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:bg-navy-200 dark:text-navy-200 dark:file:bg-navy-800 dark:file:text-navy-100';

export default function Settings({ settings, plans, env, whatsapp, mail, branding, authMedia, typography }: { settings: Record<string, string | null>; plans: SelectOption[]; env: Record<string, string | boolean>; whatsapp: WhatsAppSettings; mail: MailSettings; branding: Branding; authMedia: AuthMedia; typography: TypographyPayload }) {
    const t = useT();
    const { auth } = usePage<SharedProps>().props;
    const brand = useForm<{ site_name: string; site_tagline: string; logo: File | null; favicon: File | null; remove_logo: boolean; remove_favicon: boolean; contact_email: string; contact_phone: string; contact_address: string } & Record<`social_${keyof Branding['social']}`, string>>({
        site_name: branding.site_name,
        site_tagline: branding.site_tagline,
        logo: null,
        favicon: null,
        remove_logo: false,
        remove_favicon: false,
        social_facebook: branding.social.facebook,
        social_instagram: branding.social.instagram,
        social_youtube: branding.social.youtube,
        social_linkedin: branding.social.linkedin,
        social_x: branding.social.x,
        social_whatsapp: branding.social.whatsapp,
        contact_email: branding.contact.email,
        contact_phone: branding.contact.phone,
        contact_address: branding.contact.address,
    });
    const smtp = useForm({
        mail_mailer: mail.mailer ?? 'log',
        mail_scheme: mail.scheme ?? '',
        mail_host: mail.host ?? '',
        mail_port: mail.port ?? '',
        mail_username: mail.username ?? '',
        mail_password: '',
        mail_from_address: mail.from_address ?? '',
        mail_from_name: mail.from_name ?? '',
        clear_password: false,
    });
    const testMail = useForm({ to: auth.user?.email ?? '' });
    const media = useForm<{ enabled: string; mode: string; heading: string; description: string; heading_ur: string; description_ur: string; image: File | null; video: File | null; poster: File | null; remove_image: boolean; remove_video: boolean; remove_poster: boolean }>({
        enabled: authMedia.enabled ? '1' : '0',
        mode: authMedia.mode,
        heading: authMedia.heading,
        description: authMedia.description,
        heading_ur: authMedia.heading_ur,
        description_ur: authMedia.description_ur,
        image: null,
        video: null,
        poster: null,
        remove_image: false,
        remove_video: false,
        remove_poster: false,
    });
    const socialFields: { key: keyof Branding['social']; label: string; placeholder: string }[] = [
        { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
        { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
        { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@…' },
        { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…' },
        { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/…' },
        { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/92…' },
    ];
    const form = useForm({ default_plan: settings.default_plan ?? 'free', support_email: settings.support_email ?? '', ai_enabled: settings.ai_enabled ?? '0', ai_redact_personal_data: settings.ai_redact_personal_data ?? '1', reviews_require_moderation: settings.reviews_require_moderation ?? '1', site_theme: settings.site_theme ?? 'navy-gold' });
    const wa = useForm({
        enabled: whatsapp.enabled ? '1' : '0',
        display_name: whatsapp.display_name,
        phone_number_id: whatsapp.phone_number_id,
        api_version: whatsapp.api_version,
        token: '',
        app_secret: '',
        verify_token: '',
        clear_token: false,
        clear_app_secret: false,
        clear_verify_token: false,
    });
    const yesNo = [{ value: '1', label: t('Yes') }, { value: '0', label: t('No') }];
    const themes = [
        { value: 'navy-gold', label: t('Navy & gold'), hint: t('Classic authority palette (default).'), swatches: ['#0f1e36', '#cfa33b', '#faf8f3'] },
        { value: 'white-green', label: t('White & green'), hint: t('White paper, deep legal green and gold.'), swatches: ['#0f2c1e', '#cfa33b', '#ffffff'] },
    ];
    const savedSecret = (has: boolean) => (has ? t('A secret is saved. Leave blank to keep it.') : t('No secret saved yet.'));
    return (
        <AppLayout title={t('Settings')} area="admin" wide>
            <PageHeader title={t('Platform settings')} />
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader title={t('General')} />
                    <CardBody className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-navy-800 dark:text-navy-200">{t('Site theme')}</p>
                            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('Site theme')}>
                                {themes.map((theme) => (
                                    <button
                                        key={theme.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={form.data.site_theme === theme.value}
                                        onClick={() => form.setData('site_theme', theme.value)}
                                        className={`rounded-lg border p-3 text-start transition-colors ${form.data.site_theme === theme.value ? 'border-navy-900 ring-1 ring-navy-900 dark:border-gold-500 dark:ring-gold-500' : 'border-navy-100 hover:border-navy-300 dark:border-navy-700'}`}
                                    >
                                        <span className="flex gap-1" aria-hidden>
                                            {theme.swatches.map((color) => <span key={color} className="size-5 rounded-full border border-black/10" style={{ backgroundColor: color }} />)}
                                        </span>
                                        <span className="mt-2 block text-sm font-semibold">{theme.label}</span>
                                        <span className="block text-xs text-navy-500 dark:text-navy-400">{theme.hint}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Select label={t('Plan for new organizations')} value={form.data.default_plan} onChange={(e) => form.setData('default_plan', e.target.value)} options={plans} />
                        <Input label={t('Support email')} type="email" value={form.data.support_email} onChange={(e) => form.setData('support_email', e.target.value)} error={form.errors.support_email} />
                        <Select label={t('Enable AI assistant')} value={form.data.ai_enabled} onChange={(e) => form.setData('ai_enabled', e.target.value)} options={yesNo} hint={env.ai ? undefined : t('No AI provider key is configured on the server.')} />
                        <Select label={t('Mask personal data before sending to AI')} value={form.data.ai_redact_personal_data} onChange={(e) => form.setData('ai_redact_personal_data', e.target.value)} options={yesNo} />
                        {form.data.ai_redact_personal_data === '0' && <Alert tone="warning">{t('Disabling masking sends client names and identifiers to the AI provider.')}</Alert>}
                        <Button loading={form.processing} onClick={() => form.put(route('admin.settings.update'), { preserveScroll: true })}>{t('Save')}</Button>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Server configuration')} description={t('Non-secret values shown here come from the server environment.')} />
                    <CardBody><DetailList columns={1} items={Object.entries(env).map(([k, v]) => ({ label: k, value: typeof v === 'boolean' ? (v ? t('Configured') : t('Awaiting credentials')) : String(v) }))} /></CardBody>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader
                        title={t('WhatsApp Business alerts')}
                        description={t('Send hearing reminders and case alerts through the official WhatsApp Business Cloud API, branded with your site name.')}
                        actions={<Badge tone={whatsapp.configured ? 'green' : 'amber'}>{whatsapp.configured ? t('Configured') : t('Not configured')}</Badge>}
                    />
                    <CardBody className="space-y-4">
                        {!whatsapp.configured && <Alert tone="warning">{t('Until access token and phone number ID are saved, WhatsApp deliveries are recorded as “skipped” — never as sent.')}</Alert>}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label={t('Enable WhatsApp alerts')} value={wa.data.enabled} onChange={(e) => wa.setData('enabled', e.target.value)} options={yesNo} />
                            <Input label={t('Sender display name')} value={wa.data.display_name} onChange={(e) => wa.setData('display_name', e.target.value)} error={wa.errors.display_name} hint={t('Must match the display name approved in Meta Business Manager.')} />
                            <Input label={t('Phone number ID')} value={wa.data.phone_number_id} onChange={(e) => wa.setData('phone_number_id', e.target.value)} error={wa.errors.phone_number_id} hint={t('From Meta Business Suite → WhatsApp → API setup.')} />
                            <Input label={t('API version')} value={wa.data.api_version} onChange={(e) => wa.setData('api_version', e.target.value)} error={wa.errors.api_version} placeholder="v21.0" />
                            <Input label={t('Access token')} type="password" autoComplete="new-password" value={wa.data.token} onChange={(e) => wa.setData('token', e.target.value)} error={wa.errors.token} hint={savedSecret(whatsapp.has_token)} />
                            <Input label={t('App secret')} type="password" autoComplete="new-password" value={wa.data.app_secret} onChange={(e) => wa.setData('app_secret', e.target.value)} error={wa.errors.app_secret} hint={savedSecret(whatsapp.has_app_secret)} />
                            <Input label={t('Webhook verify token')} type="password" autoComplete="new-password" value={wa.data.verify_token} onChange={(e) => wa.setData('verify_token', e.target.value)} error={wa.errors.verify_token} hint={savedSecret(whatsapp.has_verify_token)} />
                            <div className="space-y-1">
                                <Input label={t('Webhook URL')} value={whatsapp.webhook_url} readOnly onFocus={(e) => e.currentTarget.select()} />
                                <p className="text-xs text-navy-500 dark:text-navy-400">{t('Add this callback URL in Meta, then subscribe to the “messages” field.')}</p>
                            </div>
                        </div>
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium text-navy-800 dark:text-navy-200">{t('Remove saved secrets')}</legend>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <Checkbox label={t('Access token')} checked={wa.data.clear_token} onChange={(e) => wa.setData('clear_token', e.target.checked)} />
                                <Checkbox label={t('App secret')} checked={wa.data.clear_app_secret} onChange={(e) => wa.setData('clear_app_secret', e.target.checked)} />
                                <Checkbox label={t('Verify token')} checked={wa.data.clear_verify_token} onChange={(e) => wa.setData('clear_verify_token', e.target.checked)} />
                            </div>
                        </fieldset>
                        <Button loading={wa.processing} onClick={() => wa.put(route('admin.whatsapp-settings.update'), { preserveScroll: true, onSuccess: () => wa.reset('token', 'app_secret', 'verify_token', 'clear_token', 'clear_app_secret', 'clear_verify_token') })}>{t('Save WhatsApp settings')}</Button>
                    </CardBody>
                </Card>

                <TypographySettings typography={typography} />

                <Card className="lg:col-span-2">
                    <CardHeader title={t('Branding and social links')} description={t('The site name, logo and favicon appear in the header, footer, emails and WhatsApp alerts. Social links show in the footer only when filled.')} />
                    <CardBody className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label={t('Website name')} required value={brand.data.site_name} onChange={(e) => brand.setData('site_name', e.target.value)} error={brand.errors.site_name} />
                            <Input label={t('Tagline')} value={brand.data.site_tagline} onChange={(e) => brand.setData('site_tagline', e.target.value)} error={brand.errors.site_tagline} hint={t('One line under the name in the footer.')} />
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-navy-800 dark:text-navy-200">{t('Logo')}</p>
                                {branding.logo_url && <img src={branding.logo_url} alt="" className="h-12 w-auto rounded border border-navy-100 bg-white p-1 dark:border-navy-700" />}
                                <input type="file" accept="image/png,image/jpeg,image/webp" className={fileClasses} onChange={(e) => brand.setData('logo', e.target.files?.[0] ?? null)} aria-label={t('Logo')} />
                                <p className="text-xs text-navy-500 dark:text-navy-400">{t('PNG, JPG or WebP, up to 2 MB. A square or wide mark works best.')}</p>
                                {brand.errors.logo && <p className="text-xs text-red-600">{brand.errors.logo}</p>}
                                {branding.logo_url && <Checkbox label={t('Remove the current logo')} checked={brand.data.remove_logo} onChange={(e) => brand.setData('remove_logo', e.target.checked)} />}
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-navy-800 dark:text-navy-200">{t('Favicon')}</p>
                                {branding.favicon_url && <img src={branding.favicon_url} alt="" className="size-10 rounded border border-navy-100 bg-white p-1 dark:border-navy-700" />}
                                <input type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,image/jpeg" className={fileClasses} onChange={(e) => brand.setData('favicon', e.target.files?.[0] ?? null)} aria-label={t('Favicon')} />
                                <p className="text-xs text-navy-500 dark:text-navy-400">{t('ICO or PNG, up to 512 KB. 64 × 64 pixels or larger.')}</p>
                                {brand.errors.favicon && <p className="text-xs text-red-600">{brand.errors.favicon}</p>}
                                {branding.favicon_url && <Checkbox label={t('Remove the current favicon')} checked={brand.data.remove_favicon} onChange={(e) => brand.setData('remove_favicon', e.target.checked)} />}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {socialFields.map((field) => (
                                <Input key={field.key} label={field.label} type="url" placeholder={field.placeholder} value={brand.data[`social_${field.key}`]} onChange={(e) => brand.setData(`social_${field.key}`, e.target.value)} error={brand.errors[`social_${field.key}`]} />
                            ))}
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">{t('Footer contact details')}</p>
                            <p className="text-xs text-navy-500">{t('Shown in the website footer under the social icons, one per line. Leave empty to hide.')}</p>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Input label={t('Email')} type="email" placeholder="info@example.pk" value={brand.data.contact_email} onChange={(e) => brand.setData('contact_email', e.target.value)} error={brand.errors.contact_email} />
                                <Input label={t('Phone')} type="tel" placeholder="+92 300 1234567" value={brand.data.contact_phone} onChange={(e) => brand.setData('contact_phone', e.target.value)} error={brand.errors.contact_phone} />
                                <Input label={t('Address')} placeholder={t('Office, street, city')} value={brand.data.contact_address} onChange={(e) => brand.setData('contact_address', e.target.value)} error={brand.errors.contact_address} />
                            </div>
                        </div>
                        <Button loading={brand.processing} onClick={() => brand.post(route('admin.branding-settings.update'), { preserveScroll: true, forceFormData: true, onSuccess: () => brand.reset('logo', 'favicon', 'remove_logo', 'remove_favicon') })}>{t('Save branding')}</Button>
                    </CardBody>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader title={t('Outgoing email (SMTP)')} description={t('Used for hearing reminders, receipts, feedback replies and account email. Blank fields fall back to the server environment.')} actions={<Badge tone={smtp.data.mail_mailer === 'log' ? 'amber' : 'green'}>{smtp.data.mail_mailer === 'log' ? t('Writing to log only') : smtp.data.mail_mailer.toUpperCase()}</Badge>} />
                    <CardBody className="space-y-4">
                        {smtp.data.mail_mailer === 'log' && <Alert tone="warning">{t('With the log mailer, emails are written to the server log and never delivered.')}</Alert>}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Select label={t('Mailer')} value={smtp.data.mail_mailer} onChange={(e) => smtp.setData('mail_mailer', e.target.value)} options={['smtp', 'log', 'sendmail', 'ses', 'postmark', 'resend', 'mailgun', 'failover', 'roundrobin', 'array'].map((v) => ({ value: v, label: v }))} error={smtp.errors.mail_mailer} />
                            <Select label={t('Scheme')} value={smtp.data.mail_scheme} onChange={(e) => smtp.setData('mail_scheme', e.target.value)} options={[{ value: '', label: t('Automatic') }, { value: 'smtp', label: 'smtp (STARTTLS)' }, { value: 'smtps', label: 'smtps (SSL/TLS)' }]} error={smtp.errors.mail_scheme} />
                            <Input label={t('Host')} value={smtp.data.mail_host} onChange={(e) => smtp.setData('mail_host', e.target.value)} placeholder="smtp.example.com" error={smtp.errors.mail_host} />
                            <Input label={t('Port')} inputMode="numeric" value={smtp.data.mail_port} onChange={(e) => smtp.setData('mail_port', e.target.value)} placeholder="587" error={smtp.errors.mail_port} />
                            <Input label={t('Username')} autoComplete="off" value={smtp.data.mail_username} onChange={(e) => smtp.setData('mail_username', e.target.value)} error={smtp.errors.mail_username} />
                            <Input label={t('Password')} type="password" autoComplete="new-password" value={smtp.data.mail_password} onChange={(e) => smtp.setData('mail_password', e.target.value)} error={smtp.errors.mail_password} hint={savedSecret(mail.has_password)} />
                            <Input label={t('From address')} type="email" value={smtp.data.mail_from_address} onChange={(e) => smtp.setData('mail_from_address', e.target.value)} placeholder="hello@example.com" error={smtp.errors.mail_from_address} />
                            <Input label={t('From name')} value={smtp.data.mail_from_name} onChange={(e) => smtp.setData('mail_from_name', e.target.value)} error={smtp.errors.mail_from_name} />
                        </div>
                        {mail.has_password && <Checkbox label={t('Remove the saved password')} checked={smtp.data.clear_password} onChange={(e) => smtp.setData('clear_password', e.target.checked)} />}
                        <div className="flex flex-wrap items-end gap-3">
                            <Button loading={smtp.processing} onClick={() => smtp.put(route('admin.mail-settings.update'), { preserveScroll: true, onSuccess: () => smtp.reset('mail_password', 'clear_password') })}>{t('Save mail settings')}</Button>
                            <div className="ms-auto flex flex-wrap items-end gap-2">
                                <Input label={t('Send a test to')} type="email" value={testMail.data.to} onChange={(e) => testMail.setData('to', e.target.value)} error={testMail.errors.to} wrapperClassName="min-w-64" />
                                <Button variant="secondary" loading={testMail.processing} onClick={() => testMail.post(route('admin.mail-settings.test'), { preserveScroll: true })}>{t('Send test email')}</Button>
                            </div>
                        </div>
                        <p className="text-xs text-navy-500 dark:text-navy-400">{t('Save first, then send a test. The test uses the saved settings.')}</p>
                    </CardBody>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Sign-in page')} description={t('The panel beside the sign-in and sign-up forms on large screens. Use a professional image, or a short looping video with no sound.')} />
                    <CardBody className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label={t('Show the media panel')} value={media.data.enabled} onChange={(e) => media.setData('enabled', e.target.value)} options={yesNo} />
                            <Select label={t('Media type')} value={media.data.mode} onChange={(e) => media.setData('mode', e.target.value)} options={[{ value: 'image', label: t('Image') }, { value: 'video', label: t('Video (muted, looping)') }]} error={media.errors.mode} />
                            <Input label={t('Heading')} value={media.data.heading} onChange={(e) => media.setData('heading', e.target.value)} error={media.errors.heading} maxLength={90} />
                            <Input label={t('Heading in Urdu')} dir="rtl" value={media.data.heading_ur} onChange={(e) => media.setData('heading_ur', e.target.value)} error={media.errors.heading_ur} />
                            <Textarea label={t('Description')} rows={2} value={media.data.description} onChange={(e) => media.setData('description', e.target.value)} error={media.errors.description} maxLength={240} />
                            <Textarea label={t('Description in Urdu')} dir="rtl" rows={2} value={media.data.description_ur} onChange={(e) => media.setData('description_ur', e.target.value)} error={media.errors.description_ur} />
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                            <MediaField label={t('Image')} hint={t('JPG, PNG or WebP, at least 800 × 600, up to 4 MB.')} current={authMedia.image_url} kind="image" accept="image/jpeg,image/png,image/webp" error={media.errors.image} onFile={(f) => media.setData('image', f)} remove={media.data.remove_image} onRemove={(v) => media.setData('remove_image', v)} />
                            <MediaField label={t('Video')} hint={t('MP4 or WebM, up to 20 MB. Keep it under 15 seconds, 720p and silent so it loads fast.')} current={authMedia.video_url} kind="video" accept="video/mp4,video/webm" error={media.errors.video} onFile={(f) => media.setData('video', f)} remove={media.data.remove_video} onRemove={(v) => media.setData('remove_video', v)} />
                            <MediaField label={t('Still fallback')} hint={t('Shown while the video loads, on phones, with reduced motion or data saver. Defaults to the image.')} current={authMedia.poster_url} kind="image" accept="image/jpeg,image/png,image/webp" error={media.errors.poster} onFile={(f) => media.setData('poster', f)} remove={media.data.remove_poster} onRemove={(v) => media.setData('remove_poster', v)} />
                        </div>
                        <p className="text-xs text-navy-500 dark:text-navy-400">{t('With nothing uploaded, the panel shows a real screenshot of the advocate dashboard.')}</p>
                        <Button loading={media.processing} onClick={() => media.post(route('admin.auth-media-settings.update'), { preserveScroll: true, forceFormData: true, onSuccess: () => media.reset('image', 'video', 'poster', 'remove_image', 'remove_video', 'remove_poster') })}>{t('Save sign-in page')}</Button>
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}

function MediaField({ label, hint, current, kind, accept, error, onFile, remove, onRemove }: { label: string; hint: string; current: string | null; kind: 'image' | 'video'; accept: string; error?: string; onFile: (file: File | null) => void; remove: boolean; onRemove: (value: boolean) => void }) {
    const t = useT();
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium text-navy-800 dark:text-navy-200">{label}</p>
            {current && (kind === 'video'
                ? <video src={current} className="aspect-video w-full rounded border border-navy-100 bg-navy-950 object-cover dark:border-navy-700" muted playsInline preload="metadata" controls />
                : <img src={current} alt="" className="aspect-video w-full rounded border border-navy-100 object-cover dark:border-navy-700" />)}
            <input type="file" accept={accept} className={fileClasses} aria-label={label} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-navy-500 dark:text-navy-400">{hint}</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {current && <Checkbox label={t('Remove')} checked={remove} onChange={(e) => onRemove(e.target.checked)} />}
        </div>
    );
}
