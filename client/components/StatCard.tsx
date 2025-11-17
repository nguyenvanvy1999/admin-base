import { Card, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

type StatCardProps = {
  label: string | ReactNode;
  value: string | number | ReactNode;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
};

export const StatCard = ({
  label,
  value,
  color,
  size = 'md',
}: StatCardProps) => {
  const valueSize = size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'xl';

  return (
    <Card shadow="sm" padding="lg" withBorder>
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          {label}
        </Text>
        <Text size={valueSize} fw={600} c={color}>
          {typeof value === 'number'
            ? value.toLocaleString()
            : typeof value === 'string'
              ? value
              : value}
        </Text>
      </Stack>
    </Card>
  );
};
