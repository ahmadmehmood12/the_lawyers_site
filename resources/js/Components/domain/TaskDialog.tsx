import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import type { Option } from '@/types';
import type { SelectOption, TaskItem } from '@/types/domain';

export function TaskDialog({ open, onClose, task, caseId, hearingId, members, priorities, statuses, cases }: { open: boolean; onClose: () => void; task?: TaskItem | null; caseId?: number; hearingId?: number; members: SelectOption[]; priorities: Option[]; statuses?: Option[]; cases?: SelectOption[] }) {
    const t = useT();
    const form = useForm({ title: '', description: '', assigned_to: '', due_date: '', priority: 'normal', status: 'open', legal_case_id: caseId ? String(caseId) : '', hearing_id: hearingId ? String(hearingId) : '' });

    useEffect(() => {
        form.setData({
            title: task?.title ?? '', description: task?.description ?? '', assigned_to: task?.assigned_to ? String(task.assigned_to) : '', due_date: task?.due_date ?? '',
            priority: task?.priority ?? 'normal', status: task?.status ?? 'open', legal_case_id: task?.legal_case_id ? String(task.legal_case_id) : caseId ? String(caseId) : '', hearing_id: hearingId ? String(hearingId) : '',
        });
    }, [open, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    function submit() {
        form.transform((d) => ({ ...d, assigned_to: d.assigned_to || null, due_date: d.due_date || null, legal_case_id: d.legal_case_id || null, hearing_id: d.hearing_id || null }));
        const options = { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } };
        task ? form.put(route('tasks.update', task.id), options) : form.post(route('tasks.store'), options);
    }

    return (
        <Modal open={open} onClose={onClose} title={task ? t('Edit task') : t('New task')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button onClick={submit} loading={form.processing}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input wrapperClassName="sm:col-span-2" label={t('Task')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required autoFocus />
                <Select label={t('Assign to')} value={form.data.assigned_to} onChange={(e) => form.setData('assigned_to', e.target.value)} options={members} placeholder={t('Unassigned')} error={form.errors.assigned_to} />
                <Input label={t('Due date')} type="date" value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} />
                <Select label={t('Priority')} value={form.data.priority} onChange={(e) => form.setData('priority', e.target.value)} options={priorities} />
                {task && statuses && <Select label={t('Status')} value={form.data.status} onChange={(e) => form.setData('status', e.target.value)} options={statuses} />}
                {!caseId && cases && <Select wrapperClassName="sm:col-span-2" label={t('Case')} value={form.data.legal_case_id} onChange={(e) => form.setData('legal_case_id', e.target.value)} options={cases} placeholder={t('Not linked')} error={form.errors.legal_case_id} />}
                <Textarea wrapperClassName="sm:col-span-2" label={t('Details')} rows={3} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
            </div>
        </Modal>
    );
}
