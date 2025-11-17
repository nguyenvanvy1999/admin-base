import { Box, type BoxProps } from '@mantine/core';
import type { ReactNode } from 'react';

type FilterInputGroupProps = {
  children: ReactNode;
  flex?: boolean;
  maxWidth?: number | string;
} & Omit<BoxProps, 'flex'>;

export const FilterInputGroup = ({
  children,
  flex = false,
  maxWidth = 300,
  ...boxProps
}: FilterInputGroupProps) => {
  return (
    <Box
      {...boxProps}
      style={{
        ...(flex ? { flex: 1 } : {}),
        ...boxProps.style,
      }}
      w={{ base: '100%', sm: maxWidth }}
    >
      {children}
    </Box>
  );
};
