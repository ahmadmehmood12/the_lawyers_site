import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import { errorMessage, webPage, webPost } from '@/api';
import { Alert, Badge, Button, Card, Chip, EmptyState, ErrorState, Input, Loading, Screen, SectionHeader, SkeletonCard, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQuery } from '@/hooks/useQuery';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

const WebView = RNWebView as unknown as React.ComponentType<Record<string, unknown>>;

export type ArticleCard = { slug: string; title: string; excerpt: string | null; author: string | null; category: string | null; published_at: string | null; language: string; views: number; likes: number };
type Index = { articles: { data: ArticleCard[]; total: number }; categories: { slug: string; name: string; count?: number }[]; tags: { slug: string; name: string }[]; topViewed: ArticleCard[]; topLiked: ArticleCard[] };

/** Legal articles (web /articles) — public: anyone can read, signed in or not. */
export function ArticlesScreen() {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const term = useDebouncedValue(search, 400);
  // Same filters as the web articles page: search, category, tag.
  const q = useQuery(() => webPage<Index>('/articles', { search: term, category: category || undefined, tag: tag || undefined }), [term, category, tag]);

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Txt variant="title">Legal articles</Txt>
      <Txt tone="muted" style={{ marginBottom: spacing.lg }}>Plain-language guides written by advocates.</Txt>
      <Input icon="search" placeholder="Search articles" value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}>
        <Chip label="All" selected={!category} onPress={() => setCategory('')} />
        {q.data?.categories.map((c) => <Chip key={c.slug} label={c.name} selected={category === c.slug} onPress={() => setCategory(c.slug)} />)}
      </ScrollView>
      {q.data?.tags?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          {q.data.tags.map((t) => <Chip key={t.slug} icon="hash" label={t.name} selected={tag === t.slug} onPress={() => setTag(tag === t.slug ? '' : t.slug)} />)}
        </ScrollView>
      ) : null}
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.articles.data.length ? <EmptyState icon="book-open" title="No articles found" /> : (
        <View style={{ gap: spacing.md }}>
          {q.data.articles.data.map((a) => <ArticleRow key={a.slug} article={a} onPress={() => nav.navigate('ArticleDetail', { slug: a.slug })} />)}
        </View>
      )}
    </Screen>
  );
}

export function ArticleRow({ article: a, onPress, compact }: { article: ArticleCard; onPress: () => void; compact?: boolean }) {
  const { c, spacing } = useTheme();
  return (
    <Card onPress={onPress} style={compact ? { width: 260 } : undefined}>
      {a.category ? <Badge label={a.category} tone="accent" /> : null}
      <Txt variant="subtitle" numberOfLines={2} style={{ marginTop: spacing.sm }}>{a.title}</Txt>
      {a.excerpt ? <Txt variant="label" weight="400" tone="muted" numberOfLines={compact ? 2 : 3} style={{ marginTop: 4 }}>{a.excerpt}</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.sm, alignItems: 'center' }}>
        {a.author ? <Txt variant="caption" tone="faint" numberOfLines={1} style={{ flexShrink: 1 }}>{a.author}</Txt> : null}
        <Txt variant="caption" tone="faint"><Feather name="eye" size={11} color={c.textFaint} /> {a.views}</Txt>
        <Txt variant="caption" tone="faint"><Feather name="heart" size={11} color={c.textFaint} /> {a.likes}</Txt>
      </View>
    </Card>
  );
}

type Show = { article: ArticleCard & { body: string; author_slug: string | null; tags: string[]; liked: boolean; updated_at: string | null }; related: ArticleCard[]; comments: { id: number; body: string; author?: string; user?: string; created_at: string }[] };

const articleHtml = (a: Show['article'], color: string, muted: string, bg: string, accent: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:18px 18px 30px;background:${bg};color:${color};font:17px/1.7 -apple-system,Roboto,sans-serif;direction:${a.language === 'ur' ? 'rtl' : 'ltr'}}
h1{font-size:25px;line-height:1.3;margin:0 0 8px}.meta{color:${muted};font-size:13px;margin-bottom:18px}img{max-width:100%;height:auto;border-radius:10px}
a{color:${accent}}blockquote{margin:12px 0;padding:6px 14px;border-left:3px solid ${accent};color:${muted}}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px}</style></head>
<body><h1>${a.title.replace(/</g, '&lt;')}</h1><div class="meta">${[a.author, a.category, a.published_at ? new Date(a.published_at).toDateString() : ''].filter(Boolean).join(' · ')}</div>${a.body}</body></html>`;

export function ArticleDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'ArticleDetail'>>();
  const nav = useAppNavigation();
  const { user } = useAuth();
  const { c, spacing } = useTheme();
  const q = useQuery(() => webPage<Show>(`/articles/${params.slug}`), [params.slug]);
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [tab, setTab] = useState<'read' | 'more'>('read');

  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const a = q.data.article;
  const act = async (fn: () => Promise<{ message: string }>) => {
    try { const { message } = await fn(); setNotice({ tone: 'success', text: message === 'OK' ? 'Done.' : message }); void q.refresh(); } catch (e) { setNotice({ tone: 'danger', text: errorMessage(e) }); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {tab === 'read' ? (
        <WebView originWhitelist={['*']} source={{ html: articleHtml(a, c.text, c.textMuted, c.bg, c.accent) }} style={{ flex: 1, backgroundColor: c.bg }} />
      ) : (
        <Screen edges={[]}>
          {notice ? <Alert tone={notice.tone} message={notice.text} /> : null}
          <SectionHeader title={`Comments (${q.data.comments.length})`} />
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {q.data.comments.map((cm) => <Card key={cm.id}><Txt variant="label">{cm.author ?? cm.user ?? 'Reader'}</Txt><Txt style={{ marginTop: 4 }}>{cm.body}</Txt></Card>)}
          </View>
          {user ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <Input label="Add a comment" value={comment} onChangeText={setComment} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
              <Button title="Post comment" disabled={!comment.trim()} onPress={() => void act(async () => { const r = await webPost(`/articles/${a.slug}/comments`, { body: comment.trim() }); setComment(''); return r; })} />
            </View>
          ) : <Button title="Sign in to comment" variant="secondary" style={{ marginTop: spacing.lg }} onPress={() => nav.navigate('Login')} />}
          {q.data.related.length ? (
            <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
              <SectionHeader title="Related articles" />
              {q.data.related.map((r) => <ArticleRow key={r.slug} article={r} onPress={() => nav.push('ArticleDetail', { slug: r.slug })} />)}
            </View>
          ) : null}
        </Screen>
      )}
      <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        <Button title={tab === 'read' ? 'Comments & related' : 'Back to article'} icon={tab === 'read' ? 'message-square' : 'book-open'} variant="secondary" style={{ flex: 1 }} onPress={() => setTab(tab === 'read' ? 'more' : 'read')} />
        <Pressable onPress={() => (user ? void act(() => webPost(`/articles/${a.slug}/like`)) : nav.navigate('Login'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md }}>
          <Feather name="heart" size={20} color={a.liked ? c.danger : c.textMuted} />
          <Txt variant="label">{a.likes}</Txt>
        </Pressable>
      </View>
    </View>
  );
}
