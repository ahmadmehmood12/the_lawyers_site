import { createContext, useContext, type ReactNode } from 'react';

import type { AppConfig } from '@/api';
import { useAppConfig, type AppConfigState } from '@/hooks/useAppConfig';

/**
 * Server-side app settings (GET /api/app/config): app/site name, logo, favicon, tagline, contact,
 * social links, Google sign-in ids, versions, maintenance. Nothing here is hard-coded in the app.
 */
const AppConfigContext = createContext<AppConfigState | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const state = useAppConfig();
  return <AppConfigContext.Provider value={state}>{children}</AppConfigContext.Provider>;
}

export function useConfig(): AppConfigState {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    throw new Error('useConfig must be used within AppConfigProvider');
  }
  return ctx;
}

/** Brand name + logo with safe fallbacks while the config loads (or when offline). */
export function useBrand(): { name: string; tagline: string | null; logo: string | null; config: AppConfig | null } {
  const { config } = useConfig();
  return {
    name: config?.app_name || config?.site.name || 'Wakeel Diary',
    tagline: config?.site.tagline ?? null,
    logo: config?.icon_url || config?.site.logo_url || null,
    config,
  };
}
