import { ACCESS_TOKEN_KEY } from '@client/constants';
import { parseApiError } from '@client/lib/api/errorHandler';
import type { ApiResponse } from '@client/types/api';
import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';

/**
 * API Client with interceptors for auth and error handling
 */
class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL:
        import.meta.env.VITE_APP_API_URL ??
        import.meta.env.VITE_API_URL ??
        window.location.origin,
      timeout: 30_000,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const headers = AxiosHeaders.from(config.headers ?? {});
        headers.setAccept('application/json');
        headers.setContentType('application/json');

        // Add auth token if available
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

    // Response interceptor - Handle errors
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle 401 Unauthorized - Clear token and redirect to login
        if (error.response?.status === 401) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          // Don't redirect here, let the app handle it
        }

        // Parse error (don't show notification here, let React Query handle it)
        parseApiError(error);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Set auth token
   */
  setAuthToken(token: string | null): void {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  /**
   * Get auth token
   */
  getAuthToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data.data ?? (response.data as unknown as T);
  }

  /**
   * POST request
   */
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

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data.data ?? (response.data as unknown as T);
  }

  /**
   * PATCH request
   */
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

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data.data ?? (response.data as unknown as T);
  }

  /**
   * Get raw axios instance (for advanced use cases)
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient();

// Export for backward compatibility
export const http = apiClient.getInstance();
