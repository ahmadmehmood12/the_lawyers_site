import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, EmptyState, Input, ListRow, Screen, Txt } from '@/components';
import { documents } from '@/data/mock';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/theme';

export function DocumentsScreen() {
  const { c, spacing } = useTheme();
  const [query, setQuery] = useState('');
  const list = documents.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()) || (d.caseReference ?? '').toLowerCase().includes(query.toLowerCase()));

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Txt variant="title">Documents</Txt>
        <Button title="Upload" size="sm" icon="upload" />
      </View>
      <Input icon="search" placeholder="Search by name or case" value={query} onChangeText={setQuery} />

      <View style={{ marginTop: spacing.lg }}>
        {list.length === 0 ? (
          <EmptyState icon="file" title="No documents" message="Upload petitions, orders and evidence to keep them in one place." actionLabel="Upload a document" />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
            {list.map((d, i) => (
              <ListRow
                key={d.id}
                leading={
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={d.type === 'image' ? 'image' : d.type === 'docx' ? 'file' : 'file-text'} size={18} color={c.primary} />
                  </View>
                }
                title={d.name}
                subtitle={`${d.caseReference ?? 'General'} · ${d.sizeKb} KB · ${formatDate(d.uploadedOn)}`}
                trailing={d.sharedWithClient ? <Badge label="Shared" tone="success" /> : <Badge label="Private" tone="neutral" />}
                divider={i < list.length - 1}
                chevron
              />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}
