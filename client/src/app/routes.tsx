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
const AdminUserDetailPage = lazy(
  () => import('../features/admin/users/pages/AdminUserDetailPage'),
);
const AdminRolesPage = lazy(
  () => import('../features/admin/roles/pages/AdminRolesPage'),
);
const AdminRoleDetailPage = lazy(
  () => import('../features/admin/roles/pages/AdminRoleDetailPage'),
);
const AdminPermissionsPage = lazy(
  () => import('../features/admin/permissions/pages/AdminPermissionsPage'),
);
const AdminSettingsPage = lazy(
  () => import('../features/admin/settings/pages/AdminSettingsPage'),
);
const AdminSessionsPage = lazy(
  () => import('../features/admin/sessions/pages/AdminSessionsPage'),
);
const AdminI18nPage = lazy(
  () => import('../features/admin/i18n/pages/AdminI18nPage'),
);
const AdminUserIpWhitelistPage = lazy(
  () =>
    import(
      '../features/admin/user-ip-whitelists/pages/AdminUserIpWhitelistPage'
    ),
);
const AdminAuditLogPage = lazy(
  () => import('../features/admin/audit-logs/pages/AdminAuditLogPage'),
);
const AdminRateLimitsPage = lazy(
  () => import('../features/admin/rate-limits/pages/AdminRateLimitsPage'),
);
const MySessionsPage = lazy(() => import('./pages/MySessionsPage'));

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
          path="me/sessions"
          element={
            <ProtectedRoute
              requiredPermissions={['SESSION.VIEW', 'SESSION.VIEW_ALL']}
              permissionMode="any"
            >
              <MySessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute requiredPermissions={['USER.VIEW']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users/:userId"
          element={
            <ProtectedRoute requiredPermissions={['USER.VIEW']}>
              <AdminUserDetailPage />
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
          path="admin/roles/:roleId"
          element={
            <ProtectedRoute requiredPermissions={['ROLE.VIEW']}>
              <AdminRoleDetailPage />
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
        <Route
          path="admin/sessions"
          element={
            <ProtectedRoute requiredPermissions={['SESSION.VIEW']}>
              <AdminSessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/i18n"
          element={
            <ProtectedRoute requiredPermissions={['I18N.VIEW']}>
              <AdminI18nPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/user-ip-whitelists"
          element={
            <ProtectedRoute requiredPermissions={['IPWHITELIST.VIEW']}>
              <AdminUserIpWhitelistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/audit-logs"
          element={
            <ProtectedRoute
              requiredPermissions={['AUDIT_LOG.VIEW_ALL', 'AUDIT_LOG.VIEW']}
              permissionMode="any"
            >
              <AdminAuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/rate-limits"
          element={
            <ProtectedRoute requiredPermissions={['RATE_LIMIT.VIEW']}>
              <AdminRateLimitsPage />
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
