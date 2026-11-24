import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { errorMessage, openFile, webPage } from '@/api';
import { Alert, Badge, Button, Card, Chip, EmptyState, ErrorState, Input, KeyValue, Loading, Picker, Screen, SectionHeader, SkeletonCard, Txt } from '@/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQuery } from '@/hooks/useQuery';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type JOption = { value: string; label: string; courts: string[] };
type Judgment = { id: number; slug: string; court_short: string; court_name: string; case_type: string; case_number: string; title: string; judges: string; bench_label: string | null; citation: string | null; decision_date: string | null; match_snippets?: { page: number; segments: { text: string; hit: boolean }[] }[] };
type Page = { judgments: { data: Judgment[]; total: number }; courts: { key: string; short: string; count: number }[]; judges: JOption[]; pairs: JOption[]; years: number[] };

/** Reported judgments (web /reported-judgments): full-text search with highlighted excerpts and the same filters. */
export function JudgmentsScreen() {
  const nav = useAppNavigation();
  const { c, spacing } = useTheme();
  const [text, setText] = useState('');
  const [court, setCourt] = useState('');
  const [judge, setJudge] = useState<string | null>(null);
  const [bench, setBench] = useState('');
  const [pair, setPair] = useState<string | null>(null);
  const [citation, setCitation] = useState('');
  const [more, setMore] = useState(false);
  const [extra, setExtra] = useState({ year: '', case: '', title: '', decided_from: '', decided_to: '', uploaded_from: '', uploaded_to: '' });
  const t = useDebouncedValue(text, 450);
  const cit = useDebouncedValue(citation, 450);
  const ex = useDebouncedValue(extra, 450);
  const setX = (k: keyof typeof extra, v: string) => setExtra((e) => ({ ...e, [k]: v }));
  const activeExtra = Object.values(extra).filter(Boolean).length;
  // The same query parameters as the web filters (Public\ReportedJudgmentController::filtered()).
  const q = useQuery(() => webPage<Page>('/judgments', { text: t, court, judge: judge ?? undefined, bench: bench || undefined, pair: pair ?? undefined, citation: cit, ...ex }), [t, court, judge, bench, pair, cit, ex]);
  const pickCourt = (key: string) => { setCourt(key); setJudge(null); setPair(null); };

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ gap: spacing.md }}>
        <Input icon="search" placeholder='Search inside judgments, e.g. "pre-arrest bail"' value={text} onChangeText={setText} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip label="All courts" selected={!court} onPress={() => pickCourt('')} />
          {q.data?.courts.map((co) => <Chip key={co.key} label={`${co.short} · ${co.count}`} selected={court === co.key} onPress={() => pickCourt(co.key)} />)}
        </ScrollView>
        <Picker label="Hon’ble Judge" value={judge} options={(q.data?.judges ?? []).map((j) => ({ value: j.value, label: court ? j.label : `${j.label} · ${j.courts.join(', ')}` }))} onChange={setJudge} placeholder="All judges" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[['', 'All benches'], ['single', 'Single bench'], ['division', 'Division bench']].map(([v, l]) => <Chip key={v} label={l} selected={bench === v} onPress={() => setBench(v)} />)}
        </View>
        <Picker label="Division bench judges" value={pair} options={(q.data?.pairs ?? []).map((p) => ({ value: p.value, label: p.label }))} onChange={setPair} placeholder="All pairs" />
        <Input icon="hash" placeholder="Citation, e.g. 2025 PTD 876" value={citation} onChangeText={setCitation} />
        <Pressable onPress={() => setMore(!more)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} hitSlop={6}>
          <Feather name={more ? 'chevron-up' : 'sliders'} size={15} color={c.accent} />
          <Txt variant="label" tone="accent">{more ? 'Fewer filters' : `More filters${activeExtra ? ` (${activeExtra})` : ''}`}</Txt>
        </Pressable>
        {more ? (
          <View style={{ gap: spacing.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              <Chip label="Any year" selected={!extra.year} onPress={() => setX('year', '')} />
              {q.data?.years.map((y) => <Chip key={y} label={String(y)} selected={extra.year === String(y)} onPress={() => setX('year', String(y))} />)}
            </ScrollView>
            <Input label="Case number" placeholder="e.g. 21229/26 or Civil Revision" value={extra.case} onChangeText={(v) => setX('case', v)} />
            <Input label="Title" placeholder="Party names, e.g. Muhammad Irfan" value={extra.title} onChangeText={(v) => setX('title', v)} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Input label="Decided from" placeholder="YYYY-MM-DD" value={extra.decided_from} onChangeText={(v) => setX('decided_from', v)} maxLength={10} /></View>
              <View style={{ flex: 1 }}><Input label="Decided to" placeholder="YYYY-MM-DD" value={extra.decided_to} onChangeText={(v) => setX('decided_to', v)} maxLength={10} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Input label="Uploaded from" placeholder="YYYY-MM-DD" value={extra.uploaded_from} onChangeText={(v) => setX('uploaded_from', v)} maxLength={10} /></View>
              <View style={{ flex: 1 }}><Input label="Uploaded to" placeholder="YYYY-MM-DD" value={extra.uploaded_to} onChangeText={(v) => setX('uploaded_to', v)} maxLength={10} /></View>
            </View>
            {activeExtra ? <Button title="Clear these filters" variant="ghost" size="sm" onPress={() => setExtra({ year: '', case: '', title: '', decided_from: '', decided_to: '', uploaded_from: '', uploaded_to: '' })} /> : null}
          </View>
        ) : null}
        {q.data ? <Txt variant="caption" tone="muted">{q.data.judgments.total} judgments</Txt> : null}
      </View>
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.judgments.data.length ? <EmptyState icon="book" title="No judgments found" /> : q.data.judgments.data.map((j) => (
          <Card key={j.id} onPress={() => nav.navigate('JudgmentDetail', { slug: j.slug })}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Badge label={j.court_short} tone="accent" />
              {j.bench_label ? <Badge label={j.bench_label} /> : null}
              {j.citation ? <Txt variant="caption" weight="700">{j.citation}</Txt> : null}
            </View>
            <Txt variant="subtitle" style={{ marginTop: 6 }} numberOfLines={2}>{j.title}</Txt>
            <Txt variant="caption" tone="muted">{j.case_type} {j.case_number}{j.decision_date ? ` · ${j.decision_date}` : ''}</Txt>
            {j.match_snippets?.slice(0, 1).map((s) => (
              <View key={s.page} style={{ marginTop: spacing.sm, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: c.accent }}>
                <Txt variant="caption" tone="faint">Page {s.page}</Txt>
                <Txt variant="label" weight="400" tone="muted">
                  {s.segments.map((g, i) => (g.hit ? <Txt key={i} variant="label" weight="700" style={{ backgroundColor: c.accentSoft, color: c.text }}>{g.text}</Txt> : g.text))}
                </Txt>
              </View>
            ))}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

type Detail = { judgment: Judgment & { cited_citations: string[]; tag_line: string | null; remarks: string | null; other_citation: string | null; sc_citation: string | null; apex_court_status: string | null; uploaded_on: string; summary: { headline?: string; points?: string[] } | null }; related: Judgment[]; canDownloadPdf: boolean };

export function JudgmentDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'JudgmentDetail'>>();
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const q = useQuery(() => webPage<Detail>(`/judgments/${params.slug}`), [params.slug]);
  const [error, setError] = useState<string | null>(null);
  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const j = q.data.judgment;
  const pdf = (download: boolean) => openFile(`/judgments/${j.slug}/pdf${download ? '/download' : ''}`, `${j.citation ?? j.case_number}.pdf`).catch((e) => setError(errorMessage(e)));
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <View style={{ marginTop: spacing.xl, gap: spacing.sm }}><SectionHeader title={title} />{children}</View>;

  return (
    <Screen edges={[]}>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Badge label={j.court_name} tone="accent" />
        {j.bench_label ? <Badge label={j.bench_label === 'D.B.' ? 'Division Bench' : 'Single Bench'} /> : null}
      </View>
      <Txt variant="title" style={{ marginTop: spacing.sm }}>{j.title}</Txt>
      {error ? <View style={{ marginTop: spacing.md }}><Alert tone="danger" message={error} /></View> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        <Button title="Read PDF" icon="book-open" style={{ flex: 1 }} onPress={() => nav.navigate('PdfViewer', { path: `/judgments/${j.slug}/pdf`, title: j.citation ?? `${j.case_type} ${j.case_number}`, shareable: q.data!.canDownloadPdf })} />
        {q.data.canDownloadPdf ? <Button title="Download" icon="download" variant="secondary" onPress={() => void pdf(true)} /> : null}
      </View>
      {!q.data.canDownloadPdf ? <Txt variant="caption" tone="muted" style={{ marginTop: 6 }}><Feather name="lock" size={11} /> Downloading the PDF is available on paid plans.</Txt> : null}
      <Card style={{ marginTop: spacing.lg }}>
        <KeyValue label="Case" value={`${j.case_type} ${j.case_number}`} />
        <KeyValue label="Citation" value={[j.citation, j.other_citation, j.sc_citation].filter(Boolean).join(' · ') || '—'} />
        <KeyValue label="Judges" value={j.judges} />
        <KeyValue label="Decided" value={j.decision_date ?? '—'} />
        {j.apex_court_status ? <KeyValue label="Supreme Court" value={j.apex_court_status} /> : null}
        <KeyValue label="Uploaded" value={j.uploaded_on} last />
      </Card>
      {j.summary?.points?.length ? <Section title="Summary"><Card>{j.summary.headline ? <Txt weight="700">{j.summary.headline}</Txt> : null}{j.summary.points.map((p, i) => <Txt key={i} style={{ marginTop: 4 }}>• {p}</Txt>)}</Card></Section> : null}
      {j.tag_line ? <Section title="Head note"><Card><Txt>{j.tag_line}</Txt></Card></Section> : null}
      {j.remarks ? <Section title="Remarks"><Card><Txt>{j.remarks}</Txt></Card></Section> : null}
      {j.cited_citations.length ? <Section title={`Case law cited (${j.cited_citations.length})`}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{j.cited_citations.map((x) => <Chip key={x} label={x} />)}</View></Section> : null}
      {q.data.related.length ? <Section title="More from this bench">{q.data.related.map((r) => <Card key={r.id} onPress={() => nav.push('JudgmentDetail', { slug: r.slug })}><Txt variant="label">{r.title}</Txt><Txt variant="caption" tone="muted">{r.citation ?? `${r.case_type} ${r.case_number}`}</Txt></Card>)}</Section> : null}
    </Screen>
  );
}
