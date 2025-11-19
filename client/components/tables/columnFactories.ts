import type { ParseKeys } from 'i18next';
import type React from 'react';
import {
  type ActionColumnOptions,
  renderActionButtons,
  renderBadge,
  renderBooleanBadge,
  renderCurrency,
  renderDate,
  renderEmpty,
  renderTypeBadge,
} from './columnRenderers';
import type { ColumnFactoryOptions } from './commonTypes';
import type {
  DataTableColumn,
  InferAccessorValue,
  TypedAccessor,
} from './types';

export function createActionColumn<TData extends { id: string }>(
  options: ActionColumnOptions<TData>,
): DataTableColumn<TData> {
  return {
    title: (options.title || 'common.actions') as ParseKeys,
    textAlign: options.textAlign || 'center',
    width: options.width || '8rem',
    enableSorting: false,
    render: ({ row }: { row: TData }) => renderActionButtons(options, row),
  };
}

export function createBadgeColumn<
  TData extends { id: string },
  TAccessor extends TypedAccessor<TData, any>,
>(
  options: ColumnFactoryOptions<TData> & {
    accessor: TAccessor;
    getLabel: (
      value: InferAccessorValue<TData, TAccessor>,
      row: TData,
    ) => string;
    getColor?: (
      value: InferAccessorValue<TData, TAccessor>,
      row: TData,
    ) => string;
    variant?: 'light' | 'filled' | 'outline' | 'dot' | 'gradient';
  },
): DataTableColumn<TData> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? false,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    onClick: options.onClick,
    cellsStyle: options.cellsStyle,
    render: ({ value, row }: { value: any; row: TData }) =>
      renderBadge({
        label: options.getLabel(
          value as InferAccessorValue<TData, TAccessor>,
          row,
        ),
        color: options.getColor?.(
          value as InferAccessorValue<TData, TAccessor>,
          row,
        ),
        variant: options.variant || 'light',
      }),
  };
}

export function createTypeColumn<
  TData extends { id: string },
  TAccessor extends TypedAccessor<TData, any>,
>(
  options: ColumnFactoryOptions<TData> & {
    accessor: TAccessor;
    labelMap: Record<string, string>;
    colorMap?: Record<string, string>;
    defaultColor?: string;
  },
): DataTableColumn<TData> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? false,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    onClick: options.onClick,
    cellsStyle: options.cellsStyle,
    render: ({ value }: { value: any }) =>
      renderTypeBadge({
        value: String(value),
        labelMap: options.labelMap,
        colorMap: options.colorMap,
        defaultColor: options.defaultColor,
      }),
  };
}

export function createCurrencyColumn<
  TData extends { id: string },
  TAccessor extends TypedAccessor<TData, any>,
>(
  options: ColumnFactoryOptions<TData> & {
    accessor: TAccessor;
    getSymbol?: (row: TData) => string | null | undefined;
    decimalScale?: number;
    allowNegative?: boolean;
    getColor?: (
      value: InferAccessorValue<TData, TAccessor>,
      row: TData,
    ) => string | undefined;
    showPlus?: boolean;
  },
): DataTableColumn<TData> {
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
    onClick: options.onClick,
    cellsStyle: options.cellsStyle,
    render: ({ value, row }: { value: any; row: TData }) =>
      renderCurrency({
        value: value as number | string,
        symbol: options.getSymbol?.(row) || undefined,
        decimalScale: options.decimalScale,
        allowNegative: options.allowNegative,
        color: options.getColor?.(
          value as InferAccessorValue<TData, TAccessor>,
          row,
        ),
        showPlus: options.showPlus,
      }),
  };
}

export function createDateColumn<
  TData extends { id: string },
  TAccessor extends TypedAccessor<TData, any>,
>(
  options: ColumnFactoryOptions<TData> & {
    accessor: TAccessor;
    format?: string;
    fallback?: string;
  },
): DataTableColumn<TData> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? true,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    onClick: options.onClick,
    cellsStyle: options.cellsStyle,
    render: ({ value }: { value: any }) =>
      renderDate({
        value: value as string | Date | null | undefined,
        format: options.format,
        fallback: options.fallback,
      }),
  };
}

export function createBooleanColumn<
  TData extends { id: string },
  TAccessor extends TypedAccessor<TData, any>,
>(
  options: ColumnFactoryOptions<TData> & {
    accessor: TAccessor;
    trueLabel?: string;
    falseLabel?: string;
    trueColor?: string;
    falseColor?: string;
  },
): DataTableColumn<TData> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? false,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    onClick: options.onClick,
    cellsStyle: options.cellsStyle,
    render: ({ value }: { value: any }) =>
      renderBooleanBadge({
        value: value as boolean,
        trueLabel: options.trueLabel,
        falseLabel: options.falseLabel,
        trueColor: options.trueColor,
        falseColor: options.falseColor,
      }),
  };
}

export function createTextColumn<
  TData extends { id: string },
  TAccessor extends TypedAccessor<TData, any>,
>(
  options: ColumnFactoryOptions<TData> & {
    accessor: TAccessor;
    emptyValue?: React.ReactNode;
    transform?: (
      value: InferAccessorValue<TData, TAccessor>,
      row: TData,
      rowIndex: number,
    ) => React.ReactNode;
  },
): DataTableColumn<TData> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    enableSorting: options.enableSorting ?? true,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    ellipsis: options.ellipsis,
    render: ({
      value,
      row,
      rowIndex,
    }: {
      value: any;
      row: TData;
      rowIndex: number;
    }) => {
      const typedValue = value as InferAccessorValue<TData, TAccessor>;
      if (options.transform) {
        return options.transform(typedValue, row, rowIndex);
      }
      if (
        typedValue === null ||
        typedValue === undefined ||
        (typeof typedValue === 'string' && typedValue.trim() === '')
      ) {
        if (options.emptyValue !== undefined) {
          return options.emptyValue;
        }
        return renderEmpty();
      }
      return typedValue as React.ReactNode;
    },
  };
}
