/**
 * Structured error thrown by all API clients.
 * Carries an optional map of field-level validation errors
 * (Rails 422 shape: { errors: { campo: ['mensaje'] } }).
 */
export class ApiError extends Error {
  public readonly fieldErrors: Record<string, string[]> | null;
  public readonly statusCode: number | null;

  constructor(
    message: string,
    options?: { fieldErrors?: Record<string, string[]>; statusCode?: number },
  ) {
    super(message);
    this.name = 'ApiError';
    this.fieldErrors = options?.fieldErrors ?? null;
    this.statusCode = options?.statusCode ?? null;
  }

  /** Returns the first validation message, or the top-level message. */
  get firstFieldError(): string {
    if (!this.fieldErrors) return this.message;
    const first = Object.values(this.fieldErrors)[0];
    return first?.[0] ?? this.message;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
