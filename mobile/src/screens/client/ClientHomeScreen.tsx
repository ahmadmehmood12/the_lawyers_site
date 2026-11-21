import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, View } from 'react-native';

import { clientApi, directoryApi } from '@/api';
import { Avatar, Badge, Card, ErrorState, FirmCard, IconButton, LawyerCard, Screen, SectionHeader, Skeleton, SkeletonCard, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useClientTabNavigation } from '@/navigation/tabs';
import { useAppNavigation } from '@/navigation/types';
import { forest, useTheme, white } from '@/theme';

/** Client home: search, practice areas, my next consultations, top lawyers and firms. */
export function ClientHomeScreen() {
  const { user } = useAuth();
  const nav = useAppNavigation();
  const tabs = useClientTabNavigation();
  const { c, spacing, radius } = useTheme();
  const home = useQuery(() => directoryApi.home());
  const mine = useQuery(() => clientApi.dashboard());
  const refresh = () => { void home.refresh(); void mine.refresh(); };
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <Screen padded={false} refreshing={home.refreshing} onRefresh={refresh} edges={[]}>
      <LinearGradient colors={[forest[800], forest[900]]} style={{ paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: 56 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={user?.name ?? 'You'} uri={user?.avatar_url} size={42} tone="accent" />
            <View>
              <Txt variant="caption" style={{ color: forest[200] }}>Assalam-o-Alaikum</Txt>
              <Txt variant="subtitle" style={{ color: white }}>{firstName}</Txt>
            </View>
          </View>
          <IconButton icon="bell" tone="onPrimary" badge={(user?.unread.notifications ?? 0) > 0} onPress={() => nav.navigate('Notifications')} />
        </View>
        <Txt variant="title" style={{ color: white, marginTop: spacing.xl }}>Find the right lawyer</Txt>
        <Txt style={{ color: forest[200], marginTop: 4 }}>Verified advocates across Pakistan</Txt>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.xl, marginTop: -28 }}>
        <Pressable onPress={() => tabs.navigate('FindLawyers')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 15, borderWidth: 1, borderColor: c.border, shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
          <Feather name="search" size={18} color={c.textFaint} />
          <Txt tone="faint" style={{ flex: 1 }}>Search by name, city or practice area</Txt>
          <Feather name="sliders" size={16} color={c.primary} />
        </Pressable>
      </View>

      <View style={{ padding: spacing.xl, gap: spacing['2xl'] }}>
        {home.error ? <ErrorState message={home.error} onRetry={home.reload} /> : null}

        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Practice areas" actionLabel="All" onAction={() => tabs.navigate('FindLawyers')} />
          {home.loading ? <Skeleton height={36} /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {home.data?.specializations.map((s) => (
                <Pressable key={s.slug} onPress={() => tabs.navigate('FindLawyers', { specialization: s.slug })} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Txt variant="label">{s.name}</Txt>
                  {s.count ? <Txt variant="caption" tone="faint">{s.count}</Txt> : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {mine.data && mine.data.appointments.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Your next consultation" actionLabel="All" onAction={() => tabs.navigate('ClientAppointments')} />
            {mine.data.appointments.slice(0, 2).map((a) => (
              <Card key={a.id} onPress={() => tabs.navigate('ClientAppointments')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ width: 52, alignItems: 'center', paddingVertical: 6, borderRadius: radius.md, backgroundColor: c.primarySoft }}>
                    <Txt variant="caption" tone="accent">{new Date(a.starts_at).toLocaleDateString('en-PK', { month: 'short' }).toUpperCase()}</Txt>
                    <Txt variant="heading">{new Date(a.starts_at).getDate()}</Txt>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="subtitle">{a.lawyer}</Txt>
                    <Txt variant="label" tone="muted" weight="500">{new Date(a.starts_at).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })} · {a.mode}</Txt>
                  </View>
                  <Badge label={a.status_label} tone={statusTone(a.status)} />
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Top lawyers" actionLabel="See all" onAction={() => tabs.navigate('FindLawyers')} />
          {home.loading ? <><SkeletonCard /><SkeletonCard /></> : home.data?.lawyers.map((l) => <LawyerCard key={l.slug} lawyer={l} onPress={() => nav.navigate('LawyerProfile', { slug: l.slug })} />)}
        </View>

        {home.data?.firms.length ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Law firms" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {home.data.firms.map((f) => <FirmCard key={f.slug} firm={f} compact onPress={() => nav.navigate('FirmProfile', { slug: f.slug })} />)}
            </ScrollView>
          </View>
        ) : null}

        {home.data?.courtHolidays.length ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Upcoming court holidays" />
            <Card>
              {home.data.courtHolidays.slice(0, 4).map((h, i) => (
                <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                  <Txt variant="label" style={{ flex: 1 }}>{h.title}</Txt>
                  <Txt variant="caption" tone="muted">{new Date(h.starts_on).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}{h.days > 1 ? ` · ${h.days} days` : ''}</Txt>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
