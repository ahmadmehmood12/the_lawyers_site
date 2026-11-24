import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Linking, Pressable, View } from 'react-native';

import { directoryApi } from '@/api';
import { Avatar, Badge, Button, Card, ErrorState, KeyValue, Loading, Screen, SectionHeader, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/hooks/useQuery';
import { setPending } from '@/lib/pending';
import { formatPkr } from '@/lib/format';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

/** Full public profile, the same data as the website profile page. */
export function LawyerProfileScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'LawyerProfile'>>();
  const nav = useAppNavigation();
  const { role, user } = useAuth();
  const { c, spacing, radius } = useTheme();
  const q = useQuery(() => directoryApi.lawyer(params.slug), [params.slug]);

  if (q.loading) {
    return <Loading label="Loading profile…" />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const { lawyer, stats, canBook, isFavourite } = q.data;

  const toggleFavourite = async () => {
    const { data } = await directoryApi.toggleFavourite(lawyer.slug);
    q.setData({ ...q.data!, isFavourite: data.is_favourite });
  };

  return (
    <Screen edges={[]} footer={(role === 'client' || !user) && canBook ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Txt variant="caption" tone="muted">Consultation</Txt>
          <Txt variant="subtitle">{lawyer.fee_min ? formatPkr(lawyer.fee_min) : 'On request'}</Txt>
        </View>
        <Button title="Book consultation" icon="calendar" onPress={() => {
          if (!user) {
            // Browsing is open to everyone; booking needs an account. Resume this booking after sign-in.
            setPending({ screen: 'BookAppointment', params: { slug: lawyer.slug, name: lawyer.name } });
            nav.navigate('Login');
            return;
          }
          nav.navigate('BookAppointment', { slug: lawyer.slug, name: lawyer.name });
        }} />
      </View>
    ) : undefined}>
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md }}>
        <Avatar name={lawyer.name} uri={lawyer.photo_url} size={92} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt variant="title" center>{lawyer.name}</Txt>
          {lawyer.verified ? <Feather name="check-circle" size={20} color={c.success} /> : null}
        </View>
        {lawyer.headline ? <Txt tone="muted" center>{lawyer.headline}</Txt> : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
          {lawyer.verified ? <Badge label="Verified advocate" tone="success" /> : null}
          {lawyer.category_label ? <Badge label={lawyer.category_label} tone="neutral" /> : null}
          {lawyer.accepting_clients ? <Badge label="Accepting clients" tone="accent" /> : null}
        </View>
        {role === 'client' ? (
          <Pressable onPress={() => void toggleFavourite()} hitSlop={8} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
            <Feather name="heart" size={16} color={isFavourite ? c.danger : c.textMuted} />
            <Txt variant="label" tone={isFavourite ? 'danger' : 'muted'}>{isFavourite ? 'Saved' : 'Save lawyer'}</Txt>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
        {[
          { v: lawyer.years_experience ? `${lawyer.years_experience}+` : '—', l: 'Years' },
          { v: lawyer.rating ? lawyer.rating.toFixed(1) : '—', l: `${lawyer.rating_count} reviews` },
          { v: String(stats.cases_recorded), l: 'Cases' },
          { v: String(stats.courts_represented), l: 'Courts' },
        ].map((s) => (
          <View key={s.l} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: c.surfaceAlt }}>
            <Txt variant="heading">{s.v}</Txt>
            <Txt variant="caption" tone="muted">{s.l}</Txt>
          </View>
        ))}
      </View>

      <Section title="Practice areas">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {lawyer.specializations.map((s) => (
            <View key={s.slug} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.primarySoft }}>
              <Txt variant="label" tone="accent">{s.name}</Txt>
            </View>
          ))}
        </View>
      </Section>

      {lawyer.bio ? <Section title="About"><Card><Txt style={{ lineHeight: 22 }}>{lawyer.bio}</Txt></Card></Section> : null}

      <Section title="Practice details">
        <Card>
          <KeyValue label="Location" value={[lawyer.city, lawyer.district, lawyer.province].filter(Boolean).join(', ') || '—'} />
          <KeyValue label="Bar council" value={lawyer.bar_council ?? '—'} />
          {lawyer.enrollment_number ? <KeyValue label="Enrollment no." value={lawyer.enrollment_number} /> : null}
          <KeyValue label="Consultation" value={[lawyer.offers_online && 'Online', lawyer.offers_in_person && 'In person'].filter(Boolean).join(' · ') || '—'} />
          <KeyValue label="Fee" value={lawyer.fee_min ? `${formatPkr(lawyer.fee_min)}${lawyer.fee_max ? ` – ${formatPkr(lawyer.fee_max)}` : ''}` : 'On request'} />
          <KeyValue label="Languages" value={lawyer.languages.join(', ') || '—'} last={!lawyer.firms.length} />
          {lawyer.firms.length ? <KeyValue label="Firm" value={lawyer.firms.map((f) => f.name).join(', ')} last /> : null}
        </Card>
      </Section>

      {lawyer.courts.length ? <Section title="Courts"><Card>{lawyer.courts.map((ct, i) => <Row key={ct} icon="briefcase" text={ct} first={i === 0} />)}</Card></Section> : null}

      {lawyer.educations.length ? (
        <Section title="Education">
          <Card>{lawyer.educations.map((e, i) => <Row key={`${e.degree}${i}`} icon="book-open" text={e.degree} sub={[e.institution, e.year].filter(Boolean).join(' · ')} first={i === 0} />)}</Card>
        </Section>
      ) : null}

      {lawyer.experiences.length ? (
        <Section title="Experience">
          <Card>{lawyer.experiences.map((e, i) => <Row key={`${e.position}${i}`} icon="clock" text={`${e.position} · ${e.organization}`} sub={`${e.start_year ?? ''} – ${e.is_current ? 'Present' : e.end_year ?? ''}`} first={i === 0} />)}</Card>
        </Section>
      ) : null}

      {lawyer.reviews.length ? (
        <Section title={`Reviews (${lawyer.rating_count})`}>
          {lawyer.reviews.map((r) => (
            <Card key={r.id} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="label">{r.author}</Txt>
                <Txt variant="caption" tone="accent">{'★'.repeat(r.rating)}<Txt variant="caption" tone="faint">{'★'.repeat(5 - r.rating)}</Txt></Txt>
              </View>
              {r.title ? <Txt weight="600" style={{ marginTop: 6 }}>{r.title}</Txt> : null}
              <Txt tone="muted" style={{ marginTop: 4 }}>{r.comment}</Txt>
              {r.response ? <Txt variant="label" tone="accent" style={{ marginTop: 8 }}>Reply: <Txt variant="label" tone="muted" weight="400">{r.response}</Txt></Txt> : null}
            </Card>
          ))}
        </Section>
      ) : null}

      {lawyer.public_phone || lawyer.public_email ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
          {lawyer.public_phone ? <Button title="Call" icon="phone" variant="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(`tel:${lawyer.public_phone}`)} /> : null}
          {lawyer.public_email ? <Button title="Email" icon="mail" variant="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(`mailto:${lawyer.public_email}`)} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ marginTop: spacing['2xl'], gap: spacing.md }}><SectionHeader title={title} />{children}</View>;
}

function Row({ icon, text, sub, first }: { icon: keyof typeof Feather.glyphMap; text: string; sub?: string; first?: boolean }) {
  const { c, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: c.border }}>
      <Feather name={icon} size={16} color={c.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Txt variant="label">{text}</Txt>
        {sub ? <Txt variant="caption" tone="muted">{sub}</Txt> : null}
      </View>
    </View>
  );
}
