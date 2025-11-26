import { FullScreenLoader } from '@client/components/common/FullScreenLoader';
import { themeConfig } from '@client/config/theme';
import { queryClient } from '@client/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export function AppProvider() {
  const { i18n } = useTranslation();

  const antdLocale = i18n.language === 'en' ? enUS : viVN;

  return (
    <ConfigProvider theme={themeConfig} locale={antdLocale}>
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
