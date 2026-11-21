import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { Txt } from './Txt';

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const { c, spacing, radius } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: 32, gap: spacing.md, maxHeight: '85%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: spacing.sm }} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Asks for a short reason (decline / cancel), then confirms. */
export function ReasonSheet({ visible, title, required = true, confirmLabel = 'Confirm', danger, onClose, onSubmit }: { visible: boolean; title: string; required?: boolean; confirmLabel?: string; danger?: boolean; onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) { setReason(''); } }, [visible]);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Txt variant="heading">{title}</Txt>
      <Input label={required ? 'Reason' : 'Reason (optional)'} value={reason} onChangeText={setReason} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} maxLength={255} />
      <Button title={confirmLabel} variant={danger ? 'danger' : 'primary'} full loading={busy} disabled={required && !reason.trim()} onPress={async () => { setBusy(true); try { await onSubmit(reason.trim()); } finally { setBusy(false); } }} />
    </Sheet>
  );
}

/** Picks one free slot (grouped by day) and an optional reason. */
export function SlotSheet({ visible, title, slots, loading, onClose, onSubmit }: { visible: boolean; title: string; slots: { starts_at: string }[]; loading?: boolean; onClose: () => void; onSubmit: (startsAt: string, reason: string) => Promise<void> }) {
  const { spacing } = useTheme();
  const days = useMemo(() => groupByDay(slots), [slots]);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDay(days[0]?.key ?? null); setSlot(null); }, [days, visible]);
  const current = days.find((d) => d.key === day);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Txt variant="heading">{title}</Txt>
      {loading ? <Txt tone="muted">Loading free times…</Txt> : days.length === 0 ? <Txt tone="muted">No free times in the next two weeks.</Txt> : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {days.map((d) => <Chip key={d.key} label={d.label} selected={d.key === day} onPress={() => { setDay(d.key); setSlot(null); }} />)}
          </ScrollView>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {current?.slots.map((s) => <Chip key={s} label={timeLabel(s)} selected={slot === s} onPress={() => setSlot(s)} />)}
          </View>
          <Input label="Reason (optional)" value={reason} onChangeText={setReason} maxLength={255} />
        </>
      )}
      <Button title="Confirm new time" full loading={busy} disabled={!slot} onPress={async () => { if (!slot) { return; } setBusy(true); try { await onSubmit(slot, reason.trim()); } finally { setBusy(false); } }} />
    </Sheet>
  );
}

export function groupByDay(slots: { starts_at: string }[]): { key: string; label: string; slots: string[] }[] {
  const map = new Map<string, string[]>();
  slots.forEach((s) => {
    const key = s.starts_at.slice(0, 10);
    map.set(key, [...(map.get(key) ?? []), s.starts_at]);
  });
  return [...map.entries()].map(([key, list]) => ({ key, label: new Date(`${key}T00:00:00`).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }), slots: list }));
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });
}
