import { apiClient } from '@client/lib/api/client';
import { authService, type User } from '@client/services/api/auth.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login({ email, password }),
    onSuccess: (data) => {
      apiClient.setAuthToken(data.accessToken);
      setIsAuthenticated(true);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      apiClient.setAuthToken(null);
      setIsAuthenticated(false);
      queryClient.clear();
    },
  });

  useEffect(() => {
    const token = apiClient.getAuthToken();
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  };

  const refreshUser = async (): Promise<void> => {
    await refetchUser();
  };

  const value: AuthContextValue = {
    user: user ?? null,
    isAuthenticated: isAuthenticated && !!user,
    isLoading:
      isLoadingUser || loginMutation.isPending || logoutMutation.isPending,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
