import type { MantineThemeOverride } from '@mantine/core';
import {
  ActionIcon,
  Button,
  Card,
  Container,
  createTheme,
  Modal,
  Paper,
  rem,
  Select,
} from '@mantine/core';

const CONTAINER_SIZES: Record<string, string> = {
  xxs: rem('200px'),
  xs: rem('300px'),
  sm: rem('400px'),
  md: rem('500px'),
  lg: rem('600px'),
  xl: rem('1400px'),
  xxl: rem('1600px'),
};

// Color palettes generated from CSS variables in tokens.css
const themeColors = {
  brand: [
    '#e0f8ff',
    '#ccedff',
    '#99daff',
    '#66c7ff',
    '#33b4ff',
    '#00a1ff',
    '#008ee6',
    '#007acc',
    '#0067b3',
    '#005499',
  ],
  income: [
    '#e1f9e8',
    '#cef2d7',
    '#aee5b9',
    '#8cd89a',
    '#69cb7c',
    '#47be5d',
    '#39a950',
    '#2b9343',
    '#1d7d36',
    '#0f6729',
  ],
  expense: [
    '#ffe2e2',
    '#ffcfcf',
    '#ff9e9e',
    '#ff6c6c',
    '#ff3b3b',
    '#ff0a0a',
    '#e60000',
    '#cc0000',
    '#b30000',
    '#990000',
  ],
};

export const mantineTheme: MantineThemeOverride = createTheme({
  /** Put your mantine theme override here */
  fontSizes: {
    xs: rem('12px'),
    sm: rem('14px'),
    md: rem('16px'),
    lg: rem('18px'),
    xl: rem('20px'),
    '2xl': rem('24px'),
    '3xl': rem('30px'),
    '4xl': rem('36px'),
    '5xl': rem('48px'),
  },
  spacing: {
    '3xs': rem('4px'),
    '2xs': rem('8px'),
    xs: rem('10px'),
    sm: rem('12px'),
    md: rem('16px'),
    lg: rem('20px'),
    xl: rem('24px'),
    '2xl': rem('28px'),
    '3xl': rem('32px'),
  },
  primaryColor: 'brand',
  colors: {
    brand: themeColors.brand,
    income: themeColors.income,
    expense: themeColors.expense,
  },
  components: {
    Container: Container.extend({
      vars: (_, { size, fluid }) => ({
        root: {
          '--container-size': fluid
            ? '100%'
            : size !== undefined && size in CONTAINER_SIZES
              ? CONTAINER_SIZES[size]
              : rem(size),
        },
      }),
    }),
    Paper: Paper.extend({
      defaultProps: {
        p: 'md',
        shadow: 'xl',
        radius: 'md',
        withBorder: true,
      },
    }),

    Card: Card.extend({
      defaultProps: {
        p: 'xl',
        shadow: 'xl',
        radius: 'var(--mantine-radius-default)',
        withBorder: true,
      },
    }),
    Select: Select.extend({
      defaultProps: {
        checkIconPosition: 'right',
      },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        variant: 'subtle',
        size: 'sm',
      },
    }),
    Button: Button.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.55,
          blur: 3,
        },
      },
    }),
  },
  other: {
    style: 'mantine',
  },
});
