import { NumberFormatter } from '@mantine/core';
import type { Row } from '@tanstack/react-table';
import type React from 'react';
import type { AggregatedCellProps } from './types';

export const aggregation = {
  sum: 'sum' as const,
  avg: 'avg' as const,
  count: 'count' as const,
  min: 'min' as const,
  max: 'max' as const,
  median: 'median' as const,
  unique: 'unique' as const,
  uniqueCount: 'uniqueCount' as const,
} as const;

export type AggregationType = (typeof aggregation)[keyof typeof aggregation];

export function createAggregatedCell<T>(
  render: (value: unknown, props: AggregatedCellProps<T>) => React.ReactNode,
) {
  return (props: AggregatedCellProps<T>) => {
    const value = props.cell.getValue();
    return render(value, props);
  };
}

export function renderNumberSum<T>(
  value: unknown,
  props: AggregatedCellProps<T>,
): React.ReactNode {
  const numValue = typeof value === 'number' ? value : Number(value) || 0;
  return (
    <NumberFormatter value={numValue} thousandSeparator="," decimalScale={2} />
  );
}

export function renderNumberSumWithCurrency<T>(
  getCurrency: (row: Row<T>) => string | undefined,
  value: unknown,
  props: AggregatedCellProps<T>,
): React.ReactNode {
  const numValue = typeof value === 'number' ? value : Number(value) || 0;
  const subRows = props.row.subRows || [];
  const firstRow = subRows[0]?.original;
  const currency = firstRow ? getCurrency(props.row) : undefined;

  return (
    <NumberFormatter
      value={numValue}
      prefix={currency ? `${currency} ` : ''}
      thousandSeparator=","
      decimalScale={2}
    />
  );
}

export function renderCount<T>(
  value: unknown,
  props: AggregatedCellProps<T>,
): React.ReactNode {
  const count = typeof value === 'number' ? value : Number(value) || 0;
  return <span>{count}</span>;
}

export function renderAverage<T>(
  value: unknown,
  props: AggregatedCellProps<T>,
): React.ReactNode {
  const numValue = typeof value === 'number' ? value : Number(value) || 0;
  return (
    <NumberFormatter value={numValue} thousandSeparator="," decimalScale={2} />
  );
}

export const aggregationHelpers = {
  renderSum: <T extends Record<string, any>>() =>
    createAggregatedCell<T>(renderNumberSum),
  renderSumWithCurrency: <T extends Record<string, any>>(
    getCurrency: (row: Row<T>) => string | undefined,
  ) =>
    createAggregatedCell<T>((value, props) =>
      renderNumberSumWithCurrency(getCurrency, value, props),
    ),
  renderCount: <T extends Record<string, any>>() =>
    createAggregatedCell<T>(renderCount),
  renderAverage: <T extends Record<string, any>>() =>
    createAggregatedCell<T>(renderAverage),
};
