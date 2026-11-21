import { apiClient, request, type QueryValue } from './client';
import { ApiError } from './errors';
import type {
  AppNotification, AvailabilitySlot, ClientAppointment, ClientCase, ClientCaseDetail, ClientDashboard, ClientInvoice, Envelope, FirmCard, FirmProfile, Home,
  LaravelPage, LawyerCard, LawyerProfile, LoginResult, Option, Page, Preferences, Slots, Specialization, TeamMember, User, WorkspaceAppointment, WorkspaceCase,
  WorkspaceClient, WorkspaceDashboard,
} from './models';

/**
 * Typed wrappers for /api/v1 (Laravel routes/api/v1.php). Every call returns `data` from the
 * {status, message, data} envelope; list endpoints return {items, meta}.
 */
type Q = Record<string, QueryValue | QueryValue[]>;

async function get<T>(path: string, query?: Q, signal?: AbortSignal): Promise<T> {
  return (await apiClient.get<Envelope<T>>(`/v1${path}`, { query, signal })).data;
}
async function page<T>(path: string, query?: Q, signal?: AbortSignal): Promise<Page<T>> {
  const res = await apiClient.get<Envelope<T[]>>(`/v1${path}`, { query, signal });
  return { items: res.data, meta: res.meta ?? { current_page: 1, last_page: 1, per_page: res.data.length, total: res.data.length } };
}
async function post<T>(path: string, body?: unknown): Promise<{ data: T; message: string }> {
  const res = await apiClient.post<Envelope<T>>(`/v1${path}`, body ?? {});
  return { data: res.data, message: res.message };
}
async function put<T>(path: string, body?: unknown): Promise<{ data: T; message: string }> {
  const res = await apiClient.put<Envelope<T>>(`/v1${path}`, body ?? {});
  return { data: res.data, message: res.message };
}
/** Field errors from a 422 response ({errors: {field: [msg]}}) → {field: msg}. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.details && typeof error.details.errors === 'object' && error.details.errors) {
    return Object.fromEntries(Object.entries(error.details.errors as Record<string, string[]>).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]));
  }
  return {};
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    return error.code === 'NETWORK_ERROR' ? 'No connection. Check your internet and try again.' : error.message || fallback;
  }
  return fallback;
}

export const authApi = {
  login: (email: string, password: string, device_name: string) => post<LoginResult>('/auth/login', { email, password, device_name }),
  twoFactor: (challenge_token: string, input: { code?: string; recovery_code?: string }) => post<LoginResult>('/auth/two-factor-challenge', { challenge_token, ...input }),
  registerOptions: () => get<{ types: string[]; bar_councils: Option<number>[] }>('/auth/register/options'),
  register: (input: Record<string, unknown>) => post<LoginResult>('/auth/register', input),
  forgotPassword: (email: string) => post<{ email: string }>('/auth/forgot-password', { email }),
  verifyResetCode: (email: string, code: string) => post<{ reset_token: string; email: string }>('/auth/forgot-password/verify-code', { email, code }),
  resetPassword: (input: { token: string; email: string; password: string; password_confirmation: string }) => post<null>('/auth/reset-password', input),
  me: () => get<User>('/auth/me'),
  verifyEmail: (code: string) => post<User>('/auth/email/verify', { code }),
  resendVerification: () => post<null>('/auth/email/resend'),
  logout: () => post<null>('/auth/logout'),
};

export const accountApi = {
  updateProfile: (input: { name?: string; email?: string; phone?: string | null; locale?: string }) => put<User>('/account/profile', input),
  updatePassword: (input: { current_password: string; password: string; password_confirmation: string }) => put<null>('/account/password', input),
  twoFactor: () => get<{ enabled: boolean; pending_confirmation: boolean }>('/account/two-factor'),
  enableTwoFactor: (password: string) => post<{ secret: string; otpauth_url: string; qr_svg: string }>('/account/two-factor', { password }),
  confirmTwoFactor: (code: string) => post<{ recovery_codes: string[] }>('/account/two-factor/confirm', { code }),
  recoveryCodes: (password: string) => post<{ recovery_codes: string[] }>('/account/two-factor/recovery-codes', { password }),
  regenerateRecoveryCodes: (password: string) => post<{ recovery_codes: string[] }>('/account/two-factor/recovery-codes/regenerate', { password }),
  disableTwoFactor: (password: string) => request<Envelope<null>>('/v1/account/two-factor', { method: 'DELETE', body: { password } }),
  registerDevice: (token: string, platform: 'ios' | 'android') => apiClient.post<{ registered: boolean }>('/v1/account/device-token', { token, platform }),
  notifications: (p = 1) => page<AppNotification>('/notifications', { page: p }),
  readNotification: (id: string) => post<{ unread: number }>(`/notifications/${id}/read`),
  readAllNotifications: () => post<{ unread: number }>('/notifications/read-all'),
  preferences: () => get<Preferences>('/notifications/preferences'),
  savePreferences: (preferences: { event: string; channel: string; enabled: boolean }[]) => put<Preferences>('/notifications/preferences', { preferences }),
};

export const directoryApi = {
  home: (signal?: AbortSignal) => get<Home>('/home', undefined, signal),
  specializations: () => get<Specialization[]>('/specializations'),
  lawyers: (query: Q, signal?: AbortSignal) => page<LawyerCard>('/lawyers', query, signal),
  lawyer: (slug: string) => get<LawyerProfile>(`/lawyers/${slug}`),
  slots: (slug: string) => get<Slots>(`/lawyers/${slug}/slots`),
  firms: (query: Q, signal?: AbortSignal) => page<FirmCard>('/firms', query, signal),
  firm: (slug: string) => get<FirmProfile>(`/firms/${slug}`),
  toggleFavourite: (slug: string) => post<{ is_favourite: boolean }>(`/lawyers/${slug}/favourite`),
};

export const clientApi = {
  dashboard: () => get<ClientDashboard>('/client/dashboard'),
  cases: () => get<{ cases: ClientCase[] }>('/client/cases'),
  case: (id: number) => get<ClientCaseDetail>(`/client/cases/${id}`),
  invoices: () => get<{ invoices: ClientInvoice[] }>('/client/invoices'),
  appointments: () => get<{ appointments: ClientAppointment[] }>('/client/appointments'),
  favourites: () => get<{ lawyers: { slug: string; name: string; headline: string | null; city: string | null; verified: boolean; photo_url: string | null }[] }>('/client/favourites'),
  book: (slug: string, input: { starts_at: string; mode: string; message?: string }) => post<ClientAppointment>(`/client/lawyers/${slug}/book`, input),
  cancel: (id: number, reason: string) => post<ClientAppointment>(`/client/appointments/${id}/cancel`, { reason }),
  slots: (id: number) => get<{ slots: { starts_at: string; mode: string }[] }>(`/client/appointments/${id}/slots`),
  reschedule: (id: number, starts_at: string, reason?: string) => post<ClientAppointment>(`/client/appointments/${id}/reschedule`, { starts_at, reason }),
};

export const workspaceApi = {
  dashboard: () => get<WorkspaceDashboard>('/workspace/dashboard'),
  cases: (query: Q) => get<{ cases: LaravelPage<WorkspaceCase>; options: { statuses: Option<string>[] } }>('/workspace/cases', query),
  case: (id: number, tab?: string) => get<Record<string, unknown>>(`/workspace/cases/${id}`, tab ? { tab } : undefined),
  diary: (query: Q) => get<{ view: string; date: string; hearings: Record<string, unknown>[]; entries: Record<string, unknown>[]; monthCounts: Record<string, number> }>('/workspace/diary', query),
  clients: (query: Q) => get<{ clients: LaravelPage<WorkspaceClient>; kpis: Record<string, number> }>('/workspace/clients', query),
  client: (id: number) => get<Record<string, unknown>>(`/workspace/clients/${id}`),
  team: () => get<{ members: TeamMember[]; isFirm: boolean; roles: Option<string>[] }>('/workspace/team'),
  invoices: (query: Q) => get<Record<string, unknown>>('/workspace/invoices', query),
  appointments: (scope: 'upcoming' | 'requests' | 'past', p = 1) => page<WorkspaceAppointment>('/workspace/appointments', { scope, page: p }),
  appointment: (id: number) => get<WorkspaceAppointment>(`/workspace/appointments/${id}`),
  transition: (id: number, status: string, reason?: string, meeting_link?: string) => post<WorkspaceAppointment>(`/workspace/appointments/${id}/status`, { status, reason, meeting_link }),
  reschedule: (id: number, starts_at: string, reason?: string) => post<WorkspaceAppointment>(`/workspace/appointments/${id}/reschedule`, { starts_at, reason }),
  availability: () => get<{ slots: AvailabilitySlot[]; holidays: { id: number; date: string; reason: string | null }[] }>('/workspace/availability'),
  saveAvailability: (slots: AvailabilitySlot[]) => put<{ slots: AvailabilitySlot[] }>('/workspace/availability', { slots }),
};

