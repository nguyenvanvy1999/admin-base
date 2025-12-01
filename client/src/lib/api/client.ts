import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import { ACCESS_TOKEN_KEY } from 'src/constants';
import { parseApiError } from 'src/lib/api/errorHandler';
import type { ApiResponse } from 'src/types/api';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL:
        import.meta.env.VITE_APP_API_URL ??
        import.meta.env.VITE_API_URL ??
        window.location.origin,
      timeout: 30_000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.instance.interceptors.request.use(
      (config) => {
        const headers = AxiosHeaders.from(config.headers ?? {});
        headers.setAccept('application/json');
        headers.setContentType('application/json');

        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) {
          headers.setAuthorization(`Bearer ${token}`);
        }

        config.headers = headers;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
        }

        parseApiError(error);
        return Promise.reject(error);
      },
    );
  }

  setAuthToken(token: string | null): void {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  getAuthToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data.data ?? (response.data as unknown as T);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(
      url,
      data,
      config,
    );
    return response.data.data ?? (response.data as unknown as T);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data.data ?? (response.data as unknown as T);
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.patch<ApiResponse<T>>(
      url,
      data,
      config,
    );
    return response.data.data ?? (response.data as unknown as T);
  }

  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data.data ?? (response.data as unknown as T);
  }

  getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient();

export const http = apiClient.getInstance();
