import { useSyncExternalStore } from 'react';
import { AUTH_STORAGE_KEYS } from 'src/config/auth';
import { apiClient } from 'src/lib/api/client';
import type { AuthStateSnapshot, AuthUser, TokenSet } from 'src/types/auth';

const TOKEN_META_KEY = `${AUTH_STORAGE_KEYS.accessToken}_meta`;

type Listener = () => void;

const listeners = new Set<Listener>();

const initialState: AuthStateSnapshot = {
  tokens: null,
  user: null,
  bootstrapped: false,
};

let state: AuthStateSnapshot = initialState;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setState(partial: Partial<AuthStateSnapshot>): void {
  state = { ...state, ...partial };
  emit();
}

function persistTokens(tokenSet: TokenSet | null): void {
  if (tokenSet?.accessToken) {
    apiClient.setAuthToken(tokenSet.accessToken);
    localStorage.setItem(
      TOKEN_META_KEY,
      JSON.stringify({
        issuedAt: tokenSet.issuedAt,
        expiresAt: tokenSet.expiresAt,
        expiresInSeconds: tokenSet.expiresInSeconds,
      }),
    );
    if (tokenSet.refreshToken) {
      localStorage.setItem(
        AUTH_STORAGE_KEYS.refreshToken,
        tokenSet.refreshToken,
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    }
  } else {
    apiClient.setAuthToken(null);
    localStorage.removeItem(TOKEN_META_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  }
}

function readStoredTokens(): TokenSet | null {
  const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  if (!accessToken) {
    return null;
  }

  const metaRaw = localStorage.getItem(TOKEN_META_KEY);
  let meta: Partial<TokenSet> = {};
  if (metaRaw) {
    try {
      meta = JSON.parse(metaRaw) as Partial<TokenSet>;
    } catch {
      meta = {};
    }
  }

  const refreshToken =
    localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) ?? undefined;

  return {
    accessToken,
    refreshToken,
    issuedAt: meta.issuedAt,
    expiresAt: meta.expiresAt,
    expiresInSeconds: meta.expiresInSeconds,
  };
}

function clearStorage(): void {
  persistTokens(null);
  localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
}

export const authStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getState(): AuthStateSnapshot {
    return state;
  },
  hydrate(): void {
    const tokens = readStoredTokens();
    if (tokens?.accessToken) {
      apiClient.setAuthToken(tokens.accessToken);
    }
    setState({ tokens, bootstrapped: true });
  },
  setTokens(tokens: TokenSet | null): void {
    if (tokens) {
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, tokens.accessToken);
    }
    persistTokens(tokens);
    setState({ tokens });
  },
  setUser(user: AuthUser | null): void {
    setState({ user });
  },
  clear(): void {
    clearStorage();
    setState({ tokens: null, user: null });
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  },
};

export function useAuthStore<T>(selector: (state: AuthStateSnapshot) => T): T {
  return useSyncExternalStore(
    authStore.subscribe,
    () => selector(authStore.getState()),
    () => selector(initialState),
  );
}
