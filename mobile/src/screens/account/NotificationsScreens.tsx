import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { accountApi, errorMessage, type AppNotification } from '@/api';
import { Alert, Button, Card, EmptyState, ErrorState, Loading, Screen, SkeletonCard, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/hooks/useQuery';
import { openNotificationTarget } from '@/lib/notificationTarget';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = { appointment: 'calendar', hearing_reminder: 'bell', hearing_update: 'briefcase', payment: 'credit-card', message: 'message-circle', case_update: 'folder', document_request: 'file', review: 'star' };

/** In-app notifications (the same list as the web bell). */
export function NotificationsScreen() {
  const { c, spacing } = useTheme();
  const { refreshUser, role } = useAuth();
  const nav = useAppNavigation();
  const q = useQuery(() => accountApi.notifications());
  const items = q.data?.items ?? [];

  const markRead = async (n: AppNotification) => {
    if (n.read_at) {
      return;
    }
    await accountApi.readNotification(n.id).catch(() => undefined);
    q.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) });
    void refreshUser();
  };

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      {items.some((n) => !n.read_at) ? (
        <Button title="Mark all as read" icon="check" size="sm" variant="ghost" style={{ alignSelf: 'flex-end', marginBottom: spacing.sm }} onPress={async () => { await accountApi.readAllNotifications(); void q.refresh(); void refreshUser(); }} />
      ) : null}
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !items.length ? <EmptyState icon="bell" title="You're all caught up" message="Appointment, hearing and payment updates appear here." /> : (
        <View style={{ gap: spacing.sm }}>
          {items.map((n) => (
            <Pressable key={n.id} onPress={() => { void markRead(n); openNotificationTarget(nav, n.data, role); }}>
              <Card style={{ flexDirection: 'row', gap: spacing.md, backgroundColor: n.read_at ? c.surface : c.primarySoft }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}>
                  <Feather name={ICONS[n.data.event ?? ''] ?? 'bell'} size={16} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="label" weight={n.read_at ? '500' : '700'}>{n.data.title}</Txt>
                  <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{n.data.body}</Txt>
                  <Txt variant="caption" tone="faint" style={{ marginTop: 4 }}>{new Date(n.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Txt>
                </View>
                {!n.read_at ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, marginTop: 6 }} /> : null}
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const EVENT_LABELS: Record<string, string> = { hearing_reminder: 'Hearing reminders', hearing_update: 'Hearing changes', appointment: 'Appointments', payment: 'Payments', message: 'Messages', case_update: 'Case updates', document_request: 'Document requests', article_update: 'Articles', review: 'Reviews' };

/** Per-event channel switches (in-app, email, WhatsApp, mobile push) — saved to the same table as the web. */
export function NotificationPrefsScreen() {
  const { c, spacing } = useTheme();
  const q = useQuery(() => accountApi.preferences());
  const [state, setState] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!q.data) {
      return;
    }
    const next: Record<string, boolean> = {};
    q.data.events.forEach((e) => q.data!.channels.forEach((ch) => { next[`${e}|${ch.value}`] = q.data!.defaults[ch.value] ?? false; }));
    q.data.preferences.forEach((p) => { next[`${p.event}|${p.channel}`] = p.enabled; });
    setState(next);
  }, [q.data]);

  if (q.loading) {
    return <Loading />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const { events, channels, whatsapp_consent } = q.data;

  const save = async () => {
    setBusy(true);
    try {
      await accountApi.savePreferences(Object.entries(state).map(([k, enabled]) => { const [event, channel] = k.split('|'); return { event, channel, enabled }; }));
      setNotice({ tone: 'success', text: 'Notification preferences saved.' });
    } catch (e) {
      setNotice({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} footer={<Button title="Save preferences" full size="lg" loading={busy} onPress={() => void save()} />}>
      {notice ? <View style={{ marginBottom: spacing.md }}><Alert tone={notice.tone} message={notice.text} /></View> : null}
      {!whatsapp_consent ? <View style={{ marginBottom: spacing.md }}><Alert tone="info" message="WhatsApp messages need your opt-in in Account settings on the website first." /></View> : null}
      <View style={{ gap: spacing.md }}>
        {events.map((e) => (
          <Card key={e}>
            <Txt variant="subtitle" style={{ marginBottom: spacing.sm }}>{EVENT_LABELS[e] ?? e}</Txt>
            {channels.map((ch, i) => {
              const key = `${e}|${ch.value}`;
              const locked = ch.value === 'whatsapp' && !whatsapp_consent;
              return (
                <View key={ch.value} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                  <Txt variant="label" weight="500" tone={locked ? 'faint' : 'default'}>{ch.label}</Txt>
                  <Switch disabled={locked} value={!locked && !!state[key]} onValueChange={(v) => setState((s) => ({ ...s, [key]: v }))} trackColor={{ true: c.primary, false: c.borderStrong }} />
                </View>
              );
            })}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
