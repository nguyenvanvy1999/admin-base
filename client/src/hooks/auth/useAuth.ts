import { useAuth as useAuthContext } from '@client/app/providers/AuthProvider';

/**
 * Re-export useAuth hook for convenience
 */
export { useAuthContext as useAuth };

/**
 * Hook to check if user is authenticated
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuthContext();
  return { isAuthenticated, isLoading };
}
