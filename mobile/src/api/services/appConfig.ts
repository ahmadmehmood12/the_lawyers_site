import { apiClient } from '../client';
import { ApiError } from '../errors';
import { verifiedEndpoints } from '../endpoints';
import type { AppConfig } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function platform(value: unknown): { version: string | null; min_version: string | null; url: string | null } {
  if (!isRecord(value)) {
    return { version: null, min_version: null, url: null };
  }
  return {
    version: typeof value.version === 'string' ? value.version : null,
    min_version: typeof value.min_version === 'string' ? value.min_version : null,
    url: typeof value.url === 'string' ? value.url : null,
  };
}

export async function fetchAppConfig(signal?: AbortSignal): Promise<AppConfig> {
  const payload = await apiClient.get<unknown>(verifiedEndpoints.appConfig, { signal });
  if (!isRecord(payload) || typeof payload.app_name !== 'string') {
    throw new ApiError('App config response was invalid', 0, 'INVALID_RESPONSE');
  }
  return {
    app_name: payload.app_name,
    icon_url: typeof payload.icon_url === 'string' ? payload.icon_url : null,
    push_enabled: payload.push_enabled === true,
    force_update: payload.force_update === true,
    maintenance: payload.maintenance === true,
    maintenance_message: typeof payload.maintenance_message === 'string' ? payload.maintenance_message : null,
    ios: platform(payload.ios),
    android: platform(payload.android),
    site: { name: payload.app_name, tagline: null, logo_url: null, favicon_url: null, theme: null, url: null, ...(isRecord(payload.site) ? (payload.site as AppConfig['site']) : {}) },
    contact: { email: null, phone: null, address: null, ...(isRecord(payload.contact) ? (payload.contact as AppConfig['contact']) : {}) },
    social: isRecord(payload.social) ? (payload.social as AppConfig['social']) : {},
    google: { enabled: false, web_client_id: null, ios_client_id: null, android_client_id: null, ...(isRecord(payload.google) ? (payload.google as AppConfig['google']) : {}) },
  };
}
