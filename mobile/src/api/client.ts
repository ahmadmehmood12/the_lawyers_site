import Constants from 'expo-constants';

import { ApiError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  method?: HttpMethod;
  query?: Record<string, QueryValue | QueryValue[]>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

const DEFAULT_TIMEOUT_MS = 15000;

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** Sanctum bearer token for every request (set by AuthContext from SecureStore). */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Called once when an authenticated request returns 401 (token revoked/expired). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}
const activeControllers = new Set<AbortController>();

function configuredBaseUrl(): string {
  const fromEnv = typeof process.env.EXPO_PUBLIC_API_BASE_URL === 'string' ? process.env.EXPO_PUBLIC_API_BASE_URL : '';
  const fromExpo = typeof Constants.expoConfig?.extra?.apiBaseUrl === 'string' ? Constants.expoConfig.extra.apiBaseUrl : '';
  return (fromEnv || fromExpo || '').trim().replace(/\/+$/, '');
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), `${configuredBaseUrl()}/`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          url.searchParams.append(key, String(item));
        }
      });
    });
  }
  return url.toString();
}

function messageFrom(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const message = record.message ?? record.error;
    if (typeof message === 'string') {
      return message;
    }
  }
  return `Request failed with status ${status}`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!configuredBaseUrl()) {
    throw new ApiError('API base URL is not configured', 0, 'MISSING_BASE_URL');
  }

  const controller = new AbortController();
  activeControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller);

  try {
    const response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = text;
      }
    }

    if (response.status === 401 && authToken) {
      unauthorizedHandler?.();
    }

    if (!response.ok) {
      throw new ApiError(
        messageFrom(payload, response.status),
        response.status,
        'HTTP_ERROR',
        payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new ApiError('Request was cancelled', 0, 'ABORTED');
    }
    throw new ApiError('Network request failed', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
    activeControllers.delete(controller);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...options, method: 'DELETE' }),
  cancelAll: () => {
    activeControllers.forEach((controller) => controller.abort());
    activeControllers.clear();
  },
};
