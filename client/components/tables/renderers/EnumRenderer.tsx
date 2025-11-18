import { Badge, Text } from '@mantine/core';
import type React from 'react';

export type EnumRendererConfig = {
  value: string | number | null | undefined;
  labelMap: Record<string, string>;
  colorMap?: Record<string, string>;
  defaultColor?: string;
  variant?: 'light' | 'filled' | 'outline' | 'dot' | 'gradient';
  emptyValue?: string;
};

export function renderEnum(config: EnumRendererConfig): React.ReactNode {
  // Handle empty values
  if (config.value === null || config.value === undefined) {
    return (
      <Text size="sm" c="dimmed">
        {config.emptyValue || '-'}
      </Text>
    );
  }

  const valueKey = String(config.value);
  const label = config.labelMap[valueKey] || valueKey;
  const color = config.colorMap?.[valueKey] || config.defaultColor || 'blue';

  return (
    <Badge color={color} variant={config.variant || 'light'}>
      {label}
    </Badge>
  );
}
