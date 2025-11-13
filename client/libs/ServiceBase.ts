import { ACCESS_TOKEN_KEY } from '@client/constants';
import {
  accessTokenRefreshSubject,
  configSubject,
} from '@client/utils/subjects';
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';

export interface OffsetPaginateQuery {
  take?: number;
  skip?: number;
}

export interface OffsetPaginateResult<T> {
  docs: T[];
  count: number;
}

export interface CursorPaginateQuery {
  take?: number;
  cursor?: string;
}

export interface CursorPaginateResult<T> {
  docs: T[];
  hasNext: boolean;
  nextCursor?: string;
}

export interface RequestOptions extends AxiosRequestConfig {
  endpoint?: string | number;
  passthroughErrorCatcher?: boolean;
}

export abstract class ServiceBase {
  protected endpoint?: string;
  private client?: AxiosInstance;

  constructor(endpoint?: string) {
    this.endpoint = endpoint;
    configSubject.subscribe((config) => {
      this.client = this.createClient(config.apiUrl);
    });
  }

  private createClient(baseURL: string): AxiosInstance {
    return axios.create({
      baseURL,
      headers: { Accept: 'application/json' },
      timeout: 10000,
      paramsSerializer: {
        indexes: null,
      },
      transformRequest: [
        (data, headers) => {
          const token =
            accessTokenRefreshSubject.value ||
            localStorage.getItem(ACCESS_TOKEN_KEY);
          if (token && typeof token === 'string') {
            headers.set(
              'Authorization',
              token.startsWith('Bearer ') ? token : `Bearer ${token}`,
            );
          }
          if (data instanceof FormData) {
            return data;
          }
          headers.set('Content-Type', 'application/json');
          return data ? JSON.stringify(data) : data;
        },
      ],
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  protected get baseEndpoint(): string {
    return this.endpoint || '';
  }

  private getOptions(options?: RequestOptions): AxiosRequestConfig {
    const {
      endpoint: _endpoint,
      passthroughErrorCatcher: _passthroughErrorCatcher,
      ...axiosConfig
    } = options || {};
    return axiosConfig;
  }

  private getAbsoluteRequestUrl(endpoint?: string | number): string {
    const baseEndpoint = this.baseEndpoint;
    if (!endpoint) {
      return baseEndpoint;
    }
    if (typeof endpoint === 'number') {
      return `${baseEndpoint}/${endpoint}`;
    }
    if (endpoint.startsWith('?')) {
      return `${baseEndpoint}${endpoint}`;
    }
    if (endpoint.startsWith('/')) {
      return endpoint;
    }
    return `${baseEndpoint}/${endpoint}`;
  }

  protected parse<T>(data: unknown): T {
    if (
      typeof data === 'object' &&
      data !== null &&
      'data' in data &&
      't' in data &&
      'code' in data
    ) {
      return (data as { data: T }).data;
    }
    return data as T;
  }

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    options?: RequestOptions,
  ): Promise<T> {
    if (!this.client) {
      const config = configSubject.value;
      this.client = this.createClient(config.apiUrl);
    }

    const { endpoint, passthroughErrorCatcher } = options || {};
    const url = this.getAbsoluteRequestUrl(endpoint);
    const axiosOptions = this.getOptions(options);

    try {
      let response;
      switch (method) {
        case 'get':
          response = await this.client.get(url, axiosOptions);
          break;
        case 'post':
          response = await this.client.post(
            url,
            axiosOptions.data,
            axiosOptions,
          );
          break;
        case 'patch':
          response = await this.client.patch(
            url,
            axiosOptions.data,
            axiosOptions,
          );
          break;
        case 'put':
          response = await this.client.put(
            url,
            axiosOptions.data,
            axiosOptions,
          );
          break;
        case 'delete':
          response = await this.client.delete(url, axiosOptions);
          break;
      }
      return this.parse<T>(response.data);
    } catch (error) {
      if (passthroughErrorCatcher) {
        throw error;
      }
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const responseData = axiosError.response.data;
        let errorCode = 'ise';
        let errorMessage = axiosError.message;

        if (typeof responseData === 'object' && responseData !== null) {
          const data = responseData as Record<string, unknown>;
          if (typeof data.code === 'string') {
            errorCode = data.code;
          }
          if (typeof data.message === 'string') {
            errorMessage = data.message;
          } else if (typeof data.error === 'string') {
            errorMessage = data.error;
          }
        } else if (typeof responseData === 'string') {
          try {
            const parsed = JSON.parse(responseData);
            if (typeof parsed.code === 'string') {
              errorCode = parsed.code;
            }
            if (typeof parsed.message === 'string') {
              errorMessage = parsed.message;
            }
          } catch {
            errorMessage = responseData;
          }
        }

        const errorWithCode = new Error(errorMessage) as Error & {
          code?: string;
          status?: number;
        };
        errorWithCode.code = errorCode;
        errorWithCode.status = axiosError.response.status;
        throw errorWithCode;
      }
      throw error;
    }
  }

  protected get<T = unknown>(options?: RequestOptions): Promise<T> {
    return this.request<T>('get', options);
  }

  protected post<T = unknown>(
    data: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('post', { ...options, data });
  }

  protected patch<T = unknown>(
    data: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('patch', { ...options, data });
  }

  protected put<T = unknown>(
    data: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('put', { ...options, data });
  }

  protected delete<T = unknown>(options?: RequestOptions): Promise<T> {
    return this.request<T>('delete', options);
  }
}
