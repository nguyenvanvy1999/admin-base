import { SimpleGrid, type SimpleGridProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface FormRowProps extends Omit<SimpleGridProps, 'cols'> {
  children: ReactNode;
  cols?: number;
}

export function FormRow({ children, cols = 2, ...props }: FormRowProps) {
  return (
    <SimpleGrid cols={cols} {...props}>
      {children}
    </SimpleGrid>
  );
}
