import { createHashRouter } from 'react-router';

import ProtectedPageLayout from './layouts';
import AccountPage from './pages/AccountPage';
import EntityPage from './pages/EntityPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import TagPage from './pages/TagPage';

/** IMPORTANT: use hash router instead of browser router to avoid conflicts with the server routes
 *IF still want to use browser router we have 2 options:
 *1. each page will have index.html file and an App component mount to root element (like server side rendering (litterly re-invent nextjs with bun and elysia))
 *2. Build fe to static html files and serve them with elysia static plugin with a get('*') route to fallback to index.html => losing hot upload feature when developing
 **/
const router = createHashRouter([
  {
    Component: ProtectedPageLayout,
    children: [
      {
        path: '/',
        Component: HomePage,
      },
      {
        path: '/profile',
        Component: ProfilePage,
      },
      {
        path: '/transactions',
        Component: NotFoundPage,
      },
      {
        path: '/budgets',
        Component: NotFoundPage,
      },
      {
        path: '/accounts',
        Component: AccountPage,
      },
      {
        path: '/investments',
        Component: NotFoundPage,
      },
      {
        path: '/categories',
        Component: NotFoundPage,
      },
      {
        path: '/entities',
        Component: EntityPage,
      },
      {
        path: '/tags',
        Component: TagPage,
      },
      {
        path: '/rules',
        Component: NotFoundPage,
      },
      {
        path: '/statistics',
        Component: NotFoundPage,
      },
      {
        path: '/404',
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
