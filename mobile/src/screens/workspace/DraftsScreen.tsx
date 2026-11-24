import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import { errorMessage, openFile, webPage, webPost, webPut, type LaravelPage, type Option } from '@/api';
import { Alert, Badge, Button, Card, Chip, EmptyState, ErrorState, Input, Loading, Picker, Screen, SkeletonCard, Txt, useForm } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { fontFamily, useTheme } from '@/theme';

// react-native-webview's class typings do not match React 19's JSX types yet; runtime is unaffected.
const WebView = RNWebView as unknown as React.ComponentType<Record<string, unknown> & { ref?: React.Ref<{ injectJavaScript: (js: string) => void }> }>;

type DraftItem = { id: number; title: string; status: string; status_label: string; version: number; case: { id: number; reference: string; title: string } | null; author: string | null; updated_at: string };
type Template = { id: number; title: string; title_ur: string | null; category: string; description: string | null; language: string };

/** Drafting (web Drafts page): list, start from a template, edit, change status, export PDF / Word. */
export function DraftsScreen() {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const [status, setStatus] = useState('');
  const q = useQuery(() => webPage<{ drafts: LaravelPage<DraftItem>; statuses: Option[] }>('/workspace/drafts', { status: status || undefined }), [status]);
  const [creating, setCreating] = useState(false);

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh} footer={<Button title="New draft" icon="plus" full onPress={() => setCreating(true)} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <Chip label="All" selected={!status} onPress={() => setStatus('')} />
        {q.data?.statuses.map((s) => <Chip key={s.value} label={s.label} selected={status === s.value} onPress={() => setStatus(String(s.value))} />)}
      </ScrollView>
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.drafts.data.length ? <EmptyState icon="edit-3" title="No drafts" message="Start a petition, application or agreement from a template." /> : (
        <View style={{ gap: spacing.sm }}>
          {q.data.drafts.data.map((d) => (
            <Card key={d.id} onPress={() => nav.navigate('DraftEditor', { id: d.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Txt variant="subtitle" style={{ flex: 1 }} numberOfLines={2}>{d.title}</Txt>
                <Badge label={d.status_label} tone={statusTone(d.status)} />
              </View>
              <Txt variant="caption" tone="muted">{[d.case?.reference, `v${d.version}`, d.author, new Date(d.updated_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}</Txt>
            </Card>
          ))}
        </View>
      )}
      <NewDraftSheet visible={creating} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); void q.refresh(); nav.navigate('DraftEditor', { id }); }} />
    </Screen>
  );
}

function NewDraftSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const { c, spacing } = useTheme();
  const q = useQuery(() => (visible ? webPage<{ templates: Template[]; cases: Option<number>[]; clients: Option<number>[] }>('/workspace/drafts/create') : Promise.resolve(null)), [visible]);
  const f = useForm<Record<string, any>>({ title: '', document_template_id: null, legal_case_id: null, client_id: null, language: 'en' });
  const v = f.values;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Txt variant="heading">New draft</Txt>
          <Pressable onPress={onClose} hitSlop={10}><Feather name="x" size={22} color={c.text} /></Pressable>
        </View>
        {q.loading || !q.data ? <Loading /> : (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
            {f.message ? <Alert tone={f.message.tone} message={f.message.text} /> : null}
            <Input label="Title *" value={v.title} onChangeText={(t) => f.set('title', t)} error={f.errors.title} placeholder="e.g. Bail application — Muhammad Ali" />
            <Picker label="Template" value={v.document_template_id} options={q.data.templates.map((t) => ({ value: t.id, label: `${t.title} · ${t.category}` }))} onChange={(x) => f.set('document_template_id', x)} error={f.errors.document_template_id} placeholder="Blank document" />
            <Picker label="Case (fills names, court, numbers)" value={v.legal_case_id} options={q.data.cases} onChange={(x) => f.set('legal_case_id', x)} error={f.errors.legal_case_id} />
            <Picker label="Client" value={v.client_id} options={q.data.clients} onChange={(x) => f.set('client_id', x)} error={f.errors.client_id} />
            <Picker label="Language" required value={v.language} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} onChange={(x) => f.set('language', x)} error={f.errors.language} />
            <Button title="Create draft" full loading={f.busy} onPress={() => void f.submit((values) => webPost('/workspace/drafts', values), (r) => onCreated(Number(r.params?.draft)))} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

type DraftPage = { draft: { id: number; title: string; body: string; language: string; header_text: string | null; footer_text: string | null; version: number; status: string; status_label: string; case: { id: number; reference: string } | null }; can: { approve: boolean } };

const editorHtml = (body: string, rtl: boolean, color: string, bg: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>body{margin:0;padding:16px;font:16px/1.6 -apple-system,Roboto,sans-serif;color:${color};background:${bg}}#e{min-height:70vh;outline:none}#e p{margin:0 0 10px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px}</style></head>
<body><div id="e" contenteditable="true" dir="${rtl ? 'rtl' : 'ltr'}">${body}</div>
<script>const e=document.getElementById('e');const send=()=>window.ReactNativeWebView.postMessage(e.innerHTML);let t;e.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(send,250)});
window.cmd=(c,v)=>{document.execCommand(c,false,v||null);send();};</script></body></html>`;

/** Draft editor: the HTML body the web's rich-text editor uses, edited in a WebView, saved with the web's update action. */
export function DraftEditorScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'DraftEditor'>>();
  const nav = useAppNavigation();
  const { c, spacing, radius } = useTheme();
  const q = useQuery(() => webPage<DraftPage>(`/workspace/drafts/${params.id}`), [params.id]);
  const web = useRef<{ injectJavaScript: (js: string) => void }>(null);
  const [title, setTitle] = useState('');
  const body = useRef('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (q.data) { setTitle(q.data.draft.title); body.current = q.data.draft.body; nav.setOptions({ title: `v${q.data.draft.version} · ${q.data.draft.status_label}` }); }
  }, [q.data, nav]);

  if (q.loading) {
    return <Loading />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const d = q.data.draft;

  const run = async (fn: () => Promise<{ message: string }>) => {
    setBusy(true);
    try {
      const { message } = await fn();
      setNotice({ tone: 'success', text: message === 'OK' ? 'Saved.' : message });
      void q.refresh();
    } catch (e) {
      setNotice({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(() => webPut(`/workspace/drafts/${d.id}`, { title, body: body.current, header_text: d.header_text, footer_text: d.footer_text }));
  const tools: [keyof typeof Feather.glyphMap, string, string?][] = [['bold', 'bold'], ['italic', 'italic'], ['underline', 'underline'], ['list', 'insertUnorderedList'], ['hash', 'insertOrderedList'], ['align-center', 'justifyCenter'], ['align-left', 'justifyLeft'], ['rotate-ccw', 'undo']];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={{ padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Input value={title} onChangeText={setTitle} placeholder="Title" style={{ fontFamily: fontFamily.bold }} />
        {notice ? <Alert tone={notice.tone} message={notice.text} /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {tools.map(([icon, command]) => (
            <Pressable key={command} onPress={() => web.current?.injectJavaScript(`window.cmd('${command}');true;`)} style={{ width: 38, height: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
              <Feather name={icon} size={16} color={c.text} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <WebView ref={web} originWhitelist={['*']} source={{ html: editorHtml(d.body, d.language === 'ur', c.text, c.bg) }} onMessage={(e: { nativeEvent: { data: string } }) => { body.current = e.nativeEvent.data; }} style={{ flex: 1, backgroundColor: c.bg }} hideKeyboardAccessoryView keyboardDisplayRequiresUserAction={false} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        <Button title="Save" icon="save" style={{ flex: 1 }} loading={busy} onPress={() => void save()} />
        <Button title="PDF" icon="file-text" variant="secondary" onPress={() => void openFile(`/workspace/drafts/${d.id}/export/pdf`, `${title || 'draft'}.pdf`).catch((e) => setNotice({ tone: 'danger', text: errorMessage(e) }))} />
        <Button title="Word" icon="file" variant="secondary" onPress={() => void openFile(`/workspace/drafts/${d.id}/export/docx`, `${title || 'draft'}.docx`).catch((e) => setNotice({ tone: 'danger', text: errorMessage(e) }))} />
      </View>
      {d.status === 'draft' || d.status === 'in_review' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md, backgroundColor: c.surface }}>
          {d.status === 'draft' ? <Button title="Send for review" size="sm" variant="ghost" style={{ flex: 1 }} onPress={() => void run(() => webPost(`/workspace/drafts/${d.id}/status`, { status: 'in_review' }))} /> : null}
          {q.data.can.approve && d.status === 'in_review' ? <Button title="Approve" size="sm" variant="ghost" style={{ flex: 1 }} onPress={() => void run(() => webPost(`/workspace/drafts/${d.id}/status`, { status: 'approved' }))} /> : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
