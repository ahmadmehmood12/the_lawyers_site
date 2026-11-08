import { ActivityItem, type ActivityEntry } from '@/Components/domain/ActivityItem';
import { Card, EmptyState, PageHeader, Pagination } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

export default function Activity({ activities, scope }: { activities: Paginated<ActivityEntry>; scope: 'firm' | 'mine' }) {
    const t = useT();

    return (
        <AppLayout title={t('Activity')}>
            <PageHeader
                title={t('Activity')}
                description={scope === 'firm' ? t('Everything your team did, newest first.') : t('Your own actions and activity on the cases you can open.')}
            />
            <Card className="max-w-3xl">
                {activities.data.length === 0 ? (
                    <EmptyState title={t('No activity yet')} description={t('New cases, hearings, invoices and uploads will appear here.')} />
                ) : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {activities.data.map((item) => (
                            <li key={item.id} className="px-5 py-3.5"><ActivityItem item={item} /></li>
                        ))}
                    </ul>
                )}
                <Pagination meta={activities} />
            </Card>
        </AppLayout>
    );
}
