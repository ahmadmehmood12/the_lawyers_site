import { Link, router } from '@inertiajs/react';
import { CheckCircle2, Circle, ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { TaskDialog } from '@/Components/domain/TaskDialog';
import { Button, Card, EmptyState, PageHeader, Pagination, Select, StatusBadge, Tabs } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';
import type { SelectOption, TaskItem } from '@/types/domain';

export default function TasksIndex({ tasks, filters, options, canManage }: { tasks: Paginated<TaskItem>; filters: Record<string, string>; options: { members: SelectOption[]; priorities: Option[]; statuses: Option[]; cases: SelectOption[] }; canManage: boolean }) {
    const t = useT();
    const { locale } = useLocale();
    const [editing, setEditing] = useState<TaskItem | null | undefined>(undefined);
    const visit = (p: Record<string, string | undefined>) => router.get(route('tasks.index'), { ...filters, ...p }, { preserveState: true, replace: true });

    return (
        <AppLayout title={t('Tasks')}>
            <PageHeader title={t('Tasks')} actions={canManage && <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('New task')}</Button>} />
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Tabs className="border-0" active={filters.scope ?? 'mine'} onChange={(k) => visit({ scope: k })} tabs={[{ key: 'mine', label: t('My tasks') }, { key: 'all', label: t('All tasks'), hidden: !canManage }]} />
                <Select aria-label={t('Status')} wrapperClassName="w-40" value={filters.status ?? 'active'} onChange={(e) => visit({ status: e.target.value })} options={[{ value: 'active', label: t('Open') }, { value: 'all', label: t('All') }, ...options.statuses]} />
            </div>
            <Card>
                {tasks.data.length === 0 ? <EmptyState icon={<ClipboardList className="size-5" />} title={t('No tasks')} /> : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {tasks.data.map((task) => (
                            <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                                <button type="button" className="mt-0.5" onClick={() => router.post(route('tasks.toggle', task.id), {}, { preserveScroll: true })} aria-label={t('Toggle done')}>
                                    {task.status === 'done' ? <CheckCircle2 className="size-5 text-verdant-600" /> : <Circle className="size-5 text-navy-300" />}
                                </button>
                                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setEditing(task)}>
                                    <p className={cn('text-sm font-medium', task.status === 'done' && 'text-navy-400 line-through')}>{task.title}</p>
                                    <p className={cn('text-xs', task.overdue ? 'font-semibold text-red-600' : 'text-navy-500')}>
                                        {task.due_date ? formatDate(task.due_date, locale) : t('No due date')}{task.assignee ? `, ${task.assignee}` : ''}
                                    </p>
                                </button>
                                {task.case && <Link href={route('cases.show', task.case.id)} className="ltr-nums hidden text-xs text-navy-500 hover:underline sm:inline">{task.case.reference}</Link>}
                                <StatusBadge value={task.priority} label={task.priority_label} />
                            </li>
                        ))}
                    </ul>
                )}
                <Pagination meta={tasks} />
            </Card>
            <TaskDialog open={editing !== undefined} onClose={() => setEditing(undefined)} task={editing} members={options.members} priorities={options.priorities} statuses={options.statuses} cases={options.cases} />
        </AppLayout>
    );
}
