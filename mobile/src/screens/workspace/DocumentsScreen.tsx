import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { errorMessage, formData, openFile, webPage, webPost, type LaravelPage, type Option } from '@/api';
import { Alert, Badge, Button, Card, Chip, EmptyState, ErrorState, Input, Picker, Screen, SkeletonCard, SwitchRow, Txt, useForm } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQuery } from '@/hooks/useQuery';
import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type Doc = { id: number; title: string; category_label: string; is_confidential?: boolean; source?: string; mime: string | null; size: number | null; version?: number | null; case?: { id: number; title: string; reference: string } | null | string; client?: string | null; uploaded_by?: string | null; updated_at: string };
type DocOptions = { categories: Option[]; cases: Option<number>[]; clients: Option<number>[] };

const sizeOf = (bytes: number | null) => (bytes ? (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`) : '');
const iconFor = (mime: string | null): keyof typeof Feather.glyphMap => (mime?.includes('pdf') ? 'file-text' : mime?.startsWith('image') ? 'image' : 'file');

/** Document vault (web Documents page) for lawyers, or the shared documents of a client. */
export function DocumentsScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Documents'>>();
  const { role } = useAuth();
  const client = role === 'client';
  const { spacing } = useTheme();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const term = useDebouncedValue(search, 350);
  const q = useQuery(
    () => (client
      ? webPage<{ documents: Doc[]; cases: Option<number>[] }>('/client/documents').then((d) => ({ docs: d.documents, options: { categories: [], cases: d.cases, clients: [] } as DocOptions, canUpload: true }))
      : webPage<{ documents: LaravelPage<Doc>; options: DocOptions; can: { upload: boolean } }>('/workspace/documents', { search: term, category: category || undefined, case_id: params?.caseId }).then((d) => ({ docs: d.documents.data, options: d.options, canUpload: d.can.upload }))),
    [term, category, params?.caseId, client],
  );
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const open = async (d: Doc) => {
    try {
      const ext = d.mime?.includes('pdf') ? 'pdf' : d.mime?.split('/')[1] ?? 'bin';
      await openFile(client ? `/client/documents/${d.id}/download` : `/workspace/documents/${d.id}/download`, `${d.title}.${ext}`, client ? { inline: 1 } : undefined);
    } catch (e) {
      setNotice({ tone: 'danger', text: errorMessage(e) });
    }
  };

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh} footer={q.data?.canUpload ? <Button title="Upload document" icon="upload" full onPress={() => setUploading(true)} /> : undefined}>
      {!client ? (
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          <Input icon="search" placeholder="Search documents" value={search} onChangeText={setSearch} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <Chip label="All" selected={!category} onPress={() => setCategory('')} />
            {q.data?.options.categories.map((c) => <Chip key={c.value} label={c.label} selected={category === c.value} onPress={() => setCategory(String(c.value))} />)}
          </ScrollView>
        </View>
      ) : null}
      {notice ? <View style={{ marginBottom: spacing.md }}><Alert tone={notice.tone} message={notice.text} /></View> : null}
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.docs.length ? <EmptyState icon="folder" title="No documents" message={client ? 'Documents your lawyer shares appear here.' : 'Upload pleadings, orders and evidence.'} /> : (
        <View style={{ gap: spacing.sm }}>
          {q.data.docs.map((d) => <DocRow key={d.id} doc={d} onPress={() => void open(d)} />)}
        </View>
      )}
      {q.data ? <UploadSheet visible={uploading} client={client} options={q.data.options} caseId={params?.caseId} onClose={() => setUploading(false)} onDone={(m) => { setUploading(false); setNotice({ tone: 'success', text: m }); void q.refresh(); }} /> : null}
    </Screen>
  );
}

export function DocRow({ doc: d, onPress }: { doc: Doc; onPress: () => void }) {
  const { c, spacing } = useTheme();
  const caseLabel = typeof d.case === 'string' ? d.case : d.case?.reference;
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={iconFor(d.mime)} size={18} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle" numberOfLines={1}>{d.title}</Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>{[d.category_label, caseLabel, sizeOf(d.size), new Date(d.updated_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}</Txt>
        </View>
        {d.is_confidential ? <Badge label="Confidential" tone="danger" /> : <Feather name="download" size={18} color={c.textFaint} />}
      </View>
    </Card>
  );
}

/** Picks a file (PDF / image / DOCX) and posts it to the same upload action as the web. */
function UploadSheet({ visible, client, options, caseId, onClose, onDone }: { visible: boolean; client: boolean; options: DocOptions; caseId?: number; onClose: () => void; onDone: (message: string) => void }) {
  const { c, spacing } = useTheme();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const f = useForm<Record<string, any>>({ title: '', category: 'pleading', legal_case_id: caseId ?? null, client_id: null, is_confidential: false });
  const v = f.values;
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) {
      setFile(res.assets[0]);
      if (!v.title) { f.set('title', res.assets[0].name.replace(/\.[^.]+$/, '')); }
    }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Txt variant="heading">Upload document</Txt>
          <Pressable onPress={onClose} hitSlop={10}><Feather name="x" size={22} color={c.text} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          {f.message ? <Alert tone={f.message.tone} message={f.message.text} /> : null}
          <Card onPress={() => void pick()}>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Feather name={file ? 'file-text' : 'upload-cloud'} size={22} color={c.primary} />
              <Txt style={{ flex: 1 }} numberOfLines={1}>{file ? `${file.name} (${sizeOf(file.size ?? null)})` : 'Choose a PDF, photo or Word file'}</Txt>
            </View>
          </Card>
          {f.errors.file ? <Txt variant="caption" tone="danger">{f.errors.file}</Txt> : null}
          <Input label="Title *" value={v.title} onChangeText={(t) => f.set('title', t)} error={f.errors.title} />
          {client ? (
            <Picker label="Case" required value={v.legal_case_id} options={options.cases} onChange={(x) => f.set('legal_case_id', x)} error={f.errors.legal_case_id} />
          ) : (
            <>
              <Picker label="Category" required value={v.category} options={options.categories} onChange={(x) => f.set('category', x)} error={f.errors.category} />
              <Picker label="Case" value={v.legal_case_id} options={options.cases} onChange={(x) => f.set('legal_case_id', x)} error={f.errors.legal_case_id} />
              <Picker label="Client" value={v.client_id} options={options.clients} onChange={(x) => f.set('client_id', x)} error={f.errors.client_id} />
              <SwitchRow label="Confidential" hint="Never shown to the client." value={!!v.is_confidential} onChange={(x) => f.set('is_confidential', x)} />
            </>
          )}
          <Button title="Upload" icon="upload" full loading={f.busy} disabled={!file} onPress={() => void f.submit(
            (values) => webPost(client ? '/client/documents' : '/workspace/documents', formData(values, file ? { field: 'file', uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } : undefined)),
            (r) => { setFile(null); f.setValues({ title: '', category: 'pleading', legal_case_id: caseId ?? null, client_id: null, is_confidential: false }); onDone(r.message); },
          )} />
        </ScrollView>
      </View>
    </Modal>
  );
}
