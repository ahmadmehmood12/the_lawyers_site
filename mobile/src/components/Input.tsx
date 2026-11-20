import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Props = TextInputProps & {
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  error?: string;
  hint?: string;
  password?: boolean;
};

export function Input({ label, icon, error, hint, password, style, ...rest }: Props) {
  const { c, radius, spacing, fontSize } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!password);

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Txt variant="label" tone="muted">
          {label}
        </Txt>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.danger : focused ? c.accent : c.borderStrong,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {icon ? <Feather name={icon} size={18} color={c.textFaint} style={{ marginRight: spacing.sm }} /> : null}
        <TextInput
          style={[{ flex: 1, color: c.text, fontSize: fontSize.base, paddingVertical: 13 }, style]}
          placeholderTextColor={c.textFaint}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {password ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={c.textFaint} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Txt variant="caption" tone="danger">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" tone="faint">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ field: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth } });
