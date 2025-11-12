import { createRoot } from 'react-dom/client';
import '@client/global.css';
import { queryClient } from '@client/libs/queryClient';
import { ColorSchemeScript } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { useUserQuery } from './hooks/queries/useUserQuery';
import MantineProvider from './providers/MantineProvider';
import router from './router';
import './i18n';
import { ACCESS_TOKEN_KEY } from '@client/constants';
import {
  accessTokenRefreshSubject,
  configSubject,
} from '@client/utils/subjects';

configSubject.next({
  apiUrl: window.location.origin,
  authApiUrl: window.location.origin,
  isDev: import.meta.env.DEV || false,
});

const token = localStorage.getItem(ACCESS_TOKEN_KEY);
if (token) {
  accessTokenRefreshSubject.next(token);
}

function AppContent() {
  useUserQuery();

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="light" />
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </MantineProvider>
    </>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
