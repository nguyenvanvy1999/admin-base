import { useAuth as useAuthContext } from '@client/app/providers/AuthProvider';

export { useAuthContext as useAuth };

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuthContext();
  return { isAuthenticated, isLoading };
}
