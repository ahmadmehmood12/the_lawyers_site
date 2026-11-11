import { Link, router } from '@inertiajs/react';
import { CheckCircle2, Circle, ClipboardList, Columns3, List, Plus } from 'lucide-react';
import { useState } from 'react';
import { TaskDialog } from '@/Components/domain/TaskDialog';
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Select, StatusBadge, Tabs } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';
import type { SelectOption, TaskItem } from '@/types/domain';

type Props = {
    tasks: Paginated<TaskItem>;
    boardTasks: TaskItem[];
    view: 'list' | 'board';
    filters: Record<string, string>;
    options: { members: SelectOption[]; priorities: Option[]; statuses: Option[]; cases: SelectOption[] };
    canManage: boolean;
};

export default function TasksIndex({ tasks, boardTasks, view, filters, options, canManage }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const [editing, setEditing] = useState<TaskItem | null | undefined>(undefined);
    const [dragging, setDragging] = useState<number | null>(null);
    const visit = (p: Record<string, string | undefined>) => router.get(route('tasks.index'), { ...filters, ...p }, { preserveState: true, replace: true });

    return (
        <AppLayout title={t('Tasks')} wide>
            <PageHeader
                title={t('Tasks')}
                actions={
                    <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-lg border border-navy-200 p-0.5 dark:border-navy-700">
                            <button type="button" onClick={() => visit({ view: 'list' })} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium', view === 'list' ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-600 dark:text-navy-300')}>
                                <List className="size-4" />{t('List')}
                            </button>
                            <button type="button" onClick={() => visit({ view: 'board', status: 'all' })} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium', view === 'board' ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-600 dark:text-navy-300')}>
                                <Columns3 className="size-4" />{t('Board')}
                            </button>
                        </div>
                        {canManage && <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('New task')}</Button>}
                    </div>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Tabs className="border-0" active={filters.scope ?? 'mine'} onChange={(k) => visit({ scope: k })} tabs={[{ key: 'mine', label: t('My tasks') }, { key: 'all', label: t('All tasks'), hidden: !canManage }]} />
                {view === 'list' && (
                    <Select aria-label={t('Status')} wrapperClassName="w-40" value={filters.status ?? 'active'} onChange={(e) => visit({ status: e.target.value })} options={[{ value: 'active', label: t('Open') }, { value: 'all', label: t('All') }, ...options.statuses]} />
                )}
                {view === 'board' && <p className="text-xs text-navy-500 dark:text-navy-400">{t('Drag a card to another column to change its status.')}</p>}
            </div>

            {view === 'board' ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {options.statuses.map((status) => {
                        const columnTasks = boardTasks.filter((task) => task.status === status.value);
                        return (
                            <section
                                key={status.value}
                                className="flex min-h-64 flex-col rounded-card border border-navy-100 bg-navy-50/50 dark:border-navy-800 dark:bg-navy-900/40"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    const id = Number(event.dataTransfer.getData('text/plain'));
                                    const task = boardTasks.find((item) => item.id === id);
                                    setDragging(null);
                                    if (task && task.status !== status.value) {
                                        router.post(route('tasks.status', task.id), { status: status.value }, { preserveScroll: true });
                                    }
                                }}
                            >
                                <header className="flex items-center justify-between gap-2 border-b border-navy-100 px-3 py-2 dark:border-navy-800">
                                    <p className="text-sm font-semibold">{status.label}</p>
                                    <Badge>{columnTasks.length}</Badge>
                                </header>
                                <div className="flex flex-1 flex-col gap-2 p-2">
                                    {columnTasks.length === 0 ? (
                                        <p className="px-2 py-6 text-center text-xs text-navy-400">{t('Nothing here')}</p>
                                    ) : (
                                        columnTasks.map((task) => (
                                            <article
                                                key={task.id}
                                                draggable
                                                onDragStart={(event) => {
                                                    setDragging(task.id);
                                                    event.dataTransfer.setData('text/plain', String(task.id));
                                                }}
                                                onDragEnd={() => setDragging(null)}
                                                className={cn(
                                                    'cursor-grab rounded-lg border border-navy-100 bg-white p-3 shadow-xs active:cursor-grabbing dark:border-navy-700 dark:bg-navy-900',
                                                    dragging === task.id && 'opacity-50',
                                                )}
                                            >
                                                <button type="button" className="w-full text-start" onClick={() => setEditing(task)}>
                                                    <p className={cn('text-sm font-medium', task.status === 'done' && 'text-navy-400 line-through')}>{task.title}</p>
                                                    <p className={cn('mt-1 text-xs', task.overdue ? 'font-semibold text-red-600' : 'text-navy-500')}>
                                                        {task.due_date ? formatDate(task.due_date, locale) : t('No due date')}{task.assignee ? `, ${task.assignee}` : ''}
                                                    </p>
                                                </button>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <StatusBadge value={task.priority} label={task.priority_label} />
                                                    {task.case && <Link href={route('cases.show', task.case.id)} className="text-xs text-navy-500 hover:underline">{task.case.reference}</Link>}
                                                </div>
                                            </article>
                                        ))
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
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
            )}

            <TaskDialog open={editing !== undefined} onClose={() => setEditing(undefined)} task={editing} members={options.members} priorities={options.priorities} statuses={options.statuses} cases={options.cases} />
        </AppLayout>
    );
}
