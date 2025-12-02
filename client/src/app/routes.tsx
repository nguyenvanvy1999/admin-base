import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from 'src/components/common/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage'));
const AdminUsersPage = lazy(
  () => import('../features/admin/users/pages/AdminUsersPage'),
);
const AdminRolesPage = lazy(
  () => import('../features/admin/roles/pages/AdminRolesPage'),
);
const AdminPermissionsPage = lazy(
  () => import('../features/admin/permissions/pages/AdminPermissionsPage'),
);
const AdminSettingsPage = lazy(
  () => import('../features/admin/settings/pages/AdminSettingsPage'),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute requiredPermissions={['USER.VIEW']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/roles"
          element={
            <ProtectedRoute requiredPermissions={['ROLE.VIEW']}>
              <AdminRolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/permissions"
          element={
            <ProtectedRoute requiredPermissions={['ROLE.VIEW']}>
              <AdminPermissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute requiredPermissions={['SETTING.VIEW']}>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="403" element={<AccessDeniedPage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}
