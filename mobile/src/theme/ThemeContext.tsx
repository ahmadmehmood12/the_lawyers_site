import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, fontSize, lightColors, radius, shadows, spacing, type ThemeColors } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

type Theme = {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  isDark: boolean;
  c: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  shadows: typeof shadows;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<Theme | null>(null);

/** Light / dark / follow-system theme, mirroring the web app's class-based dark mode. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() ?? 'light';
  const [mode, setMode] = useState<ThemeMode>('system');
  const scheme: 'light' | 'dark' = mode === 'system' ? (system as 'light' | 'dark') : mode;

  const value = useMemo<Theme>(() => {
    const isDark = scheme === 'dark';
    return {
      mode,
      scheme,
      isDark,
      c: isDark ? darkColors : lightColors,
      spacing,
      radius,
      fontSize,
      shadows,
      setMode,
      toggle: () => setMode(isDark ? 'light' : 'dark'),
    };
  }, [mode, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
