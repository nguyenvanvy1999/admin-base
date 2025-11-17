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
  TextInput,
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

export const mantineTheme: MantineThemeOverride = createTheme({
  /** Put your mantine theme override here */

  // Font families from tokens
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',

  // Font sizes from tokens
  fontSizes: {
    xs: rem('12px'), // --font-size-xs
    sm: rem('14px'), // --font-size-sm
    md: rem('16px'), // --font-size-base
    lg: rem('18px'), // --font-size-lg
    xl: rem('20px'), // --font-size-xl
  },

  // Line heights from tokens
  lineHeights: {
    xs: '1.25', // --line-height-tight
    sm: '1.375', // --line-height-snug
    md: '1.5', // --line-height-normal
    lg: '1.625', // --line-height-relaxed
    xl: '2', // --line-height-loose
  },

  // Spacing from tokens
  spacing: {
    xs: rem('8px'), // --spacing-2
    sm: rem('12px'), // --spacing-3
    md: rem('16px'), // --spacing-4
    lg: rem('20px'), // --spacing-5
    xl: rem('24px'), // --spacing-6
  },

  // Border radius from tokens
  radius: {
    xs: rem('2px'), // --radius-sm
    sm: rem('4px'), // --radius-base
    md: rem('6px'), // --radius-md
    lg: rem('8px'), // --radius-lg
    xl: rem('12px'), // --radius-xl
  },

  // Shadows from tokens
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)', // --shadow-sm
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // --shadow-base
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // --shadow-md
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', // --shadow-lg
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', // --shadow-xl
  },

  primaryColor: 'cyan',
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
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    }),

    Card: Card.extend({
      defaultProps: {
        p: 'lg',
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    }),

    Button: Button.extend({
      defaultProps: {
        radius: 'md',
      },
    }),

    TextInput: TextInput.extend({
      defaultProps: {
        radius: 'md',
      },
    }),

    Select: Select.extend({
      defaultProps: {
        checkIconPosition: 'right',
        radius: 'md',
      },
    }),

    Modal: Modal.extend({
      defaultProps: {
        radius: 'md',
        centered: true,
      },
    }),

    ActionIcon: ActionIcon.extend({
      defaultProps: {
        variant: 'subtle',
        size: 'md',
      },
    }),
  },
  other: {
    style: 'mantine',
  },
});
