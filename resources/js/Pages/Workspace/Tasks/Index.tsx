import { Link, router, usePoll } from '@inertiajs/react';
import { CheckCircle2, Circle, ClipboardList, Columns3, List, Plus } from 'lucide-react';
import { useState } from 'react';
import { TaskAssignee } from '@/Components/domain/TaskAssignee';
import { TaskDialog } from '@/Components/domain/TaskDialog';
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, Pagination, Select, StatusBadge, Tabs } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT, type Translator } from '@/lib/i18n';
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

type Lane = { key: string; label: string; avatar: string | null; tasks: TaskItem[] };

export default function TasksIndex({ tasks, boardTasks, view, filters, options, canManage }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const [editing, setEditing] = useState<TaskItem | null | undefined>(undefined);
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
                {view === 'board' && (
                    <div className="flex items-center gap-2 text-xs text-navy-500 dark:text-navy-400">
                        <span className="inline-flex size-2 rounded-full bg-verdant-500" />
                        {t('Live board')}
                        <span className="text-navy-300 dark:text-navy-600">·</span>
                        {t('Drag a card to another column to change its status.')}
                    </div>
                )}
            </div>

            {view === 'board' ? (
                <TaskBoard tasks={boardTasks} statuses={options.statuses} canManage={canManage} onEdit={setEditing} />
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
                                            {task.due_date ? formatDate(task.due_date, locale) : t('No due date')}
                                            {task.reporter && <span className="text-navy-400"> · {t('Reported by :name', { name: task.reporter })}</span>}
                                        </p>
                                    </button>
                                    {task.case && <Link href={route('cases.show', task.case.id)} className="ltr-nums hidden text-xs text-navy-500 hover:underline sm:inline">{task.case.reference}</Link>}
                                    <StatusBadge value={task.priority} label={task.priority_label} />
                                    <TaskAssignee task={task} />
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

function TaskBoard({ tasks, statuses, canManage, onEdit }: { tasks: TaskItem[]; statuses: Option[]; canManage: boolean; onEdit: (task: TaskItem) => void }) {
    const t = useT();
    const { locale } = useLocale();
    const [dragging, setDragging] = useState<number | null>(null);
    const { polling } = usePoll(30000, { only: ['boardTasks'] });
    const lanes = groupByAssignee(tasks, t);

    if (lanes.length === 0) {
        return <EmptyState icon={<ClipboardList className="size-5" />} title={t('No tasks')} />;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-navy-400">
                <span className={cn('size-1.5 rounded-full', polling ? 'animate-pulse bg-verdant-500' : 'bg-navy-300')} />
                {polling ? t('Live updates on') : t('Live updates paused')}
            </div>

            {lanes.map((lane) => {
                const done = lane.tasks.filter((task) => task.status === 'done').length;
                return (
                    <section key={lane.key} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-white">
                                {lane.key === 'unassigned' ? <TaskAssignee task={{ assignee: null, assignee_avatar: null, reporter: null }} /> : <Avatar name={lane.label} src={lane.avatar} size="xs" />}
                                {lane.label}
                            </h2>
                            <p className="text-xs text-navy-500 dark:text-navy-400">
                                {t(':count tasks', { count: lane.tasks.length })}
                                {done > 0 && ` · ${t(':count done', { count: done })}`}
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                            {statuses.map((status) => {
                                const columnTasks = lane.tasks.filter((task) => task.status === status.value);
                                return (
                                    <section
                                        key={status.value}
                                        className="flex min-h-48 flex-col rounded-card border border-navy-100 bg-navy-50/50 dark:border-navy-800 dark:bg-navy-900/40"
                                        onDragOver={(event) => {
                                            if (canManage) event.preventDefault();
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            if (!canManage) return;
                                            const id = Number(event.dataTransfer.getData('text/plain'));
                                            const task = tasks.find((item) => item.id === id);
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
                                                        draggable={canManage}
                                                        onDragStart={(event) => {
                                                            if (!canManage) return;
                                                            setDragging(task.id);
                                                            event.dataTransfer.setData('text/plain', String(task.id));
                                                        }}
                                                        onDragEnd={() => setDragging(null)}
                                                        className={cn(
                                                            'rounded-lg border border-navy-100 bg-white p-3 shadow-xs dark:border-navy-700 dark:bg-navy-900',
                                                            canManage && 'cursor-grab active:cursor-grabbing',
                                                            dragging === task.id && 'opacity-50',
                                                        )}
                                                    >
                                                        <button type="button" className="w-full text-start" onClick={() => onEdit(task)}>
                                                            <p className={cn('text-sm font-medium', task.status === 'done' && 'text-navy-400 line-through')}>{task.title}</p>
                                                            <p className={cn('mt-1 text-xs', task.overdue ? 'font-semibold text-red-600' : 'text-navy-500')}>
                                                                {task.due_date ? formatDate(task.due_date, locale) : t('No due date')}
                                                            </p>
                                                        </button>
                                                        <div className="mt-2 flex items-end justify-between gap-2">
                                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                <StatusBadge value={task.priority} label={task.priority_label} />
                                                                {task.case && <Link href={route('cases.show', task.case.id)} className="ltr-nums truncate text-xs text-navy-500 hover:underline">{task.case.reference}</Link>}
                                                            </div>
                                                            <TaskAssignee task={task} />
                                                        </div>
                                                    </article>
                                                ))
                                            )}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

function groupByAssignee(tasks: TaskItem[], t: Translator): Lane[] {
    const lanes = new Map<string, Lane>();

    for (const task of tasks) {
        const key = task.assigned_to ? String(task.assigned_to) : 'unassigned';
        if (!lanes.has(key)) {
            lanes.set(key, { key, label: task.assignee ?? t('Unassigned'), avatar: task.assignee_avatar, tasks: [] });
        }
        lanes.get(key)!.tasks.push(task);
    }

    return [...lanes.values()].sort((a, b) => {
        if (a.key === 'unassigned') return 1;
        if (b.key === 'unassigned') return -1;
        return a.label.localeCompare(b.label);
    });
}
