import type React from 'react';
import type {
  AccessorFn,
  DataTableColumn,
  Path,
  PathValue,
  TypedAccessor,
} from './types';

type ColumnOptions<T, V> = Omit<DataTableColumn<T, V>, 'accessor' | 'id'> & {
  id?: string;
};

export function createColumnHelper<T extends Record<string, any>>() {
  function accessor<P extends Path<T>>(
    path: P,
    options?: ColumnOptions<T, PathValue<T, P>>,
  ): DataTableColumn<T, PathValue<T, P>>;
  function accessor<V>(
    accessorFn: AccessorFn<T, V>,
    options?: ColumnOptions<T, V>,
  ): DataTableColumn<T, V>;
  function accessor<P extends Path<T> | AccessorFn<T, any>>(
    accessor: P,
    options?: ColumnOptions<T, any>,
  ): DataTableColumn<T, any> {
    return {
      ...options,
      accessor: accessor as TypedAccessor<T, any>,
    } as DataTableColumn<T, any>;
  }

  function column<V>(
    accessor: TypedAccessor<T, V>,
    options?: ColumnOptions<T, V>,
  ): DataTableColumn<T, V> {
    return {
      ...options,
      accessor,
    };
  }

  function display(
    id: string,
    options: Omit<ColumnOptions<T, unknown>, 'accessor'> & {
      render: (row: T, rowIndex: number) => React.ReactNode;
    },
  ): DataTableColumn<T, unknown> {
    return {
      ...options,
      id,
      accessor: undefined,
    };
  }

  return {
    accessor,
    column,
    display,
  };
}

export type ColumnHelper<T extends Record<string, any>> = ReturnType<
  typeof createColumnHelper<T>
>;
