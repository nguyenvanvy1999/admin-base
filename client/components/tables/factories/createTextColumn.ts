import type { ParseKeys } from 'i18next';
import { renderText } from '../renderers';
import type { DataTableColumn, TypedAccessor } from '../types';

export type TextColumnOptions<T, TAccessor extends TypedAccessor<T, any>> = {
  accessor: TAccessor;
  title?: ParseKeys;
  id?: string;
  ellipsis?: boolean;
  emptyValue?: string;
  emptyStyle?: React.CSSProperties;
  maxLength?: number;
  enableSorting?: boolean;
  enableGrouping?: boolean;
  width?: `${number}rem`;
  textAlign?: 'left' | 'center' | 'right';
};

export function createTextColumn<
  T extends { id: string },
  TAccessor extends TypedAccessor<T, any>,
>(options: TextColumnOptions<T, TAccessor>): DataTableColumn<T, TAccessor> {
  return {
    id: options.id,
    title: options.title,
    accessor: options.accessor,
    type: 'text',
    ellipsis: options.ellipsis,
    emptyValue: options.emptyValue,
    emptyStyle: options.emptyStyle,
    enableSorting: options.enableSorting ?? true,
    enableGrouping: options.enableGrouping,
    width: options.width,
    textAlign: options.textAlign,
    render: (value: any) =>
      renderText({
        value: String(value || ''),
        ellipsis: options.ellipsis,
        emptyValue: options.emptyValue,
        emptyStyle: options.emptyStyle,
        maxLength: options.maxLength,
      }),
  };
}
