import { type ThemeConfig, theme } from 'antd';

export type ThemeMode = 'light' | 'dark';

export function getThemeConfig(mode: ThemeMode): ThemeConfig {
  const isDark = mode === 'dark';

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
      fontFamily:
        'Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
      colorBgLayout: 'var(--app-bg)',
      borderRadius: 8,
    },
    components: {
      Layout: {
        headerBg: isDark ? '#101828' : '#ffffff',
        bodyBg: 'var(--app-bg)',
        siderBg: isDark ? '#101828' : '#ffffff',
      },
      Menu: {
        itemSelectedBg: 'rgba(22, 119, 255, 0.15)',
        itemSelectedColor: '#0958d9',
      },
    },
  };
}
