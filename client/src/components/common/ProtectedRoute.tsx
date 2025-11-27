import { useAuth } from '@client/hooks/auth/useAuth';
import { Button, Result } from 'antd';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { FullScreenLoader } from './FullScreenLoader';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Protected Route - Requires authentication
 */
export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
