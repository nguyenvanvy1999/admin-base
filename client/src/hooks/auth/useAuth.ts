import { useAuth as useAuthContext } from 'src/app/providers/AuthProvider';

export { useAuthContext as useAuth };

export function useRequireAuth() {
  const { isAuthenticated, isBootstrapping, isLoadingProfile } =
    useAuthContext();
  return {
    isAuthenticated,
    isLoading: isBootstrapping || isLoadingProfile,
  };
}
