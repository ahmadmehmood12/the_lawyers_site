import { Link, router } from '@inertiajs/react';
import { Activity as ActivityIcon, Globe, KeyRound, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ActivityEntry } from '@/Components/domain/ActivityItem';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Pagination, Select, UserCell } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';

type Entry = ActivityEntry & { event: string; ip_address: string | null; device: string | null };
type Filters = { member?: string; log?: string; from?: string; to?: string; search?: string };

const logLabels: Record<string, string> = { cases: 'Cases', hearings: 'Hearings', finance: 'Billing', billing: 'Billing', clients: 'Clients', tasks: 'Tasks', documents: 'Documents', exports: 'Exports', drafts: 'Drafting', verification: 'Verification', auth: 'Sign in', appointments: 'Appointments', default: 'General' };

/**
 * Workspace, Activity: the firm's audit trail as a full-width table (when, who, what, area,
 * IP address and device). Owners and senior advocates see everyone; others see their own work.
 */
export default function Activity({ activities, scope, filters, members, logs, summary }: { activities: Paginated<Entry>; scope: 'firm' | 'mine'; filters: Filters; members: Option[]; logs: string[]; summary: { week: number; members: number; sign_ins: number; ips: number } }) {
    const t = useT();
    const { locale } = useLocale();
    const [search, setSearch] = useState(filters.search ?? '');
    const visit = (patch: Filters) => router.get(route('activity.index'), { ...filters, ...patch, page: undefined }, { preserveState: true, preserveScroll: true, replace: true, only: ['activities', 'filters'] });

    useEffect(() => {
        if ((filters.search ?? '') === search) return;
        const id = window.setTimeout(() => visit({ search: search || undefined }), 350);
        return () => window.clearTimeout(id);
    }, [search]);

    const tiles = [
        { label: t('Actions in the last 7 days'), value: summary.week, icon: ActivityIcon },
        { label: t('People active this week'), value: summary.members, icon: Users },
        { label: t('Sign ins today'), value: summary.sign_ins, icon: KeyRound },
        { label: t('Different IP addresses this week'), value: summary.ips, icon: Globe },
    ];
    const filtered = Object.values(filters).some(Boolean);

    return (
        <AppLayout title={t('Activity')} wide>
            <PageHeader title={t('Activity')} description={scope === 'firm' ? t('Everything your team did, newest first, with where each action came from.') : t('Your own actions and activity on the cases you can open.')} />

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <Card key={tile.label} className="flex items-center gap-3 p-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-gold-300"><tile.icon className="size-5" aria-hidden /></span>
                        <span className="min-w-0">
                            <span className="block text-2xl font-semibold tabular-nums">{tile.value}</span>
                            <span className="block truncate text-xs text-navy-500">{tile.label}</span>
                        </span>
                    </Card>
                ))}
            </div>

            <Card>
                <div className="grid gap-3 border-b border-navy-100 p-4 sm:grid-cols-2 lg:grid-cols-6 dark:border-navy-800">
                    <Input wrapperClassName="lg:col-span-2" type="search" aria-label={t('Search')} placeholder={t('Case title, reference or IP address')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    {scope === 'firm' && <Select aria-label={t('Member')} value={filters.member ?? ''} onChange={(e) => visit({ member: e.target.value || undefined })} options={members} placeholder={t('All members')} />}
                    <Select aria-label={t('Area')} value={filters.log ?? ''} onChange={(e) => visit({ log: e.target.value || undefined })} options={logs.map((l) => ({ value: l, label: t(logLabels[l] ?? l) }))} placeholder={t('All areas')} />
                    <Input type="date" aria-label={t('From')} value={filters.from ?? ''} onChange={(e) => visit({ from: e.target.value || undefined })} />
                    <Input type="date" aria-label={t('To')} value={filters.to ?? ''} onChange={(e) => visit({ to: e.target.value || undefined })} />
                </div>
                {filtered && <div className="flex justify-end border-b border-navy-100 px-4 py-2 dark:border-navy-800"><Button size="sm" variant="ghost" onClick={() => { setSearch(''); router.get(route('activity.index'), {}, { preserveScroll: true }); }}>{t('Clear filters')}</Button></div>}

                {activities.data.length === 0 ? (
                    <EmptyState title={filtered ? t('Nothing matches these filters') : t('No activity yet')} description={filtered ? t('Try a wider date range or another member.') : t('New cases, hearings, invoices and uploads will appear here.')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-sm">
                            <thead className="bg-navy-50/60 text-start text-xs text-navy-600 dark:bg-navy-800/40 dark:text-navy-300">
                                <tr>
                                    <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('When')}</th>
                                    <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('Member')}</th>
                                    <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('What happened')}</th>
                                    <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('Area')}</th>
                                    <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('IP address')}</th>
                                    <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('Device')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                                {activities.data.map((item) => (
                                    <tr key={item.id} className="align-top hover:bg-navy-50/50 dark:hover:bg-navy-800/30">
                                        <td className="whitespace-nowrap px-4 py-3 text-navy-600 tabular-nums dark:text-navy-300">{formatDateTime(item.created_at, locale)}</td>
                                        <td className="px-4 py-3"><UserCell name={item.actor} avatar={item.actor_avatar} /></td>
                                        <td className="px-4 py-3">{item.url ? <Link href={item.url} className="hover:underline">{item.sentence}</Link> : item.sentence}</td>
                                        <td className="px-4 py-3"><Badge tone={item.log === 'auth' ? 'blue' : 'neutral'}>{t(logLabels[item.log] ?? logLabels.default)}</Badge></td>
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{item.ip_address ?? <span className="font-sans text-navy-400">{item.actor === t('The system') ? t('System') : t('Not recorded')}</span>}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-xs text-navy-600 dark:text-navy-300">{item.device ?? ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination meta={activities} />
            </Card>
        </AppLayout>
    );
}
