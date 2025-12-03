import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect } from 'react';
import { authService } from 'src/services/api/auth.service';
import { authStore, useAuthStore } from 'src/store/authStore';
import type { AuthUser, LoginSuccessResponse, TokenSet } from 'src/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  tokens: TokenSet | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isLoadingProfile: boolean;
  completeSignIn: (session: LoginSuccessResponse) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);

  useEffect(() => {
    authStore.hydrate();
  }, []);

  const {
    data: profile,
    error: profileError,
    isFetching: isFetchingProfile,
    refetch: refetchProfile,
  } = useQuery<AuthUser>({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: () => authService.getCurrentUser(),
    enabled: !!tokens?.accessToken,
    retry: false,
  });

  useEffect(() => {
    if (profile) {
      authStore.setUser(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (profileError) {
      authStore.clear();
    }
  }, [profileError]);

  const completeSignIn = (session: LoginSuccessResponse): void => {
    const tokens: TokenSet = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expired,
      expiresInSeconds: session.exp,
    };

    authStore.setTokens(tokens);
    authStore.setUser(session.user);
    queryClient.setQueryData(AUTH_ME_QUERY_KEY, session.user);
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      authStore.clear();
      queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
    }
  };

  const refreshUser = async (): Promise<void> => {
    await refetchProfile();
  };

  const value: AuthContextValue = {
    user,
    tokens,
    isAuthenticated: Boolean(tokens?.accessToken && user),
    isBootstrapping:
      !bootstrapped ||
      (Boolean(tokens?.accessToken) && !user) ||
      (Boolean(tokens?.accessToken) && isFetchingProfile),
    isLoadingProfile: isFetchingProfile,
    completeSignIn,
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
