import type { ParseKeys } from 'i18next';
import {
  type ActionColumnOptions,
  renderActionButtons,
  renderBadge,
  renderBooleanBadge,
  renderCurrency,
  renderDate,
  renderTypeBadge,
} from './columnRenderers';
import type { ColumnFactoryOptions } from './commonTypes';
import type { DataTableColumn, TypedAccessor } from './types';

export function createActionColumn<T extends { id: string }>(
  options: ActionColumnOptions<T>,
): DataTableColumn<T> {
  return {
    title: (options.title || 'common.actions') as ParseKeys,
    textAlign: options.textAlign || 'center',
    width: options.width || '8rem',
    enableSorting: false,
    render: (_value: any, row: T) => renderActionButtons(options, row),
  } as DataTableColumn<T>;
}

export function createBadgeColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any> = any,
>(
  options: ColumnFactoryOptions<T> & {
    accessor?: TAccessor;
    getLabel: (row: T) => string;
    getColor?: (row: T) => string;
    variant?: 'light' | 'filled' | 'outline' | 'dot' | 'gradient';
  },
): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? false,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    render: (_value, row) =>
      renderBadge({
        label: options.getLabel(row),
        color: options.getColor?.(row),
        variant: options.variant || 'light',
      }),
  } as DataTableColumn<T, TAccessor>;
}

export function createTypeColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any> = any,
>(
  options: ColumnFactoryOptions<T> & {
    accessor?: TAccessor;
    getType: (row: T) => string;
    labelMap: Record<string, string>;
    colorMap?: Record<string, string>;
    defaultColor?: string;
  },
): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? false,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    render: (_value, row) =>
      renderTypeBadge({
        value: options.getType(row),
        labelMap: options.labelMap,
        colorMap: options.colorMap,
        defaultColor: options.defaultColor,
      }),
  } as DataTableColumn<T, TAccessor>;
}

export function createCurrencyColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any> = any,
>(
  options: ColumnFactoryOptions<T> & {
    accessor?: TAccessor;
    getValue: (row: T) => number | string;
    getSymbol?: (row: T) => string | null | undefined;
    decimalScale?: number;
    allowNegative?: boolean;
    getColor?: (row: T) => string | undefined;
    showPlus?: boolean;
  },
): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? true,
    enableGrouping: options.enableGrouping,
    aggregationFn: options.aggregationFn,
    AggregatedCell: options.AggregatedCell,
    width: options.width,
    textAlign: options.textAlign || 'right',
    ellipsis: options.ellipsis,
    render: (_value, row) =>
      renderCurrency({
        value: options.getValue(row),
        symbol: options.getSymbol?.(row) || undefined,
        decimalScale: options.decimalScale,
        allowNegative: options.allowNegative,
        color: options.getColor?.(row),
        showPlus: options.showPlus,
      }),
  } as DataTableColumn<T, TAccessor>;
}

export function createDateColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any> = any,
>(
  options: ColumnFactoryOptions<T> & {
    accessor?: TAccessor;
    getValue: (row: T) => string | Date | null | undefined;
    format?: string;
    fallback?: string;
  },
): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? true,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    render: (_value, row) =>
      renderDate({
        value: options.getValue(row),
        format: options.format,
        fallback: options.fallback,
      }),
  } as DataTableColumn<T, TAccessor>;
}

export function createBooleanColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any> = any,
>(
  options: ColumnFactoryOptions<T> & {
    accessor?: TAccessor;
    getValue: (row: T) => boolean;
    trueLabel?: string;
    falseLabel?: string;
    trueColor?: string;
    falseColor?: string;
  },
): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? false,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    render: (_value, row) =>
      renderBooleanBadge({
        value: options.getValue(row),
        trueLabel: options.trueLabel,
        falseLabel: options.falseLabel,
        trueColor: options.trueColor,
        falseColor: options.falseColor,
      }),
  } as DataTableColumn<T, TAccessor>;
}
