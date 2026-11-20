import { Feather } from '@expo/vector-icons';
import { type RouteProp, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Divider, EmptyState, KeyValue, ListRow, ProgressBar, Screen, SectionHeader, SegmentedControl, Txt } from '@/components';
import { cases, documents, hearings, tasks } from '@/data/mock';
import { formatDate, relativeDay, to12h } from '@/lib/format';
import { caseTone, label, priorityTone, taskTone } from '@/lib/status';
import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type Tab = 'overview' | 'hearings' | 'documents' | 'tasks';

export function CaseDetailScreen() {
  const { c, spacing } = useTheme();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CaseDetail'>>();
  const item = cases.find((cs) => cs.id === params.id);
  const [tab, setTab] = useState<Tab>('overview');

  if (!item) {
    return (
      <Screen>
        <EmptyState icon="folder" title="Case not found" />
      </Screen>
    );
  }

  const caseHearings = hearings.filter((h) => h.caseId === item.id).sort((a, b) => a.date.localeCompare(b.date));
  const caseDocs = documents.filter((d) => d.caseReference === item.reference);
  const caseTasks = tasks.filter((t) => t.caseReference === item.reference);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Badge label={label(item.status)} tone={caseTone(item.status)} />
        <Txt variant="caption" tone="faint">
          {item.reference}
        </Txt>
      </View>
      <Txt variant="title" style={{ marginTop: spacing.sm }}>
        {item.title}
      </Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
        {item.court} · {item.type}
      </Txt>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Txt variant="label" tone="muted">
            Progress — {item.stage}
          </Txt>
          <Txt variant="label">{item.progress}%</Txt>
        </View>
        <ProgressBar value={item.progress} tone={item.status === 'won' ? 'success' : 'accent'} />
        {item.nextHearing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm }}>
            <Feather name="calendar" size={16} color={c.accent} />
            <Txt variant="body" weight="600">
              Next hearing {relativeDay(item.nextHearing)}
            </Txt>
          </View>
        ) : null}
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'hearings', label: `Hearings` },
            { value: 'documents', label: 'Docs' },
            { value: 'tasks', label: 'Tasks' },
          ]}
        />
      </View>

      {tab === 'overview' ? (
        <Card style={{ marginTop: spacing.lg }}>
          <KeyValue label="Petitioner" value={item.parties.petitioner} />
          <KeyValue label="Respondent" value={item.parties.respondent} />
          <KeyValue label="Client" value={item.clientName} />
          <KeyValue label="Counsel" value={item.lawyers.join(', ')} />
          <KeyValue label="Court" value={item.court} />
          <KeyValue label="Filed on" value={formatDate(item.filedOn)} />
          {item.firNumber ? <KeyValue label="FIR" value={item.firNumber} /> : null}
          <KeyValue label="Summary" value={item.description} last />
        </Card>
      ) : null}

      {tab === 'hearings' ? (
        <View style={{ marginTop: spacing.sm }}>
          <SectionHeader title="Hearing dates" />
          {caseHearings.length === 0 ? (
            <EmptyState icon="calendar" title="No hearings recorded" />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {caseHearings.map((h, i) => (
                <ListRow
                  key={h.id}
                  title={h.purpose}
                  subtitle={`${h.court} · ${h.judge}`}
                  meta={`${formatDate(h.date)}\n${to12h(h.time)}`}
                  trailing={<Badge label={label(h.status)} tone={h.status === 'done' ? 'success' : h.status === 'adjourned' ? 'warning' : 'info'} />}
                  divider={i < caseHearings.length - 1}
                />
              ))}
            </Card>
          )}
        </View>
      ) : null}

      {tab === 'documents' ? (
        <View style={{ marginTop: spacing.sm }}>
          <SectionHeader title="Documents" actionLabel="Upload" />
          {caseDocs.length === 0 ? (
            <EmptyState icon="file" title="No documents yet" message="Upload the petition, orders and evidence to keep everything in one place." />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {caseDocs.map((d, i) => (
                <ListRow
                  key={d.id}
                  leading={<Feather name={d.type === 'image' ? 'image' : 'file-text'} size={20} color={c.textMuted} />}
                  title={d.name}
                  subtitle={`${d.sizeKb} KB · ${formatDate(d.uploadedOn)}`}
                  trailing={d.sharedWithClient ? <Badge label="Shared" tone="success" /> : undefined}
                  divider={i < caseDocs.length - 1}
                  chevron
                />
              ))}
            </Card>
          )}
        </View>
      ) : null}

      {tab === 'tasks' ? (
        <View style={{ marginTop: spacing.sm }}>
          <SectionHeader title="Tasks" actionLabel="Add" />
          {caseTasks.length === 0 ? (
            <EmptyState icon="check-square" title="No tasks" />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {caseTasks.map((t, i) => (
                <ListRow
                  key={t.id}
                  title={t.title}
                  subtitle={`Due ${formatDate(t.due)} · ${t.assignee}`}
                  trailing={
                    <View style={{ gap: 4, alignItems: 'flex-end' }}>
                      <Badge label={label(t.status)} tone={taskTone(t.status)} />
                      <Badge label={t.priority} tone={priorityTone(t.priority)} />
                    </View>
                  }
                  divider={i < caseTasks.length - 1}
                />
              ))}
            </Card>
          )}
        </View>
      ) : null}

      <Divider style={{ marginVertical: spacing.xl }} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button title="Message" variant="secondary" icon="message-circle" style={{ flex: 1 }} />
        <Button title="Add update" icon="plus" style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}
