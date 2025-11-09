import { createRoot } from 'react-dom/client';
import '@client/global.css';
import { ColorSchemeScript } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { queryClient } from '@/lib/queryClient';
import { useUserQuery } from './hooks/queries/useUserQuery';
import MantineProvider from './providers/MantineProvider';
import router from './router';
import './i18n';

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
