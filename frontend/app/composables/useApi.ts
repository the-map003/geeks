import { FetchError } from 'ofetch';
import type { ApiSuccess, FieldError } from '~/types/api';

export class ApiRequestError extends Error {
  status: number;
  errors: FieldError[];

  constructor(status: number, message: string, errors: FieldError[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
  }

  /** First validation message for a given field path, if any. */
  fieldError(path: string): string | undefined {
    return this.errors.find((e) => e.path === path)?.message;
  }
}

export function isApiError(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, unknown>;
  /** Attach the bearer token when available (default true). */
  auth?: boolean;
  /** Internal: whether a silent refresh has already been attempted. */
  _retried?: boolean;
}

/**
 * Thin wrapper over $fetch that unwraps `{ success, data }`, attaches the bearer token,
 * silently refreshes the session once on 401 and normalises errors to ApiRequestError.
 */
export function useApi() {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();
  const baseURL = import.meta.server ? config.apiBase : config.public.apiBase;

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = 'GET', body, query, auth = true, _retried = false } = options;
    const headers: Record<string, string> = {};
    if (auth && authStore.accessToken) headers.Authorization = `Bearer ${authStore.accessToken}`;

    try {
      const res = await $fetch<ApiSuccess<T> | ''>(path, {
        baseURL,
        method,
        body: body as Record<string, unknown> | undefined,
        query: query as Record<string, string> | undefined,
        headers,
        credentials: 'include',
      });
      if (res === '' || res === undefined || res === null) return undefined as T;
      return (res as ApiSuccess<T>).data;
    } catch (err) {
      if (err instanceof FetchError) {
        const status = err.status ?? err.response?.status ?? 0;
        const data = err.data as { message?: string; errors?: FieldError[] } | undefined;

        if (status === 401 && auth && !_retried && import.meta.client && authStore.accessToken) {
          const refreshed = await authStore.refresh();
          if (refreshed) return request<T>(path, { ...options, _retried: true });
        }
        if (status === 401 && import.meta.client && authStore.accessToken && auth) {
          authStore.clearSession();
        }
        throw new ApiRequestError(status, data?.message ?? defaultMessage(status), data?.errors ?? []);
      }
      throw new ApiRequestError(0, 'Unable to reach the server. Check your connection and try again.');
    }
  }

  return {
    request,
    get: <T>(path: string, query?: Record<string, unknown>, opts?: Omit<ApiRequestOptions, 'method' | 'query'>) =>
      request<T>(path, { ...opts, method: 'GET', query }),
    post: <T>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...opts, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...opts, method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...opts, method: 'PATCH', body }),
    del: <T>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...opts, method: 'DELETE', body }),
  };
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid.';
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'This conflicts with existing data.';
    case 429:
      return 'Too many requests. Please slow down.';
    default:
      return status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed.';
  }
}
