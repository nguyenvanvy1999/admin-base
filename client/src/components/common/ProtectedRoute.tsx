import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'src/hooks/auth/useAuth';
import { FullScreenLoader } from './FullScreenLoader';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isBootstrapping, isLoadingProfile } = useAuth();

  if (isBootstrapping || isLoadingProfile) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
