import { useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { directoryApi, errorMessage, type FirmCard as Firm, type LawyerCard as Lawyer, type Specialization } from '@/api';
import { Chip, EmptyState, ErrorState, FirmCard, Input, LawyerCard, SegmentedControl, SkeletonCard, Txt } from '@/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ClientTabsParamList } from '@/navigation/types';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

type Mode = 'lawyers' | 'firms';

/** Lawyer & law-firm directory with search, practice-area chips and filters (same query as /lawyers on the web). */
export function FindLawyersScreen() {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<ClientTabsParamList, 'FindLawyers'>>();
  const { c, spacing } = useTheme();
  const [mode, setMode] = useState<Mode>('lawyers');
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState<string | undefined>(route.params?.specialization);
  const [verified, setVerified] = useState(false);
  const [online, setOnline] = useState(false);
  const [sort, setSort] = useState<'' | 'rating' | 'experience'>('');
  const [areas, setAreas] = useState<Specialization[]>([]);
  const [items, setItems] = useState<(Lawyer | Firm)[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = useDebouncedValue(search, 350);

  useEffect(() => { if (route.params?.specialization) { setMode('lawyers'); setSpecialization(route.params.specialization); } }, [route.params?.specialization]);
  useEffect(() => { directoryApi.specializations().then(setAreas).catch(() => undefined); }, []);

  const load = useCallback(async (p: number, how: 'reset' | 'more' | 'refresh') => {
    how === 'refresh' ? setRefreshing(true) : how === 'reset' && setLoading(true);
    setError(null);
    try {
      const result = mode === 'lawyers'
        ? await directoryApi.lawyers({ search: q, specialization, verified: verified ? '1' : undefined, online: online ? '1' : undefined, sort: sort || undefined, page: p, per_page: 12 })
        : await directoryApi.firms({ search: q, page: p });
      setItems((prev) => (p === 1 ? result.items : [...prev, ...result.items]));
      setPage(result.meta.current_page);
      setLastPage(result.meta.last_page);
      setTotal(result.meta.total);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, q, specialization, verified, online, sort]);

  useEffect(() => { void load(1, 'reset'); }, [load]);

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <Txt variant="title">Find {mode === 'lawyers' ? 'a lawyer' : 'a law firm'}</Txt>
      <SegmentedControl<Mode> value={mode} onChange={(m) => { setItems([]); setMode(m); }} options={[{ value: 'lawyers', label: 'Lawyers' }, { value: 'firms', label: 'Law firms' }]} />
      <Input icon="search" placeholder={mode === 'lawyers' ? 'Name or expertise' : 'Firm name'} value={search} onChangeText={setSearch} returnKeyType="search" />
      {mode === 'lawyers' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <Chip label="All areas" selected={!specialization} onPress={() => setSpecialization(undefined)} />
            {areas.map((a) => <Chip key={a.slug} label={a.name} selected={specialization === a.slug} onPress={() => setSpecialization(specialization === a.slug ? undefined : a.slug)} />)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <Chip icon="check-circle" label="Verified" selected={verified} onPress={() => setVerified(!verified)} />
            <Chip icon="video" label="Online" selected={online} onPress={() => setOnline(!online)} />
            <Chip icon="star" label="Top rated" selected={sort === 'rating'} onPress={() => setSort(sort === 'rating' ? '' : 'rating')} />
            <Chip icon="award" label="Most experienced" selected={sort === 'experience'} onPress={() => setSort(sort === 'experience' ? '' : 'experience')} />
          </ScrollView>
        </>
      ) : null}
      {!loading ? <Txt variant="caption" tone="muted">{total} {mode === 'lawyers' ? 'lawyers' : 'firms'} found</Txt> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
        ListHeaderComponent={header}
        renderItem={({ item }) => mode === 'lawyers'
          ? <LawyerCard lawyer={item as Lawyer} onPress={() => nav.navigate('LawyerProfile', { slug: item.slug })} />
          : <FirmCard firm={item as Firm} onPress={() => nav.navigate('FirmProfile', { slug: item.slug })} />}
        ListEmptyComponent={loading ? <View style={{ gap: spacing.md }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View> : error ? <ErrorState message={error} onRetry={() => void load(1, 'reset')} /> : <EmptyState icon="search" title="No matches" message="Try another name, city or practice area." />}
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (!loading && page < lastPage) { void load(page + 1, 'more'); } }}
        ListFooterComponent={!loading && page < lastPage ? <ActivityIndicator color={c.primary} style={{ margin: spacing.lg }} /> : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, 'refresh')} tintColor={c.primary} />}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

