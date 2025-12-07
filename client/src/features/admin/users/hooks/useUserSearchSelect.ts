import { useEffect, useState } from 'react';
import { adminUsersService } from '../services/admin-users.service';

export interface UseUserSearchSelectOptions {
  enabled?: boolean;
  take?: number;
  debounceMs?: number;
}

export interface UseUserSearchSelectResult {
  userSearch: string;
  setUserSearch: (search: string) => void;
  userOptions: { label: string; value: string }[];
  isLoading: boolean;
}

export function useUserSearchSelect(
  options: UseUserSearchSelectOptions = {},
): UseUserSearchSelectResult {
  const { enabled = true, take = 30, debounceMs = 300 } = options;
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setUserOptions([]);
      return;
    }

    // Only fetch when user actually searches (not on mount)
    if (!userSearch.trim()) {
      setUserOptions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const result = await adminUsersService.list({
          skip: 0,
          take,
          search: userSearch.trim() || undefined,
        });

        if (!controller.signal.aborted) {
          setUserOptions(
            result.docs.map((user) => ({
              label: user.email,
              value: user.id,
            })),
          );
        }
      } catch {
        // handled by global error handler in apiClient
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Debounce search to avoid spam API calls
    timeoutId = setTimeout(() => {
      void fetchUsers();
    }, debounceMs);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [enabled, userSearch, take, debounceMs]);

  return {
    userSearch,
    setUserSearch,
    userOptions,
    isLoading,
  };
}
