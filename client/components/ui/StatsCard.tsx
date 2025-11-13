import { Badge, Group, type PaperProps, Text } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import { Surface } from '../layout';

type StatsCardProps = {
  data: { title: string; value: string; diff: number; period?: string };
} & PaperProps;

export const StatsCard = ({ data, ...others }: StatsCardProps) => {
  const { title, value, period, diff } = data;
  const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;

  return (
    <Surface {...others}>
      <Group justify="space-between">
        <Text size="xs" fw={500} style={{ textTransform: 'uppercase' }}>
          {title}
        </Text>
        {period && (
          <Badge variant="filled" radius="sm">
            {period}
          </Badge>
        )}
      </Group>

      <Group align="flex-end" gap="xs" mt={25}>
        <Text fz={24} fw={500} style={{ lineHeight: 1 }}>
          {value}
        </Text>
        <Text
          c={diff > 0 ? 'teal' : 'red'}
          fz="sm"
          fw={500}
          style={{
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span>{diff}%</span>
          <DiffIcon size="1rem" stroke={1.5} />
        </Text>
      </Group>

      <Text fz="xs" c="dimmed" mt={7}>
        Compared to previous period
      </Text>
    </Surface>
  );
};
