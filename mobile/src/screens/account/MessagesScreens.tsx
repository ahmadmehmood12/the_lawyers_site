import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';

import { errorMessage, formData, openFile, webPage, webPost, type Option } from '@/api';
import { Alert, Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, Loading, Picker, Screen, SkeletonCard, Txt, useForm } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/hooks/useQuery';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { fontFamily, useTheme } from '@/theme';

type Conversation = { id: number; subject: string | null; with: string; with_avatar: string | null; organization: string | null; kind: string; last_message_at: string | null; preview: string | null; unread: number };
type Message = { id: number; body: string | null; mine: boolean; sender: string; sender_avatar: string | null; status: string | null; attachment: { name: string; mime?: string; size?: number } | null; created_at: string };
type Inbox = { conversations: Conversation[]; starters: { client_id: number; lawyer_id: number; label: string }[] | null; clients: Option<number>[] | null };

/** Same messaging as the web (ConversationController): /workspace/messages for lawyers, /client/messages for clients. */
function useBase(): string {
  const { role } = useAuth();
  return role === 'client' ? '/client/messages' : '/workspace/messages';
}

const when = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
};

export function MessagesScreen() {
  const base = useBase();
  const nav = useAppNavigation();
  const { refreshUser } = useAuth();
  const { spacing } = useTheme();
  const q = useQuery(() => webPage<Inbox>(base), [base]);
  const [starting, setStarting] = useState(false);

  useEffect(() => nav.addListener('focus', () => { void q.refresh(); void refreshUser().catch(() => undefined); }), [nav]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => void q.refresh(), 15000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <Txt variant="title">Messages</Txt>
        <Button title="New" icon="edit" size="sm" variant="secondary" onPress={() => setStarting(true)} />
      </View>
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.conversations.length ? <EmptyState icon="message-circle" title="No conversations" message="Start a secure conversation about a case." actionLabel="New message" onAction={() => setStarting(true)} /> : (
        <Card padded={false}>
          {q.data.conversations.map((cv, i) => (
            <Pressable key={cv.id} onPress={() => nav.navigate('Thread', { id: cv.id, title: cv.with })} style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: '#0000000d', alignItems: 'center' }}>
              <Avatar name={cv.with} uri={cv.with_avatar} size={44} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>{cv.with}</Txt>
                  <Txt variant="caption" tone="faint">{when(cv.last_message_at)}</Txt>
                </View>
                <Txt variant="caption" tone="muted" numberOfLines={1}>{cv.subject ? `${cv.subject} · ` : ''}{cv.preview ?? ''}</Txt>
              </View>
              {cv.unread ? <Badge label={String(cv.unread)} tone="accent" /> : null}
            </Pressable>
          ))}
        </Card>
      )}
      {q.data ? <StartSheet visible={starting} inbox={q.data} base={base} onClose={() => setStarting(false)} onStarted={(id) => { setStarting(false); void q.refresh(); if (id) { nav.navigate('Thread', { id, title: 'Conversation' }); } }} /> : null}
    </Screen>
  );
}

function StartSheet({ visible, inbox, base, onClose, onStarted }: { visible: boolean; inbox: Inbox; base: string; onClose: () => void; onStarted: (id: number) => void }) {
  const { c, spacing } = useTheme();
  const f = useForm<Record<string, any>>({ client_id: null, lawyer_id: null, starter: null, subject: '' });
  const client = !!inbox.starters;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt variant="heading">New conversation</Txt>
          <Pressable onPress={onClose} hitSlop={10}><Feather name="x" size={22} color={c.text} /></Pressable>
        </View>
        {f.message ? <Alert tone={f.message.tone} message={f.message.text} /> : null}
        {client ? (
          <Picker label="Your lawyer" required value={f.values.starter} options={(inbox.starters ?? []).map((s, i) => ({ value: i, label: s.label }))} onChange={(i) => { const s = inbox.starters![i as number]; f.setValues((v) => ({ ...v, starter: i, client_id: s.client_id, lawyer_id: s.lawyer_id })); }} error={f.errors.client_id ?? f.errors.lawyer_id} />
        ) : (
          <Picker label="Client" required value={f.values.client_id} options={inbox.clients ?? []} onChange={(x) => f.set('client_id', x)} error={f.errors.client_id} />
        )}
        <Input label="Subject" value={f.values.subject} onChangeText={(t) => f.set('subject', t)} error={f.errors.subject} />
        <Button title="Start" full loading={f.busy} onPress={() => void f.submit(({ starter, ...values }) => webPost(base, values), (r) => onStarted(Number(r.params?.conversation)))} />
      </View>
    </Modal>
  );
}

