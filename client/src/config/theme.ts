import { type ThemeConfig, theme } from 'antd';

export type ThemeMode = 'light' | 'dark';

/**
 * Design tokens
 */
const tokens = {
  colorPrimary: '#1677ff',
  borderRadius: 8,
  fontFamily:
    'Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  colors: {
    light: {
      bg: '#f5f5f5',
      bgStrong: '#ffffff',
      fg: '#0f172a',
      muted: '#475569',
      border: '#e2e8f0',
    },
    dark: {
      bg: '#0f172a',
      bgStrong: '#101828',
      fg: '#f8fafc',
      muted: '#cbd5f5',
      border: '#1e293b',
    },
  },
};

/**
 * Get theme configuration with design tokens and component overrides
 */
export function getThemeConfig(mode: ThemeMode): ThemeConfig {
  const isDark = mode === 'dark';
  const colors = isDark ? tokens.colors.dark : tokens.colors.light;

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: tokens.colorPrimary,
      fontFamily: tokens.fontFamily,
      colorBgLayout: colors.bg,
      borderRadius: tokens.borderRadius,
      // Spacing tokens
      padding: tokens.spacing.md,
      paddingLG: tokens.spacing.lg,
      paddingXL: tokens.spacing.xl,
      margin: tokens.spacing.md,
      marginLG: tokens.spacing.lg,
      marginXL: tokens.spacing.xl,
    },
    components: {
      Layout: {
        headerBg: colors.bgStrong,
        bodyBg: colors.bg,
        siderBg: colors.bgStrong,
      },
      Menu: {
        itemSelectedBg: 'rgba(22, 119, 255, 0.15)',
        itemSelectedColor: '#0958d9',
      },
      Card: {
        borderRadius: tokens.borderRadius,
        paddingLG: tokens.spacing.lg,
      },
      Button: {
        borderRadius: tokens.borderRadius,
        paddingInline: tokens.spacing.md,
      },
      Input: {
        borderRadius: tokens.borderRadius,
      },
      Table: {
        borderRadius: tokens.borderRadius,
      },
    },
  };
}
