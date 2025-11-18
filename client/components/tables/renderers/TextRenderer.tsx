import { Text } from '@mantine/core';
import type React from 'react';

export type TextRendererConfig = {
  value: string | null | undefined;
  ellipsis?: boolean;
  emptyValue?: string;
  emptyStyle?: React.CSSProperties;
  maxLength?: number;
};

export function renderText(config: TextRendererConfig): React.ReactNode {
  const value = config.value;

  // Handle empty values
  if (!value || value.trim() === '') {
    return (
      <Text size="sm" c="dimmed" style={config.emptyStyle}>
        {config.emptyValue || '-'}
      </Text>
    );
  }

  // Truncate if maxLength is specified
  const displayValue =
    config.maxLength && value.length > config.maxLength
      ? `${value.substring(0, config.maxLength)}...`
      : value;

  return (
    <Text
      size="sm"
      style={{
        ...(config.ellipsis && {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      }}
    >
      {displayValue}
    </Text>
  );
}
