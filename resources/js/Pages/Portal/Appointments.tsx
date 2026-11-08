import { CalendarClock, Video } from 'lucide-react';
import { Button, Card, ConfirmAction, EmptyState, LinkButton, PageHeader, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

export default function PortalAppointments({ appointments }: { appointments: { id: number; starts_at: string; status: string; status_label: string; mode: string; lawyer: string; meeting_link: string | null; cancellable: boolean }[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Appointments')} area="portal">
            <PageHeader title={t('Appointments')} actions={<LinkButton href={route('lawyers.index')} variant="secondary">{t('Book a consultation')}</LinkButton>} />
            <Card>
                {appointments.length === 0 ? <EmptyState icon={<CalendarClock className="size-5" />} title={t('No appointments')} /> : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {appointments.map((a) => (
                            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                                <div><p className="font-medium">{formatDateTime(a.starts_at, locale)}</p><p className="text-xs text-navy-500">{a.lawyer}, {a.mode}</p>{a.meeting_link && <a href={a.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline"><Video className="size-3.5" />{t('Join meeting')}</a>}</div>
                                <div className="flex items-center gap-2"><StatusBadge value={a.status} label={a.status_label} />{a.cancellable && <ConfirmAction href={route('portal.appointments.cancel', a.id)} reasonField="reason" title={t('Cancel appointment?')} trigger={(open) => <Button size="sm" variant="ghost" onClick={open}>{t('Cancel')}</Button>} />}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </AppLayout>
    );
}
