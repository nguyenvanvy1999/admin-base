import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { defaultColumnRender } from './formatters';
import type { DataTableColumn } from './types';

export const createIndexColumn = <T extends Record<string, any>>(
  currentPage: number = 1,
  itemsPerPage: number = 20,
  t?: (key: string, options?: { defaultValue?: string }) => string,
): ColumnDef<T> => {
  const getT = t || (() => 'STT');
  return {
    id: 'index',
    header: () => getT('common.index', { defaultValue: 'STT' }),
    cell: (info) => {
      const rowIndex = info.row.index;
      const index = (currentPage - 1) * itemsPerPage + rowIndex + 1;
      return (
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          {index}
        </span>
      );
    },
    size: 80,
    enableSorting: false,
  } as ColumnDef<T>;
};

export const convertToTanStackColumn = <T extends Record<string, any>>(
  column: DataTableColumn<T>,
  t: TFunction<'translation', undefined>,
): ColumnDef<T> => {
  const {
    title,
    accessor,
    format,
    currency,
    dateFormat,
    numberFormat,
    render,
    onClick,
    ellipsis,
    minWidth,
    width,
    autoFormatDisabled,
    ...rest
  } = column;

  const header = title
    ? typeof title === 'string' && title.includes('.')
      ? () => t(title as string, { defaultValue: title })
      : title
    : undefined;

  const getValue = (row: T): any => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    if (typeof accessor === 'string') {
      const keys = accessor.split('.');
      let value: any = row;
      for (const key of keys) {
        value = value?.[key];
      }
      return value;
    }
    return undefined;
  };

  const getCurrency = (row: T): string | null | undefined => {
    if (typeof currency === 'function') {
      return currency(row);
    }
    return currency || undefined;
  };

  const cell = (info: any) => {
    const row = info.row.original as T;
    const value = getValue(row);
    const rowCurrency = getCurrency(row);

    if (render) {
      return render(value, row, info.row.index);
    }

    if (onClick) {
      return (
        <button
          onClick={() => onClick(row)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          style={{
            maxWidth: ellipsis ? '200px' : undefined,
            overflow: ellipsis ? 'hidden' : undefined,
            textOverflow: ellipsis ? 'ellipsis' : undefined,
            whiteSpace: ellipsis ? 'nowrap' : undefined,
          }}
        >
          {defaultColumnRender(value, {
            format: format || 'auto',
            currency: rowCurrency,
            dateFormat,
            numberFormat,
            autoFormatDisabled,
          })}
        </button>
      );
    }

    return (
      <div
        style={{
          maxWidth: ellipsis ? '200px' : undefined,
          overflow: ellipsis ? 'hidden' : undefined,
          textOverflow: ellipsis ? 'ellipsis' : undefined,
          whiteSpace: ellipsis ? 'nowrap' : undefined,
        }}
      >
        {defaultColumnRender(value, {
          format: format || 'auto',
          currency: rowCurrency,
          dateFormat,
          numberFormat,
          autoFormatDisabled,
        })}
      </div>
    );
  };

  const columnDef: ColumnDef<T> = {
    ...rest,
    header,
    accessorKey: typeof accessor === 'string' ? accessor : undefined,
    accessorFn: typeof accessor === 'function' ? accessor : undefined,
    cell,
  } as ColumnDef<T>;

  if (minWidth) {
    columnDef.minSize = parseInt(minWidth.replace('rem', '')) * 16;
  }
  if (width) {
    columnDef.size = parseInt(width.replace('rem', '')) * 16;
  }

  return columnDef;
};

export const createColumnHelper = <T extends Record<string, any>>() => {
  const { t } = useTranslation();

  return {
    accessor: (
      accessor: string | ((row: T) => any),
      column?: Omit<DataTableColumn<T>, 'accessor'>,
    ): DataTableColumn<T> => {
      return {
        ...column,
        accessor,
      } as DataTableColumn<T>;
    },
    createColumn: (
      accessor: string | ((row: T) => any),
      column?: Omit<DataTableColumn<T>, 'accessor'>,
    ): DataTableColumn<T> => {
      return {
        ...column,
        accessor,
      } as DataTableColumn<T>;
    },
    convert: (column: DataTableColumn<T>): ColumnDef<T> => {
      return convertToTanStackColumn(column, t);
    },
  };
};
