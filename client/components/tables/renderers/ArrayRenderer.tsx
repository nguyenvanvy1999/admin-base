import { Badge, Group, Text } from '@mantine/core';
import type React from 'react';

export type ArrayRendererConfig<T = any> = {
  items: T[] | null | undefined;
  getLabel: (item: T) => string;
  getColor?: (item: T) => string;
  variant?: 'badge' | 'text';
  badgeVariant?: 'light' | 'filled' | 'outline' | 'dot' | 'gradient';
  separator?: string;
  emptyValue?: string;
  maxItems?: number;
};

export function renderArray<T = any>(
  config: ArrayRendererConfig<T>,
): React.ReactNode {
  const items = config.items;

  // Handle empty arrays
  if (!items || items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {config.emptyValue || '-'}
      </Text>
    );
  }

  // Limit items if maxItems is specified
  const displayItems = config.maxItems
    ? items.slice(0, config.maxItems)
    : items;
  const hasMore = config.maxItems && items.length > config.maxItems;

  // Text variant - join with separator
  if (config.variant === 'text') {
    const text = displayItems
      .map(config.getLabel)
      .join(config.separator || ', ');
    return (
      <Text size="sm">
        {text}
        {hasMore && ` +${items.length - config.maxItems}`}
      </Text>
    );
  }

  // Badge variant (default)
  return (
    <Group gap="xs" wrap="wrap">
      {displayItems.map((item, index) => {
        const label = config.getLabel(item);
        const color = config.getColor?.(item) || 'blue';
        return (
          <Badge
            key={index}
            color={color}
            variant={config.badgeVariant || 'light'}
            size="sm"
          >
            {label}
          </Badge>
        );
      })}
      {hasMore && config.maxItems && (
        <Badge color="gray" variant="light" size="sm">
          +{items.length - config.maxItems}
        </Badge>
      )}
    </Group>
  );
}
