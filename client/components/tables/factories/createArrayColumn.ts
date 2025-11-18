import type { ParseKeys } from 'i18next';
import { renderArray } from '../renderers';
import type { DataTableColumn, TypedAccessor } from '../types';

export type ArrayColumnOptions<
  T,
  TAccessor extends TypedAccessor<T, any>,
  TItem = any,
> = {
  accessor: TAccessor;
  title?: ParseKeys;
  id?: string;
  getLabel: (item: TItem) => string;
  getColor?: (item: TItem) => string;
  variant?: 'badge' | 'text';
  badgeVariant?: 'light' | 'filled' | 'outline' | 'dot' | 'gradient';
  separator?: string;
  emptyValue?: string;
  maxItems?: number;
  enableSorting?: boolean;
  enableGrouping?: boolean;
  width?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
};

export function createArrayColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any>,
  TItem = any,
>(
  options: ArrayColumnOptions<T, TAccessor, TItem>,
): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    type: 'array',
    enableSorting: options.enableSorting ?? false,
    enableGrouping: options.enableGrouping ?? false,
    width: options.width,
    textAlign: options.textAlign,
    arrayConfig: {
      getLabel: options.getLabel,
      variant: options.variant,
      color: options.getColor,
      separator: options.separator,
    },
    render: (value: any) =>
      renderArray({
        items: value as TItem[],
        getLabel: options.getLabel,
        getColor: options.getColor,
        variant: options.variant,
        badgeVariant: options.badgeVariant,
        separator: options.separator,
        emptyValue: options.emptyValue,
        maxItems: options.maxItems,
      }),
  };
}
