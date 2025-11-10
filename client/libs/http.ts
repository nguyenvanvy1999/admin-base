import { ACCESS_TOKEN_KEY } from '@client/constants';

type Primitive = string | number | boolean;

export type QueryValue = Primitive | Primitive[] | null | undefined;

export type RequestQuery = Record<string, QueryValue>;

export type RequestOptions = {
  method?: string;
  query?: RequestQuery;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  skipAuth?: boolean;
};

export class HttpError extends Error {
  status: number;

  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

let unauthorizedHandler: (() => void) | undefined;

export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

const buildUrl = (path: string, query?: RequestQuery) => {
  const url = new URL(path, window.location.origin);
  if (!query) {
    return url;
  }
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        url.searchParams.append(key, String(item));
      });
      return;
    }
    url.searchParams.set(key, String(value));
  });
  return url;
};

const isJsonSerializable = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  !(value instanceof FormData) &&
  !(value instanceof Blob) &&
  !(value instanceof ArrayBuffer) &&
  !(value instanceof URLSearchParams);

const parseResponse = (response: Response) => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export async function request<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { method = 'GET', query, body, headers, signal, skipAuth } = options;
  const url = buildUrl(path, query);

  const finalHeaders = new Headers(headers);
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!skipAuth && token) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  const init: RequestInit = {
    method,
    headers: finalHeaders,
    signal,
    credentials: 'include',
  };

  if (body !== undefined) {
    if (isJsonSerializable(body)) {
      finalHeaders.set('Content-Type', 'application/json');
      init.body = JSON.stringify(body);
    } else if (body instanceof URLSearchParams) {
      finalHeaders.set('Content-Type', 'application/x-www-form-urlencoded');
      init.body = body.toString();
    } else {
      // Allow FormData, Blob, ArrayBuffer to pass through untouched.
      init.body = body as BodyInit;
    }
  }

  try {
    const response = await fetch(url, init);
    const payload = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 401 && unauthorizedHandler) {
        unauthorizedHandler();
      }
      const message =
        (payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof payload.message === 'string' &&
          payload.message) ||
        response.statusText ||
        'Request failed';
      throw new HttpError(message, response.status, payload);
    }

    return payload as TResponse;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new HttpError(error.message, 0, null);
    }
    throw new HttpError('Unknown error', 0, null);
  }
}

export const get = <TResponse>(
  path: string,
  options?: Omit<RequestOptions, 'method' | 'body'>,
) => request<TResponse>(path, { ...options, method: 'GET' });

export const post = <TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options?: Omit<RequestOptions, 'method' | 'body'>,
) => request<TResponse>(path, { ...options, method: 'POST', body });

export const put = <TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options?: Omit<RequestOptions, 'method' | 'body'>,
) => request<TResponse>(path, { ...options, method: 'PUT', body });

export const patch = <TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options?: Omit<RequestOptions, 'method' | 'body'>,
) => request<TResponse>(path, { ...options, method: 'PATCH', body });

export const del = <TResponse>(
  path: string,
  options?: Omit<RequestOptions, 'method' | 'body'>,
) => request<TResponse>(path, { ...options, method: 'DELETE' });
