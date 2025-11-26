import { type ThemeConfig, theme } from 'antd';

export const themeConfig: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1677ff',
    fontFamily:
      'Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
    colorBgLayout: 'var(--app-bg)',
    borderRadius: 8,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: 'var(--app-bg)',
      siderBg: '#ffffff',
    },
    Menu: {
      itemSelectedBg: 'rgba(22, 119, 255, 0.15)',
      itemSelectedColor: '#0958d9',
    },
  },
};
