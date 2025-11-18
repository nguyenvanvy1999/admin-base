import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export type ActionConfig<T> = {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  className?: string;
};

export type ActionColumnOptions<T> = {
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  custom?: ActionConfig<T>[] | ((row: T) => React.ReactNode);
  title?: string;
};

export function createActionColumn<T extends Record<string, any>>(
  options: ActionColumnOptions<T>,
): ColumnDef<T> {
  const { t } = useTranslation();
  const { onEdit, onDelete, custom, title } = options;

  return {
    id: 'actions',
    header: t(title as any) || 'Actions',
    enableSorting: false,
    cell: (info: any) => {
      const row = info.row.original;

      const actionButtons: React.ReactNode[] = [];

      if (onEdit) {
        actionButtons.push(
          React.createElement(
            'button',
            {
              key: 'edit',
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onEdit(row);
              },
              className:
                'p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors',
              'aria-label': 'Edit',
            },
            React.createElement(
              'svg',
              {
                className: 'w-5 h-5',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
              },
              React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
              }),
            ),
          ),
        );
      }

      if (onDelete) {
        actionButtons.push(
          React.createElement(
            'button',
            {
              key: 'delete',
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onDelete(row);
              },
              className:
                'p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors',
              'aria-label': 'Delete',
            },
            React.createElement(
              'svg',
              {
                className: 'w-5 h-5',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
              },
              React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
              }),
            ),
          ),
        );
      }

      if (custom) {
        if (typeof custom === 'function') {
          const customActions = custom(row);
          if (customActions) {
            actionButtons.push(customActions);
          }
        } else {
          custom.forEach((action, index) => {
            actionButtons.push(
              React.createElement(
                'button',
                {
                  key: `custom-${index}`,
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    action.onClick(row);
                  },
                  className:
                    action.className ||
                    'p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-md transition-colors',
                  'aria-label': action.label,
                },
                action.icon || action.label,
              ),
            );
          });
        }
      }

      if (actionButtons.length === 0) return null;

      return React.createElement(
        'div',
        { className: 'flex items-center gap-1' },
        ...actionButtons,
      );
    },
  } as ColumnDef<T>;
}
