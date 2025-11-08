import { createRoot } from 'react-dom/client';
import '@client/global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import ToastContainer from './components/ToastContainer';
import { useUserQuery } from './hooks/queries/useUserQuery';
import { queryClient } from './libs/queryClient';
import router from './router';

function AppContent() {
  useUserQuery();

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
