import { Link, router, useForm } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, EmptyState, PageHeader, Pagination } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';

type Item = { id: string; data: { title: string; body: string; url?: string }; read_at: string | null; created_at: string };

export default function NotificationsPage({ notifications, preferences, events, channels, area }: { notifications: Paginated<Item>; preferences: { event: string; channel: string; enabled: boolean }[]; events: string[]; channels: Option[]; area: 'workspace' | 'portal' | 'admin' }) {
    const t = useT();
    const { locale } = useLocale();
    const defaults: Record<string, boolean> = { in_app: true, email: true, whatsapp: false, sms: false };
    const usable = channels.filter((c) => c.value !== 'sms');
    const form = useForm({ preferences: events.flatMap((event) => usable.map((c) => ({ event, channel: c.value, enabled: preferences.find((p) => p.event === event && p.channel === c.value)?.enabled ?? defaults[c.value] }))) });
    const toggle = (event: string, channel: string) => form.setData('preferences', form.data.preferences.map((p) => (p.event === event && p.channel === channel ? { ...p, enabled: !p.enabled } : p)));

    return (
        <AppLayout title={t('Notifications')} area={area}>
            <PageHeader title={t('Notifications')} actions={<Button variant="secondary" icon={<CheckCheck className="size-4" />} onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true })}>{t('Mark all read')}</Button>} />
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    {notifications.data.length === 0 ? <EmptyState icon={<Bell className="size-5" />} title={t('You are all caught up')} /> : (
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {notifications.data.map((n) => (
                                <li key={n.id}>
                                    <Link href={route('notifications.read', n.id)} className={cn('block px-5 py-3 hover:bg-navy-50 dark:hover:bg-navy-800', !n.read_at && 'bg-gold-50/60 dark:bg-gold-700/10')}>
                                        <p className={cn('text-sm', !n.read_at && 'font-semibold')}>{n.data.title}</p>
                                        <p className="text-sm text-navy-600 dark:text-navy-300">{n.data.body}</p>
                                        <p className="text-xs text-navy-500">{formatDateTime(n.created_at, locale)}</p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Pagination meta={notifications} />
                </Card>
                <Card>
                    <CardHeader title={t('Preferences')} description={t('WhatsApp is off until you turn it on — this records your consent.')} />
                    <CardBody>
                        <table className="w-full text-sm">
                            <thead><tr><th />{usable.map((c) => <th key={c.value} className="px-1 pb-2 text-xs font-medium text-navy-500">{c.label}</th>)}</tr></thead>
                            <tbody>
                                {events.map((event) => (
                                    <tr key={event}>
                                        <td className="py-1.5 pe-2">{t(`event.${event}`)}</td>
                                        {usable.map((c) => <td key={c.value} className="text-center"><input type="checkbox" aria-label={`${t(`event.${event}`)} ${c.label}`} className="size-4 accent-navy-900" checked={form.data.preferences.find((p) => p.event === event && p.channel === c.value)?.enabled ?? false} onChange={() => toggle(event, c.value)} /></td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Button className="mt-4 w-full" loading={form.processing} onClick={() => form.put(route('notifications.preferences'), { preserveScroll: true })}>{t('Save preferences')}</Button>
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
