import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'src/hooks/auth/useAuth';
import { FullScreenLoader } from './FullScreenLoader';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requiredPermissions?: string[];
  permissionMode?: 'all' | 'any';
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiredPermissions,
  permissionMode = 'all',
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isBootstrapping, isLoadingProfile, user } =
    useAuth();

  if (isBootstrapping || isLoadingProfile) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredPermissions?.length) {
    const permissions = user?.permissions ?? [];
    const hasAccess =
      permissionMode === 'any'
        ? requiredPermissions.some((code) => permissions.includes(code))
        : requiredPermissions.every((code) => permissions.includes(code));

    if (!hasAccess) {
      return fallback ?? <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
}
