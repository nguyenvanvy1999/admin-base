import { apiClient } from '@client/lib/api/client';
import { createQueryKeys } from '@client/services/api/base.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export const authKeys = createQueryKeys('auth');

export const authService = {
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/api/auth/login', data);
  },

  logout: (): Promise<void> => {
    return apiClient.post<void>('/api/auth/logout');
  },

  refreshToken: (refreshToken: string): Promise<{ accessToken: string }> => {
    return apiClient.post<{ accessToken: string }>('/api/auth/refresh', {
      refreshToken,
    });
  },

  getCurrentUser: (): Promise<User> => {
    return apiClient.get<User>('/api/auth/me');
  },
};
