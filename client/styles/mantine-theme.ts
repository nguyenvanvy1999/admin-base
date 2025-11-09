import { createTheme, type MantineColorsTuple } from '@mantine/core';

const primaryColor: MantineColorsTuple = [
  '#e0f7ff',
  '#b3eaff',
  '#80ddff',
  '#4dd0ff',
  '#1ac3ff',
  '#00a8e8',
  '#008FD3',
  '#0070a8',
  '#00527d',
  '#003452',
];

const incomeColor: MantineColorsTuple = [
  '#e8f9f0',
  '#c4f0d4',
  '#9de7b5',
  '#76de96',
  '#4fd577',
  '#22C55E',
  '#16A34A',
  '#0f7a35',
  '#085120',
  '#03280b',
];

const expenseColor: MantineColorsTuple = [
  '#fee2e2',
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#ef4444',
  '#EB4444',
  '#dc2626',
  '#b91c1c',
  '#991b1b',
  '#7f1d1d',
];

export const mantineTheme = createTheme({
  primaryColor: 'primary',
  colors: {
    primary: primaryColor,
    income: incomeColor,
    expense: expenseColor,
  },
  defaultRadius: 'md',
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '600',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
});
