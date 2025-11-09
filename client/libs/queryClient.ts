import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
