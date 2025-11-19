import { booleanStatusMap } from '@client/utils/booleanStatusMap';
import { formatDate, formatDecimal, formatInt } from '@client/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MetaVisualizer } from '../../MetaVisualizer';
import type { AccessorFn, DataTableColumn } from '../types';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function getNestedValue<T>(obj: T, path: string): unknown {
  const keys = path.split('.');
  let value: any = obj;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined || value === null) {
      return undefined;
    }
  }
  return value;
}

export function useDataTableColumns<T extends { id: string }>({
  columns,
  autoFormatDisabled,
  themeSpacingXs,
}: {
  columns: DataTableColumn<T>[];
  autoFormatDisabled?: boolean;
  themeSpacingXs: string;
}) {
  const { t } = useTranslation();

  const autoFormat = useCallback(
    (value: unknown): React.ReactNode => {
      if (value instanceof Date) {
        return formatDate(value);
      }

      if (value === null || value === undefined || value === '') {
        return <span className="text-gray-400">-</span>;
      }

      const valueType = typeof value;

      if (valueType === 'boolean') {
        return (
          <MetaVisualizer
            k={String(value) as 'true' | 'false'}
            map={booleanStatusMap}
          />
        );
      }

      if (valueType === 'object') {
        if (Array.isArray(value)) {
          if (value.every((item) => typeof item === 'string')) {
            return (value as string[]).join(', ');
          }
        }
        return JSON.stringify(value);
      }

      if (valueType === 'string') {
        const stringValue = value as string;
        if (ISO_DATE_REGEX.test(stringValue)) {
          return formatDate(stringValue);
        }
        if (
          stringValue !== '' &&
          Number.isFinite(+stringValue) &&
          !autoFormatDisabled
        ) {
          return stringValue.includes('.')
            ? formatDecimal(+stringValue)
            : formatInt(+stringValue);
        }
        return stringValue;
      }

      if (valueType === 'number' && !autoFormatDisabled) {
        const numValue = value as number;
        return Number.isInteger(numValue)
          ? formatInt(numValue)
          : formatDecimal(numValue);
      }

      return String(value);
    },
    [autoFormatDisabled],
  );

  const toPx = useCallback((rem?: string) => {
    if (!rem) return undefined;
    const num = parseFloat(rem.replace('rem', ''));
    return Number.isFinite(num) ? Math.round(num * 16) : undefined;
  }, []);

  return useMemo<ColumnDef<T>[]>(() => {
    return columns.map((col, idx) => {
      const hasAccessorFn = typeof col.accessor === 'function';
      const accessorKey =
        col.accessor && typeof col.accessor === 'string'
          ? (col.accessor as string)
          : undefined;
      const id =
        col.id ||
        accessorKey ||
        (col.title ? String(col.title) : undefined) ||
        `col_${idx}`;

      const getValue = (row: T): unknown => {
        if (typeof col.accessor === 'function') {
          return (col.accessor as AccessorFn<T, unknown>)(row);
        }
        if (typeof col.accessor === 'string') {
          return getNestedValue(row, col.accessor);
        }
        return undefined;
      };

      const cellRenderer = ({
        row,
        cell,
      }: {
        row: { original: T; index: number };
        cell: { getValue: () => unknown };
      }) => {
        const record = row.original;
        const hasAccessor = col.accessor !== undefined;
        let content: React.ReactNode;

        // Priority: render function always takes precedence over autoFormat
        if (col.render) {
          if (hasAccessor) {
            const value = cell.getValue();
            content = (
              col.render as (props: {
                value: unknown;
                row: T;
                rowIndex: number;
              }) => React.ReactNode
            )({ value, row: record, rowIndex: row.index });
          } else {
            content = (
              col.render as (props: {
                row: T;
                rowIndex: number;
              }) => React.ReactNode
            )({ row: record, rowIndex: row.index });
          }
        } else if (!autoFormatDisabled) {
          const value = cell.getValue();
          content = autoFormat(value);
        } else {
          const value = cell.getValue();
          content = value as React.ReactNode;
        }
        const style: React.CSSProperties = {
          textAlign: col.textAlign || 'center',
          ...(col.ellipsis
            ? {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                display: 'inline-block',
              }
            : undefined),
          ...(col.cellsStyle ? col.cellsStyle(record) : undefined),
        };
        return (
          <span
            role={col.onClick ? 'button' : undefined}
            style={{
              cursor: col.onClick ? 'pointer' : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                col.textAlign === 'right'
                  ? 'flex-end'
                  : col.textAlign === 'left'
                    ? 'flex-start'
                    : 'center',
              width: '100%',
              ...style,
            }}
            onClick={col.onClick ? () => col.onClick?.(record) : undefined}
          >
            {content}
          </span>
        );
      };

      const columnDef = {
        id,
        header: col.title ? t(col.title) : '',
        cell: cellRenderer,
        size: toPx(col.width),
        minSize: toPx(col.minWidth),
        enableColumnFilter: accessorKey !== undefined || hasAccessorFn,
        filterVariant:
          col.filterVariant || (col.filterOptions ? 'select' : 'text'),
        filterSelectOptions: col.filterOptions,
        enableSorting: col.enableSorting ?? false,
        enableGrouping: col.enableGrouping ?? true,
        aggregationFn: col.aggregationFn as any,
        GroupedCell: col.GroupedCell as any,
        AggregatedCell: col.AggregatedCell as any,
        mantineTableHeadCellProps: {
          align: 'center',
          style: {
            padding: themeSpacingXs,
            textAlign: 'center',
          },
        },
        mantineTableBodyCellProps: {
          style: {
            padding: themeSpacingXs,
            textAlign: col.textAlign || 'center',
          },
        },
        ...(accessorKey ? { accessorKey } : {}),
        ...(hasAccessorFn
          ? {
              accessorFn: (row: T) => getValue(row),
            }
          : {}),
      } as ColumnDef<T, any>;

      return columnDef;
    });
  }, [columns, t, autoFormatDisabled, autoFormat, toPx, themeSpacingXs]);
}
