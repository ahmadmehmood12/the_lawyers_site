import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { errorMessage, webPage, webPost, webPut, type LaravelPage, type Option } from '@/api';
import { Alert, Badge, Button, Card, Chip, DateField, EmptyState, ErrorState, Input, Picker, Screen, SkeletonCard, Txt, useForm } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

export type TaskItem = { id: number; title: string; description: string | null; due_date: string | null; overdue: boolean; priority: string; priority_label: string; status: string; status_label: string; assignee: string | null; assigned_to: number | null; case: { id: number; title: string; reference: string } | null; legal_case_id: number | null };
export type TaskOptions = { members: Option<number>[]; priorities: Option[]; statuses: Option[]; cases: Option<number>[] };

/** Tasks (web Tasks page): filter by status, tick done, add / edit — TaskController actions. */
export function TasksScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Tasks'>>();
  const { spacing } = useTheme();
  const [status, setStatus] = useState<string>('');
  const q = useQuery(() => webPage<{ tasks: LaravelPage<TaskItem>; options: TaskOptions }>('/workspace/tasks', { status: status || undefined, case_id: params?.caseId }), [status, params?.caseId]);
  const [editing, setEditing] = useState<TaskItem | 'new' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tasks = q.data?.tasks.data ?? [];

  const toggle = async (t: TaskItem) => {
    try {
      await webPost(`/workspace/tasks/${t.id}/status`, { status: t.status === 'done' ? 'open' : 'done' });
      void q.refresh();
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh} footer={<Button title="New task" icon="plus" full onPress={() => setEditing('new')} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <Chip label="All" selected={!status} onPress={() => setStatus('')} />
        {q.data?.options.statuses.map((s) => <Chip key={s.value} label={s.label} selected={status === s.value} onPress={() => setStatus(String(s.value))} />)}
      </ScrollView>
      {notice ? <Alert tone="danger" message={notice} /> : null}
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !tasks.length ? <EmptyState icon="check-square" title="No tasks" message="Add a task for yourself or a colleague." /> : (
        <View style={{ gap: spacing.sm }}>
          {tasks.map((t) => <TaskRow key={t.id} task={t} onToggle={() => void toggle(t)} onPress={() => setEditing(t)} />)}
        </View>
      )}
      {q.data ? <TaskSheet task={editing} options={q.data.options} caseId={params?.caseId} onClose={() => setEditing(null)} onSaved={(m) => { setEditing(null); setNotice(null); void q.refresh(); void m; }} /> : null}
    </Screen>
  );
}

export function TaskRow({ task: t, onToggle, onPress }: { task: TaskItem; onToggle: () => void; onPress?: () => void }) {
  const { c, spacing } = useTheme();
  const done = t.status === 'done';
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
        <Pressable onPress={onToggle} hitSlop={10}>
          <Feather name={done ? 'check-circle' : 'circle'} size={22} color={done ? c.success : t.overdue ? c.danger : c.textFaint} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle" style={done ? { textDecorationLine: 'line-through', opacity: 0.6 } : undefined}>{t.title}</Txt>
          <Txt variant="caption" tone={t.overdue && !done ? 'danger' : 'muted'}>{[t.case?.reference, t.assignee, t.due_date && `Due ${new Date(t.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`].filter(Boolean).join(' · ')}</Txt>
        </View>
        <Badge label={t.priority_label} tone={t.priority === 'urgent' || t.priority === 'high' ? 'danger' : 'neutral'} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6, marginLeft: 34 }}><Badge label={t.status_label} tone={statusTone(t.status)} /></View>
    </Card>
  );
}

/** Add / edit task sheet (TaskRequest). */
export function TaskSheet({ task, options, caseId, onClose, onSaved }: { task: TaskItem | 'new' | null; options: TaskOptions; caseId?: number; onClose: () => void; onSaved: (message: string) => void }) {
  const { c, spacing, radius } = useTheme();
  const f = useForm<Record<string, any>>({});
  useEffect(() => {
    if (task) {
      f.setValues(task === 'new'
        ? { title: '', description: '', legal_case_id: caseId ?? null, assigned_to: null, due_date: '', priority: 'normal', status: 'open' }
        : { title: task.title, description: task.description ?? '', legal_case_id: task.legal_case_id, assigned_to: task.assigned_to, due_date: task.due_date ?? '', priority: task.priority, status: task.status });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);
  const v = f.values;
  const e = f.errors;
  return (
    <Modal visible={!!task} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Txt variant="heading">{task === 'new' ? 'New task' : 'Edit task'}</Txt>
          <Pressable onPress={onClose} hitSlop={10}><Feather name="x" size={22} color={c.text} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          {f.message ? <Alert tone={f.message.tone} message={f.message.text} /> : null}
          <Input label="Title *" value={v.title ?? ''} onChangeText={(t) => f.set('title', t)} error={e.title} />
          <Input label="Details" value={v.description ?? ''} onChangeText={(t) => f.set('description', t)} error={e.description} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
          <Picker label="Case" value={v.legal_case_id} options={options.cases} onChange={(x) => f.set('legal_case_id', x)} error={e.legal_case_id} />
          <Picker label="Assign to" value={v.assigned_to} options={options.members} onChange={(x) => f.set('assigned_to', x)} error={e.assigned_to} />
          <DateField label="Due date" value={v.due_date} onChange={(t) => f.set('due_date', t)} error={e.due_date} />
          <Picker label="Priority" required value={v.priority} options={options.priorities} onChange={(x) => f.set('priority', x)} error={e.priority} />
          <Picker label="Status" required value={v.status} options={options.statuses} onChange={(x) => f.set('status', x)} error={e.status} />
          <Button title={task === 'new' ? 'Create task' : 'Save task'} full loading={f.busy} onPress={() => void f.submit(
            (values) => (task === 'new' ? webPost('/workspace/tasks', values) : webPut(`/workspace/tasks/${(task as TaskItem).id}`, values)),
            (r) => onSaved(r.message),
          )} />
          <View style={{ height: radius.xl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
