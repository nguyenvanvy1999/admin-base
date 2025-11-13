import {
  Box,
  type BoxProps,
  createPolymorphicComponent,
  type PaperProps,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { forwardRef, type ReactNode } from 'react';

export type CardFeel = 'flat' | 'elevated' | 'bordered';

type SurfaceProps = {
  children: ReactNode;
  feel?: CardFeel;
  hover?: boolean;
} & BoxProps &
  PaperProps;

const Surface = createPolymorphicComponent<'div', SurfaceProps>(
  forwardRef<HTMLDivElement, SurfaceProps>(
    (
      { children, feel = 'elevated', hover = false, className, ...others },
      ref,
    ) => {
      const theme = useMantineTheme();
      const { colorScheme } = useMantineColorScheme();

      const getCardClasses = () => {
        const classes = ['surface-card'];

        switch (feel) {
          case 'flat':
            classes.push('surface-flat');
            break;
          case 'bordered':
            classes.push('surface-bordered');
            break;
          case 'elevated':
          default:
            classes.push('surface-elevated');
            break;
        }

        if (hover) {
          classes.push('surface-hover');
        }

        return classes.join(' ');
      };

      const combinedClassName = [getCardClasses(), className]
        .filter(Boolean)
        .join(' ');

      const getStyles = () => {
        const baseStyles: React.CSSProperties = {
          borderRadius: theme.radius.md,
          transition: 'all 0.2s ease',
          backgroundColor: 'var(--mantine-color-body)',
        };

        switch (feel) {
          case 'flat':
            return {
              ...baseStyles,
              boxShadow: 'none',
              border: 'none',
            };
          case 'bordered':
            return {
              ...baseStyles,
              boxShadow: 'none',
              border: `1px solid ${
                colorScheme === 'dark'
                  ? theme.colors.dark[4]
                  : theme.colors.gray[3]
              }`,
            };
          case 'elevated':
          default:
            return {
              ...baseStyles,
              boxShadow: theme.shadows.md,
              border: 'none',
            };
        }
      };

      return (
        <Box
          component="div"
          className={combinedClassName}
          style={getStyles()}
          {...others}
          ref={ref}
        >
          {children}
        </Box>
      );
    },
  ),
);

Surface.displayName = 'Surface';

export default Surface;
