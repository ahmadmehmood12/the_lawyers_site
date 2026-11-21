export type ApiErrorDetails = Record<string, unknown> | undefined;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetails;

  constructor(message: string, status: number, code: string, details?: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
