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
  const hasMaxLimit = typeof config.maxItems === 'number';
  const maxItems = hasMaxLimit ? config.maxItems! : items.length;
  const displayItems = hasMaxLimit ? items.slice(0, maxItems) : items;
  const hasMore = hasMaxLimit && items.length > maxItems;

  // Text variant - join with separator
  if (config.variant === 'text') {
    const text = displayItems
      .map(config.getLabel)
      .join(config.separator || ', ');
    return (
      <Text size="sm">
        {text}
        {hasMore && ` +${items.length - maxItems}`}
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
      {hasMore && (
        <Badge color="gray" variant="light" size="sm">
          +{items.length - maxItems}
        </Badge>
      )}
    </Group>
  );
}
