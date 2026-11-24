import { Feather } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Switch, View } from 'react-native';

import { errorMessage, fieldErrors } from '@/api';
import { useTheme } from '@/theme';
import { Alert } from './Alert';
import { Button } from './Button';
import { Input } from './Input';
import { Screen } from './Screen';
import { Txt } from './Txt';

export type PickOption = { value: string | number; label: string };

/** Tappable field that opens a searchable list (single or multiple choice). */
export function Picker({ label, value, options, onChange, placeholder = 'Select', error, multiple, required }: {
  label: string;
  value: string | number | (string | number)[] | null | undefined;
  options: PickOption[];
  onChange: (value: any) => void;
  placeholder?: string;
  error?: string;
  multiple?: boolean;
  required?: boolean;
}) {
  const { c, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = (Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value]).map(String);
  const text = options.filter((o) => selected.includes(String(o.value))).map((o) => o.label).join(', ');
  const list = useMemo(() => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options), [q, options]);

  const choose = (o: PickOption) => {
    if (multiple) {
      const next = selected.includes(String(o.value)) ? (value as (string | number)[]).filter((v) => String(v) !== String(o.value)) : [...((value as (string | number)[]) ?? []), o.value];
      onChange(next);
    } else {
      onChange(o.value);
      setOpen(false);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}{required ? ' *' : ''}</Txt>
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: error ? c.danger : c.border, backgroundColor: c.surface }}>
        <Txt style={{ flex: 1 }} tone={text ? 'default' : 'faint'} numberOfLines={1}>{text || placeholder}</Txt>
        <Feather name="chevron-down" size={18} color={c.textFaint} />
      </Pressable>
      {error ? <Txt variant="caption" tone="danger">{error}</Txt> : null}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={{ maxHeight: '78%', backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt variant="heading">{label}</Txt>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}><Txt variant="label" tone="accent">{multiple ? 'Done' : 'Close'}</Txt></Pressable>
            </View>
            {options.length > 8 ? <Input icon="search" placeholder="Search" value={q} onChangeText={setQ} /> : null}
            {!required && !multiple ? (
              <Pressable onPress={() => { onChange(null); setOpen(false); }} style={{ paddingVertical: 12 }}><Txt tone="muted">— None —</Txt></Pressable>
            ) : null}
            <FlatList
              data={list}
              keyExtractor={(o) => String(o.value)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const on = selected.includes(String(item.value));
                return (
                  <Pressable onPress={() => choose(item)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <Txt style={{ flex: 1 }} weight={on ? '700' : '400'}>{item.label}</Txt>
                    {on ? <Feather name="check" size={18} color={c.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Date field (YYYY-MM-DD, the format the web forms send) with quick picks. */
export function DateField({ label, value, onChange, error, required, quick = true }: { label: string; value?: string | null; onChange: (v: string) => void; error?: string; required?: boolean; quick?: boolean }) {
  const { spacing } = useTheme();
  const add = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); onChange(iso(d)); };
  return (
    <View style={{ gap: spacing.xs }}>
      <Input label={`${label}${required ? ' *' : ''}`} icon="calendar" value={value ?? ''} onChangeText={onChange} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} error={error} />
      {quick ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[['Today', 0], ['Tomorrow', 1], ['+7 days', 7], ['+14 days', 14]].map(([t, n]) => (
            <Pressable key={t as string} onPress={() => add(n as number)} hitSlop={6}><Txt variant="caption" tone="accent">{t}</Txt></Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function TimeField({ label, value, onChange, error }: { label: string; value?: string | null; onChange: (v: string) => void; error?: string }) {
  return <Input label={label} icon="clock" value={value ?? ''} onChangeText={onChange} placeholder="HH:MM (24h)" keyboardType="numbers-and-punctuation" maxLength={5} error={error} />;
}

export function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt variant="label">{label}</Txt>
        {hint ? <Txt variant="caption" tone="muted">{hint}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.borderStrong }} />
    </View>
  );
}

/**
 * Form screen: fields + a sticky submit button. `submit` runs the API call; validation errors from
 * the web FormRequest are passed back per field, other errors shown on top.
 */
export function useForm<T extends Record<string, any>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value }));
  const submit = async (fn: (values: T) => Promise<unknown>, onDone?: (result: any) => void) => {
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const result = await fn(values);
      onDone?.(result);
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      setMessage({ tone: 'danger', text: Object.keys(f).length ? Object.values(f)[0] : errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return { values, setValues, set, errors, message, setMessage, busy, submit };
}

export function FormScreen({ children, submitLabel, onSubmit, busy, message }: { children: ReactNode; submitLabel: string; onSubmit: () => void; busy: boolean; message?: { tone: 'success' | 'danger'; text: string } | null }) {
  const { spacing } = useTheme();
  return (
    <Screen edges={[]} footer={<Button title={submitLabel} full size="lg" loading={busy} onPress={onSubmit} />}>
      <View style={{ gap: spacing.lg }}>
        {message ? <Alert tone={message.tone} message={message.text} /> : null}
        {children}
      </View>
    </Screen>
  );
}
