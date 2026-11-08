import { useForm } from '@inertiajs/react';
import { Button, Card, CardBody, Input, Textarea } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';

export default function Contact({ canonical }: { canonical: string }) {
    const t = useT();
    const form = useForm({ name: '', email: '', phone: '', subject: '', body: '', website: '' });
    return (
        <PublicLayout seo={{ title: t('Contact us'), canonical }}>
            <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
                <h1 className="text-4xl font-semibold">{t('Contact us')}</h1>
                <p className="mt-2 text-navy-600 dark:text-navy-300">{t('Questions about the platform, verification or your account. We cannot give legal advice.')}</p>
                <Card className="mt-8">
                    <CardBody>
                        <form onSubmit={(e) => { e.preventDefault(); form.post(route('contact.submit'), { onSuccess: () => form.reset() }); }} className="grid gap-4 sm:grid-cols-2">
                            <Input label={t('Name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                            <Input label={t('Email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} required />
                            <Input label={t('Phone')} type="tel" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                            <Input label={t('Subject')} value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} error={form.errors.subject} required />
                            <Textarea wrapperClassName="sm:col-span-2" label={t('Message')} rows={5} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} required />
                            <input type="text" name="website" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
                            <div className="sm:col-span-2"><Button type="submit" loading={form.processing}>{t('Send message')}</Button></div>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </PublicLayout>
    );
}
