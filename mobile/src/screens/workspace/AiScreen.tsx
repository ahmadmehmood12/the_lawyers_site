import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { errorMessage, fieldErrors, request, webPage, type Envelope, type Option } from '@/api';
import { Alert, Button, Card, Chip, ErrorState, Input, Loading, Picker, Screen, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { useTheme } from '@/theme';

const LABELS: Record<string, string> = { draft: 'Draft', summarize: 'Summarize', chronology: 'Chronology', hearing_summary: 'Hearing summary', translate_en_ur: 'English → Urdu', translate_ur_en: 'Urdu → English', grammar: 'Fix grammar', client_update: 'Client update', extract: 'Extract facts', research: 'Research points' };

/** AI legal assistant (web AI page, AiController@run): same features, plan limits and privacy redaction. */
export function AiScreen() {
  const { spacing } = useTheme();
  const q = useQuery(() => webPage<{ features: string[]; cases: Option<number>[]; available: boolean; planAllows: boolean; usage?: { used: number; limit: number | null } }>('/workspace/ai'));
  const [feature, setFeature] = useState('summarize');
  const [input, setInput] = useState('');
  const [caseId, setCaseId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; notice: string; redacted: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;

  const run = async () => {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await request<Envelope<{ text: string; notice: string; redacted: boolean }>>('/v1/workspace/ai/run', { method: 'POST', body: { feature, input, legal_case_id: caseId }, timeoutMs: 120000 });
      setResult(res.data);
    } catch (e) {
      setError(fieldErrors(e).input ?? errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      {!q.data.available ? <Alert tone="warning" message="The AI assistant is not configured on this platform yet." /> : !q.data.planAllows ? <Alert tone="warning" message="AI requests are available on the Professional and Law Firm plans." /> : null}
      <Txt variant="label" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>What should the assistant do?</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {q.data.features.map((f) => <Chip key={f} label={LABELS[f] ?? f} selected={feature === f} onPress={() => setFeature(f)} />)}
      </ScrollView>
      <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
        <Picker label="Case (optional — adds its context)" value={caseId} options={q.data.cases} onChange={setCaseId} />
        <Input label="Your text or instructions" value={input} onChangeText={setInput} multiline style={{ minHeight: 160, textAlignVertical: 'top' }} placeholder="Paste a judgment, order or notes, or describe what to draft (at least 10 characters)." />
        {error ? <Alert tone="danger" message={error} /> : null}
        <Button title="Run" icon="zap" full loading={busy} disabled={input.trim().length < 10} onPress={() => void run()} />
        {result ? (
          <Card style={{ gap: spacing.sm }}>
            <Alert tone="warning" message={result.notice} />
            {result.redacted ? <Txt variant="caption" tone="muted">Names and numbers were hidden from the AI provider and restored here.</Txt> : null}
            <Txt selectable style={{ lineHeight: 22 }}>{result.text}</Txt>
            <Button title="Copy" icon="copy" variant="secondary" size="sm" onPress={() => void Clipboard.setStringAsync(result.text)} />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
