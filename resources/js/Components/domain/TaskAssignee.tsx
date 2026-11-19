import { UserRound } from 'lucide-react';
import { Avatar } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { TaskItem } from '@/types/domain';

/**
 * Jira-style round avatar of the person a task is assigned to, shown in the
 * bottom-right corner of task cards. Unassigned tasks get a dashed placeholder.
 * Hovering shows the assignee and the reporter.
 */
export function TaskAssignee({ task, className }: { task: Pick<TaskItem, 'assignee' | 'assignee_avatar' | 'reporter'>; className?: string }) {
    const t = useT();
    const label = [task.assignee ? t('Assignee: :name', { name: task.assignee }) : t('Unassigned'), task.reporter ? t('Reporter: :name', { name: task.reporter }) : null].filter(Boolean).join('\n');

    return (
        <span title={label} className={cn('inline-flex shrink-0', className)}>
            <span className="sr-only">{label}</span>
            {task.assignee ? (
                <Avatar name={task.assignee} src={task.assignee_avatar} size="xs" />
            ) : (
                <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-navy-300 text-navy-400 dark:border-navy-600" aria-hidden>
                    <UserRound className="size-3.5" />
                </span>
            )}
        </span>
    );
}
