import type { ParseKeys } from 'i18next';
import { renderNumber } from '../renderers';
import type { DataTableColumn, TypedAccessor } from '../types';

export type NumberColumnOptions<T, TAccessor extends TypedAccessor<T, any>> = {
  accessor: TAccessor;
  title?: ParseKeys;
  id?: string;
  decimalScale?: number;
  thousandSeparator?: string;
  prefix?: string;
  suffix?: string;
  getColor?: (row: T) => string | undefined;
  emptyValue?: string;
  enableSorting?: boolean;
  enableGrouping?: boolean;
  aggregationFn?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  width?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
};

export function createNumberColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any>,
>(options: NumberColumnOptions<T, TAccessor>): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    type: 'number',
    enableSorting: options.enableSorting ?? true,
    enableGrouping: options.enableGrouping,
    aggregationFn: options.aggregationFn,
    width: options.width,
    textAlign: options.textAlign || 'right',
    render: (value: any, row: T) =>
      renderNumber({
        value: value as number,
        decimalScale: options.decimalScale,
        thousandSeparator: options.thousandSeparator,
        prefix: options.prefix,
        suffix: options.suffix,
        color: options.getColor?.(row),
        emptyValue: options.emptyValue,
      }),
  };
}
