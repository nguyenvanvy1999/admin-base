import { NumberFormatter, Text } from '@mantine/core';
import type React from 'react';

export type NumberRendererConfig = {
  value: number | string | null | undefined;
  decimalScale?: number;
  thousandSeparator?: string;
  prefix?: string;
  suffix?: string;
  color?: string;
  emptyValue?: string;
};

export function renderNumber(config: NumberRendererConfig): React.ReactNode {
  // Handle empty/invalid values
  if (config.value === null || config.value === undefined) {
    return (
      <Text size="sm" c="dimmed">
        {config.emptyValue || '-'}
      </Text>
    );
  }

  const numValue =
    typeof config.value === 'string' ? parseFloat(config.value) : config.value;

  if (isNaN(numValue)) {
    return (
      <Text size="sm" c="dimmed">
        {config.emptyValue || '-'}
      </Text>
    );
  }

  return (
    <Text size="sm" fw={500} c={config.color}>
      <NumberFormatter
        value={numValue}
        prefix={config.prefix}
        suffix={config.suffix}
        thousandSeparator={config.thousandSeparator || ','}
        decimalScale={config.decimalScale ?? 0}
      />
    </Text>
  );
}
