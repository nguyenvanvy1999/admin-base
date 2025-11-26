import { Card, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

interface AuthFormContainerProps {
  children: ReactNode;
  subtitle?: string;
  description?: string;
}

export const AuthFormContainer = ({
  children,
  subtitle,
  description,
}: AuthFormContainerProps) => {
  return (
    <Card
      shadow="md"
      radius="md"
      p="xl"
      withBorder
      style={{
        width: '100%',
        maxWidth: '500px',
      }}
    >
      {(subtitle || description) && (
        <Stack gap="sm" mb="xl" align="center">
          {subtitle && (
            <Title order={2} ta="center">
              {subtitle}
            </Title>
          )}
          {description && (
            <Text size="sm" c="dimmed" ta="center">
              {description}
            </Text>
          )}
        </Stack>
      )}
      {children}
    </Card>
  );
};
