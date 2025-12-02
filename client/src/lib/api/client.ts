import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { AUTH_ENDPOINTS } from 'src/config/auth';
import { ACCESS_TOKEN_KEY } from 'src/constants';
import { parseApiError } from 'src/lib/api/errorHandler';
import { authService } from 'src/services/api/auth.service';
import { authStore } from 'src/store/authStore';
import type { ApiResponse } from 'src/types/api';

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (error?: unknown) => void;
  }> = [];

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
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        if (
          error.response?.status === 401 &&
          error.response?.data?.code === 'invalid-token' &&
          !originalRequest._retry &&
          !originalRequest.url?.includes(AUTH_ENDPOINTS.refreshToken)
        ) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.instance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          const refreshToken = authStore.getRefreshToken();

          if (refreshToken) {
            try {
              const tokenSet = await authService.refreshTokens(refreshToken);
              authStore.setTokens(tokenSet);
              this.setAuthToken(tokenSet.accessToken);

              this.processQueue(null);

              const headers = AxiosHeaders.from(originalRequest.headers ?? {});
              headers.setAuthorization(`Bearer ${tokenSet.accessToken}`);
              originalRequest.headers = headers;

              return this.instance(originalRequest);
            } catch (refreshError) {
              this.processQueue(refreshError);
              authStore.clear();
              localStorage.removeItem(ACCESS_TOKEN_KEY);
              parseApiError(error);
              return Promise.reject(error);
            } finally {
              this.isRefreshing = false;
            }
          } else {
            this.isRefreshing = false;
            authStore.clear();
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            parseApiError(error);
            return Promise.reject(error);
          }
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

  private processQueue(error: unknown): void {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve();
      }
    });

    this.failedQueue = [];
  }
}

export const apiClient = new ApiClient();

export const http = apiClient.getInstance();
