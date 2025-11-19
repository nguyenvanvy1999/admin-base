import { formatDate } from '@client/utils/format';
import { ActionIcon, Badge, NumberFormatter, Text } from '@mantine/core';
import { IconEdit, IconEye, IconTrash } from '@tabler/icons-react';
import type React from 'react';

export type ActionButtonConfig<T> = {
  label?: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  color?: string;
  variant?: 'subtle' | 'light' | 'filled' | 'outline';
};

export type ActionColumnOptions<T> = {
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  custom?: ActionButtonConfig<T>[];
  title?: string;
  width?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
};

export function renderActionButtons<T>(
  options: ActionColumnOptions<T>,
  row: T,
) {
  const { onEdit, onDelete, onView, custom } = options;
  const buttons: React.ReactNode[] = [];

  if (onView) {
    buttons.push(
      <ActionIcon
        key="view"
        variant="subtle"
        color="blue"
        onClick={(e) => {
          e.stopPropagation();
          onView(row);
        }}
      >
        <IconEye size={16} />
      </ActionIcon>,
    );
  }

  if (onEdit) {
    buttons.push(
      <ActionIcon
        key="edit"
        variant="subtle"
        color="blue"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(row);
        }}
      >
        <IconEdit size={16} />
      </ActionIcon>,
    );
  }

  if (onDelete) {
    buttons.push(
      <ActionIcon
        key="delete"
        variant="subtle"
        color="red"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(row);
        }}
      >
        <IconTrash size={16} />
      </ActionIcon>,
    );
  }

  if (custom) {
    custom.forEach((action, index) => {
      buttons.push(
        <ActionIcon
          key={`custom-${index}`}
          variant={action.variant || 'subtle'}
          color={action.color || 'gray'}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick(row);
          }}
        >
          {action.icon || action.label}
        </ActionIcon>,
      );
    });
  }

  if (buttons.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-2">{buttons}</div>
  );
}

export type BadgeConfig = {
  label: string;
  color?: string;
  variant?: 'light' | 'filled' | 'outline' | 'dot' | 'gradient';
};

export function renderBadge(config: BadgeConfig) {
  return (
    <Badge color={config.color || 'blue'} variant={config.variant || 'light'}>
      {config.label}
    </Badge>
  );
}

export type CurrencyConfig = {
  value: number | string;
  symbol?: string;
  decimalScale?: number;
  allowNegative?: boolean;
  color?: string;
  showPlus?: boolean;
};

export function renderCurrency(config: CurrencyConfig) {
  const numValue =
    typeof config.value === 'string' ? parseFloat(config.value) : config.value;
  const isNegative = numValue < 0;
  const displayValue = Math.abs(numValue);

  return (
    <Text
      size="sm"
      fw={500}
      c={
        config.color ||
        (isNegative ? 'red' : config.showPlus ? 'green' : undefined)
      }
    >
      {config.showPlus && numValue > 0 && (
        <Text component="span" mr={4}>
          +
        </Text>
      )}
      <NumberFormatter
        value={displayValue}
        prefix={config.symbol ? `${config.symbol} ` : ''}
        thousandSeparator=","
        decimalScale={config.decimalScale ?? 2}
        allowNegative={config.allowNegative ?? false}
      />
    </Text>
  );
}

export type DateConfig = {
  value: string | Date | null | undefined;
  format?: string;
  fallback?: string;
};

export function renderDate(config: DateConfig) {
  if (!config.value) {
    return (
      <Text size="sm" c="dimmed">
        {config.fallback || '-'}
      </Text>
    );
  }

  return <span>{formatDate(config.value, config.format)}</span>;
}

export type TypeBadgeConfig = {
  value: string;
  labelMap: Record<string, string>;
  colorMap?: Record<string, string>;
  defaultColor?: string;
};

export function renderTypeBadge(config: TypeBadgeConfig) {
  const label = config.labelMap[config.value] || config.value;
  const color =
    config.colorMap?.[config.value] || config.defaultColor || 'blue';

  return (
    <Badge color={color} variant="light">
      {label}
    </Badge>
  );
}

export type BooleanBadgeConfig = {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
  trueColor?: string;
  falseColor?: string;
};

export function renderBooleanBadge(config: BooleanBadgeConfig) {
  const isTrue = config.value === true;
  const label = isTrue ? config.trueLabel || 'Yes' : config.falseLabel || 'No';
  const color = isTrue
    ? config.trueColor || 'green'
    : config.falseColor || 'gray';

  return (
    <Badge color={color} variant="light">
      {label}
    </Badge>
  );
}

/**
 * Renders an empty cell with a dash when data is missing
 * @returns React element with gray dash indicator
 */
export function renderEmpty(): React.ReactNode {
  return <span className="text-gray-400">-</span>;
}
