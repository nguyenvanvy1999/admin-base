import { Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string | ReactNode;
  description?: string | ReactNode;
  order?: 1 | 2 | 3 | 4 | 5 | 6;
};

export const PageHeader = ({
  title,
  description,
  order = 1,
}: PageHeaderProps) => {
  return (
    <Stack gap="xs">
      <Title order={order}>{title}</Title>
      {description && <Text c="dimmed">{description}</Text>}
    </Stack>
  );
};
