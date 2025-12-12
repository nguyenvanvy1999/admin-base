import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from 'src/app/providers/AuthProvider';
import {
  ThemeModeProvider,
  useThemeMode,
} from 'src/app/providers/ThemeModeProvider';
import { ErrorBoundary } from 'src/components/common/ErrorBoundary';
import { FullScreenLoader } from 'src/components/common/FullScreenLoader';
import { getThemeConfig } from 'src/config/theme';
import { queryClient } from 'src/lib/queryClient';
import { AppRoutes } from './routes';

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((d) => ({
    default: d.ReactQueryDevtools,
  })),
);

function AppContent() {
  const { i18n } = useTranslation();
  const { mode } = useThemeMode();

  const themeConfig = useMemo(() => getThemeConfig(mode), [mode]);
  const antdLocale = i18n.language === 'en' ? enUS : viVN;

  return (
    <ConfigProvider theme={themeConfig} locale={antdLocale}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense fallback={<FullScreenLoader />}>
                  <AppRoutes />
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </AuthProvider>
          {import.meta.env.DEV && (
            <Suspense fallback={null}>
              <ReactQueryDevtools buttonPosition="bottom-left" />
            </Suspense>
          )}
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
