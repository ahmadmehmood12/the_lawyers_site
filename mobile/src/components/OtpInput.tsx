import React, { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { fontFamily, useTheme } from '@/theme';
import { Txt } from './Txt';

/** Six-box one-time code input (email verification, password reset, two-factor). */
export function OtpInput({ value, onChange, length = 6, error }: { value: string; onChange: (code: string) => void; length?: number; error?: string }) {
  const { c, radius, spacing } = useTheme();
  const input = useRef<React.ElementRef<typeof TextInput>>(null);

  return (
    <View>
      <Pressable onPress={() => input.current?.focus()} style={styles.row} accessibilityLabel="One-time code">
        {Array.from({ length }).map((_, i) => {
          const active = i === value.length;
          return (
            <View
              key={i}
              style={[
                styles.box,
                { borderRadius: radius.md, backgroundColor: c.surfaceAlt, borderColor: error ? c.danger : active ? c.primary : c.border, borderWidth: active ? 2 : 1 },
              ]}
            >
              <Txt variant="title" style={{ fontFamily: fontFamily.bold }}>{value[i] ?? ''}</Txt>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus
        style={styles.hidden}
      />
      {error ? <Txt variant="caption" tone="danger" style={{ marginTop: spacing.sm }}>{error}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: { flex: 1, aspectRatio: 0.86, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
