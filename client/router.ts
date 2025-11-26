import { createHashRouter } from 'react-router';

import ProtectedPageLayout from './layouts';
import PermissionPage from './pages/admin/PermissionPage';
import RolePage from './pages/admin/RolePage';
import AdminSessionPage from './pages/admin/SessionPage';
import UserPage from './pages/admin/UserPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import SessionPage from './pages/SessionPage';

const router = createHashRouter([
  {
    Component: ProtectedPageLayout,
    children: [
      {
        path: '/',
        Component: UserPage,
      },
      {
        path: '/profile',
        Component: ProfilePage,
      },
      {
        path: '/sessions',
        Component: SessionPage,
      },
      {
        path: '/404',
        Component: NotFoundPage,
      },
      {
        path: '/admin/users',
        Component: UserPage,
      },
      {
        path: '/admin/roles',
        Component: RolePage,
      },
      {
        path: '/admin/permissions',
        Component: PermissionPage,
      },
      {
        path: '/admin/sessions',
        Component: AdminSessionPage,
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/register',
    Component: RegisterPage,
  },
]);

export default router;