/** Same as the web chat: one grey tick = sent, two grey = delivered, two blue = read. */
function Ticks({ status }: { status: string | null }) {
  const { c } = useTheme();
  if (status === 'read') return <MaterialCommunityIcons name="check-all" size={16} color="#34B7F1" accessibilityLabel="Read" />;
  if (status === 'delivered') return <MaterialCommunityIcons name="check-all" size={16} color={c.textFaint} accessibilityLabel="Delivered" />;
  return <MaterialCommunityIcons name="check" size={16} color={c.textFaint} accessibilityLabel="Sent" />;
}

export function ThreadScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Thread'>>();
  const base = useBase();
  const nav = useAppNavigation();
  const { c, spacing, radius } = useTheme();
  const q = useQuery(() => webPage<{ active: { subject: string | null; with: string; messages: Message[] } }>(`${base}/${params.id}`), [params.id]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);

  const { refreshUser } = useAuth();
  useEffect(() => { nav.setOptions({ title: q.data?.active.with ?? params.title }); }, [q.data, nav, params.title]);
  useEffect(() => { if (q.data) void refreshUser().catch(() => undefined); }, [q.data?.active.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => void q.refresh(), 8000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (file?: DocumentPicker.DocumentPickerAsset) => {
    if (!text.trim() && !file) return;
    setBusy(true);
    setError(null);
    try {
      await webPost(`${base}/${params.id}`, file ? formData({ body: text.trim() }, { field: 'attachment', uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' }) : { body: text.trim() });
      setText('');
      await q.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const attach = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) void send(res.assets[0]);
  };

  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const messages = q.data.active.messages;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<EmptyState icon="message-circle" title="No messages yet" />}
        renderItem={({ item: m }) => (
          <View style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, borderBottomRightRadius: m.mine ? 4 : radius.lg, borderBottomLeftRadius: m.mine ? radius.lg : 4, backgroundColor: m.mine ? c.primary : c.surfaceAlt }}>
              {m.body ? <Txt style={{ color: m.mine ? c.primaryText : c.text }}>{m.body}</Txt> : null}
              {m.attachment ? (
                <Pressable onPress={() => void openFile(`${base}/${params.id}/attachments/${m.id}`, m.attachment!.name).catch((e) => setError(errorMessage(e)))} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: m.body ? 6 : 0 }}>
                  <Feather name="paperclip" size={14} color={m.mine ? c.primaryText : c.primary} />
                  <Txt variant="label" style={{ color: m.mine ? c.primaryText : c.primary }} numberOfLines={1}>{m.attachment.name}</Txt>
                </Pressable>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: m.mine ? 'flex-end' : 'flex-start', marginTop: 2 }}>
              <Txt variant="caption" tone="faint">{when(m.created_at)}</Txt>
              {m.mine ? <Ticks status={m.status} /> : null}
            </View>
          </View>
        )}
      />
      {error ? <View style={{ paddingHorizontal: spacing.lg }}><Alert tone="danger" message={error} /></View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        <Pressable onPress={() => void attach()} hitSlop={8} style={{ padding: 8 }}><Feather name="paperclip" size={20} color={c.textMuted} /></Pressable>
        <TextInput value={text} onChangeText={setText} placeholder="Write a message" placeholderTextColor={c.textFaint} multiline maxLength={5000} style={{ flex: 1, maxHeight: 120, minHeight: 42, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: c.surfaceAlt, color: c.text, fontFamily: fontFamily.regular, fontSize: 15 }} />
        <Pressable onPress={() => void send()} disabled={busy || !text.trim()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: text.trim() ? c.primary : c.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="send" size={18} color={c.primaryText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
