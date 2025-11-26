import { FullScreenLoader } from '@client/components/common/FullScreenLoader';
import { getThemeConfig } from '@client/config/theme';
import { queryClient } from '@client/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ThemeModeProvider, useThemeMode } from './themeModeContext';

function AppContent() {
  const { i18n } = useTranslation();
  const { mode } = useThemeMode();

  const themeConfig = useMemo(() => getThemeConfig(mode), [mode]);
  const antdLocale = i18n.language === 'en' ? enUS : viVN;

  return (
    <ConfigProvider theme={themeConfig} locale={antdLocale}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Suspense fallback={<FullScreenLoader />}>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export function AppProvider() {
  return (
    <ThemeModeProvider>
      <AppContent />
    </ThemeModeProvider>
  );
}
