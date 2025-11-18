import type { ParseKeys } from 'i18next';
import { renderEnum } from '../renderers';
import type { DataTableColumn, TypedAccessor } from '../types';

export type EnumColumnOptions<T, TAccessor extends TypedAccessor<T, any>> = {
  accessor: TAccessor;
  title?: ParseKeys;
  id?: string;
  labelMap: Record<string, string>;
  colorMap?: Record<string, string>;
  defaultColor?: string;
  variant?: 'light' | 'filled' | 'outline' | 'dot' | 'gradient';
  emptyValue?: string;
  enableSorting?: boolean;
  enableGrouping?: boolean;
  width?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
};

export function createEnumColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any>,
>(options: EnumColumnOptions<T, TAccessor>): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    type: 'enum',
    enableSorting: options.enableSorting ?? false,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    enumConfig: {
      labelMap: options.labelMap,
      colorMap: options.colorMap,
      defaultColor: options.defaultColor,
    },
    render: (value: any) =>
      renderEnum({
        value: value as string | number,
        labelMap: options.labelMap,
        colorMap: options.colorMap,
        defaultColor: options.defaultColor,
        variant: options.variant,
        emptyValue: options.emptyValue,
      }),
  };
}
