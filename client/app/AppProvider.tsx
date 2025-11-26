import { FullScreenLoader } from '@client/components/common/FullScreenLoader';
import { themeConfig } from '@client/config/theme';
import { queryClient } from '@client/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntdApp, ConfigProvider } from 'antd';
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export function AppProvider() {
  return (
    <ConfigProvider theme={themeConfig}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<FullScreenLoader />}>
            <RouterProvider router={router} />
          </Suspense>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
