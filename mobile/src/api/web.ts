import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiClient, apiUrl, getAuthToken, request, type QueryValue } from './client';
import { ApiError } from './errors';
import type { Envelope } from './models';

/**
 * Mobile API routes that run the WEB action itself (Laravel routes/api/v1.php "web" section,
 * App\\Support\\ApiBridge): same validation, permissions, services, notifications and messages as
 * the website. Pages return the web page's data; writes return the web's flash message and where
 * the web would go next ({route, params}) so the app can open the record it just created.
 */
export type WebResult = { message: string; route: string | null; params: Record<string, string> };
type Q = Record<string, QueryValue | QueryValue[]>;

export async function webPage<T>(path: string, query?: Q): Promise<T> {
  return (await apiClient.get<Envelope<T>>(`/v1${path}`, { query })).data;
}

async function send(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<WebResult> {
  const res = await request<Envelope<{ route: string | null; params: Record<string, string> } | unknown>>(`/v1${path}`, { method, body: body ?? {}, timeoutMs: body instanceof FormData ? 120000 : undefined });
  const data = (res.data ?? {}) as { route?: string | null; params?: Record<string, string> };
  return { message: res.message, route: data.route ?? null, params: data.params ?? {} };
}

export const webPost = (path: string, body?: unknown) => send('POST', path, body);
export const webPut = (path: string, body?: unknown) => send('PUT', path, body);
export const webDelete = (path: string) => send('DELETE', path);

/** Multipart form for uploads: plain fields plus one file from the document picker. */
export function formData(fields: Record<string, string | number | boolean | null | undefined>, file?: { field: string; uri: string; name: string; type: string }): FormData {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    }
  });
  if (file) {
    form.append(file.field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  return form;
}

/** Downloads an API file (PDF, DOCX, upload) with the user's token and opens the system viewer / share sheet. */
export async function openFile(path: string, fileName: string, query?: Q): Promise<void> {
  const token = getAuthToken();
  const target = `${FileSystem.cacheDirectory}${fileName.replace(/[^\w.\-]+/g, '_')}`;
  const result = await FileSystem.downloadAsync(apiUrl(`/v1${path}`, query), target, {
    headers: { Accept: 'application/pdf, application/octet-stream, */*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (result.status >= 400) {
    throw new ApiError(result.status === 403 ? 'You do not have access to download this file.' : `Download failed (${result.status}).`, result.status, 'HTTP_ERROR');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: result.headers['Content-Type'] ?? result.headers['content-type'], dialogTitle: fileName });
  }
}

/** RFC4122-ish id for idempotent requests (payments). */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
