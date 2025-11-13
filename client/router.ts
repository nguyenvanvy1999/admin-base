import { createHashRouter } from 'react-router';

import ProtectedPageLayout from './layouts';
import AccountPage from './pages/AccountPage';
import PermissionPage from './pages/admin/PermissionPage';
import RolePage from './pages/admin/RolePage';
import SessionPage from './pages/admin/SessionPage';
import UserPage from './pages/admin/UserPage';
import BudgetPage from './pages/BudgetPage';
import BulkTransactionPage from './pages/BulkTransactionPage';
import CategoryPage from './pages/CategoryPage';
import DebtPage from './pages/DebtPage';
import DebtStatisticsPage from './pages/DebtStatisticsPage';
import EntityPage from './pages/EntityPage';
import EventPage from './pages/EventPage';
import HomePage from './pages/HomePage';
import IncomeExpenseStatisticsPage from './pages/IncomeExpenseStatisticsPage';
import InvestmentDetailPage from './pages/InvestmentDetailPage';
import InvestmentPage from './pages/InvestmentPage';
import InvestmentStatisticsPage from './pages/InvestmentStatisticsPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import TagPage from './pages/TagPage';
import TransactionPage from './pages/TransactionPage';

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
        Component: TransactionPage,
      },
      {
        path: '/transactions/bulk',
        Component: BulkTransactionPage,
      },
      {
        path: '/debts',
        Component: DebtPage,
      },
      {
        path: '/budgets',
        Component: BudgetPage,
      },
      {
        path: '/accounts',
        Component: AccountPage,
      },
      {
        path: '/investments',
        Component: InvestmentPage,
      },
      {
        path: '/investments/:investmentId',
        Component: InvestmentDetailPage,
      },
      {
        path: '/categories',
        Component: CategoryPage,
      },
      {
        path: '/entities',
        Component: EntityPage,
      },
      {
        path: '/events',
        Component: EventPage,
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
        path: '/statistics/income-expense',
        Component: IncomeExpenseStatisticsPage,
      },
      {
        path: '/statistics/investments',
        Component: InvestmentStatisticsPage,
      },
      {
        path: '/statistics/debts',
        Component: DebtStatisticsPage,
      },
      {
        path: '/statistics',
        Component: IncomeExpenseStatisticsPage,
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
        Component: SessionPage,
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
