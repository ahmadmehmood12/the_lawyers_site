import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { workspaceApi, type Hearing } from '@/api';
import { Alert, Avatar, Badge, Card, EmptyState, ErrorState, IconButton, Screen, SectionHeader, SkeletonCard, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/hooks/useQuery';
import { formatPkr } from '@/lib/format';
import { statusTone } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { forest, useTheme, white } from '@/theme';

/** Lawyer / firm dashboard: the same numbers as the web dashboard (GET /api/v1/workspace/dashboard). */
export function WorkspaceHomeScreen({ onOpenTab }: { onOpenTab: (tab: 'cases' | 'diary' | 'appointments') => void }) {
  const { user } = useAuth();
  const nav = useAppNavigation();
  const { c, spacing, radius } = useTheme();
  const q = useQuery(() => workspaceApi.dashboard());
  const d = q.data;
  const firm = user?.organization?.type === 'firm';

  const kpis = d ? [
    { icon: 'briefcase' as const, value: d.stats.activeCases, label: 'Active cases', onPress: () => onOpenTab('cases') },
    { icon: 'calendar' as const, value: d.stats.todayHearings, label: 'Hearings today', onPress: () => onOpenTab('diary') },
    { icon: 'inbox' as const, value: d.stats.consultationRequests ?? 0, label: 'Requests', onPress: () => onOpenTab('appointments') },
    { icon: 'check-square' as const, value: d.stats.pendingTasks, label: 'My tasks' },
  ] : [];

  return (
    <Screen padded={false} edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <LinearGradient colors={[forest[800], forest[900]]} style={{ paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: 64 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
            <Avatar name={user?.name ?? ''} uri={user?.avatar_url} size={44} tone="accent" />
            <View style={{ flex: 1 }}>
              <Txt variant="caption" style={{ color: forest[200] }}>{firm ? user?.organization?.name : 'Chambers'}</Txt>
              <Txt variant="subtitle" style={{ color: white }} numberOfLines={1}>{user?.name}</Txt>
            </View>
          </View>
          <IconButton icon="bell" tone="onPrimary" badge={(user?.unread.notifications ?? 0) > 0} onPress={() => nav.navigate('Notifications')} />
        </View>
        <Txt variant="title" style={{ color: white, marginTop: spacing.xl }}>{new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</Txt>
        <Txt style={{ color: forest[200], marginTop: 4 }}>
          {d ? `${d.stats.todayHearings} hearing${d.stats.todayHearings === 1 ? '' : 's'} today · ${d.stats.upcomingHearings} this week` : 'Loading your day…'}
        </Txt>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.xl, marginTop: -40, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(d ? kpis : Array.from({ length: 4 }).map(() => null)).map((k, i) => (
          <Pressable key={i} onPress={k?.onPress} style={{ width: '48.5%', backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.border, shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
            {k ? (
              <>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={k.icon} size={17} color={c.primary} />
                </View>
                <Txt variant="title" style={{ marginTop: spacing.sm }}>{k.value}</Txt>
                <Txt variant="caption" tone="muted">{k.label}</Txt>
              </>
            ) : <View style={{ height: 82 }} />}
          </Pressable>
        ))}
      </View>

      <View style={{ padding: spacing.xl, gap: spacing['2xl'] }}>
        {q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : null}
        {d?.profile && d.profile.verification_status !== 'approved' ? (
          <Alert tone="warning" title={`Profile: ${d.profile.verification_label}`} message="Complete verification on the website to appear in the public directory." />
        ) : null}

        {d && (d.stats.monthRevenue !== null || d.stats.outstanding !== null) ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {d.stats.monthRevenue !== null ? <Card style={{ flex: 1 }}><Txt variant="caption" tone="muted">Collected this month</Txt><Txt variant="heading" tone="success">{formatPkr(d.stats.monthRevenue)}</Txt></Card> : null}
            {d.stats.outstanding !== null ? <Card style={{ flex: 1 }}><Txt variant="caption" tone="muted">Outstanding</Txt><Txt variant="heading" tone="warning">{formatPkr(d.stats.outstanding)}</Txt></Card> : null}
          </View>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Today's hearings" actionLabel="Diary" onAction={() => onOpenTab('diary')} />
          {q.loading ? <SkeletonCard /> : !d?.todayHearings.length ? <EmptyState icon="sun" title="No hearings today" /> : d.todayHearings.map((h) => <HearingRow key={h.id} h={h} onPress={() => h.case && nav.navigate('CaseDetail', { id: h.case.id })} />)}
        </View>

        {d?.upcoming.length ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Next 14 days" />
            {d.upcoming.map((h) => <HearingRow key={h.id} h={h} onPress={() => h.case && nav.navigate('CaseDetail', { id: h.case.id })} showDate />)}
          </View>
        ) : null}

        {d?.tasks.length ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="My open tasks" />
            <Card>
              {d.tasks.map((t, i) => (
                <View key={t.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                  <Feather name="circle" size={16} color={t.overdue ? c.danger : c.textFaint} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="label">{t.title}</Txt>
                    <Txt variant="caption" tone={t.overdue ? 'danger' : 'muted'}>{[t.case?.title, t.due_date && `Due ${new Date(t.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`].filter(Boolean).join(' · ')}</Txt>
                  </View>
                  <Badge label={t.priority_label} tone={t.priority_label.toLowerCase() === 'high' ? 'danger' : 'neutral'} />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {d?.breakdown.bySpecialization.length ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Open cases by practice area" />
            <Card>
              {d.breakdown.bySpecialization.map((b) => {
                const max = Math.max(...d.breakdown.bySpecialization.map((x) => x.value), 1);
                return (
                  <View key={b.label} style={{ marginVertical: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt variant="label">{b.label}</Txt><Txt variant="label" tone="muted">{b.value}</Txt></View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, marginTop: 4 }}><View style={{ height: 6, borderRadius: 3, width: `${(b.value / max) * 100}%`, backgroundColor: c.primary }} /></View>
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}

        {d?.activity.length ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Recent activity" />
            <Card>
              {d.activity.slice(0, 6).map((a, i) => (
                <View key={a.id} style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                  <Avatar name={a.actor ?? '•'} uri={a.actor_avatar} size={28} tone="neutral" />
                  <View style={{ flex: 1 }}>
                    <Txt variant="label" weight="500">{a.sentence}</Txt>
                    <Txt variant="caption" tone="faint">{new Date(a.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Txt>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

export function HearingRow({ h, onPress, showDate }: { h: Hearing; onPress?: () => void; showDate?: boolean }) {
  const { c, spacing, radius } = useTheme();
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ width: 58, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radius.md, backgroundColor: c.primarySoft }}>
          {showDate ? (
            <>
              <Txt variant="caption" tone="accent">{new Date(h.hearing_date).toLocaleDateString('en-PK', { month: 'short' }).toUpperCase()}</Txt>
              <Txt variant="heading">{new Date(h.hearing_date).getDate()}</Txt>
            </>
          ) : <Txt variant="label" tone="accent">{h.hearing_time ?? 'TBA'}</Txt>}
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle" numberOfLines={1}>{h.case?.title ?? 'Hearing'}</Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>{[h.court, h.purpose].filter(Boolean).join(' · ')}</Txt>
          <View style={{ flexDirection: 'row', marginTop: 6 }}><Badge label={h.status_label} tone={statusTone(h.status)} /></View>
        </View>
      </View>
    </Card>
  );
}
