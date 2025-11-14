import { Stack, type StackProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface FormSectionProps extends StackProps {
  children: ReactNode;
}

export function FormSection({ children, ...props }: FormSectionProps) {
  return (
    <Stack gap="md" {...props}>
      {children}
    </Stack>
  );
}
