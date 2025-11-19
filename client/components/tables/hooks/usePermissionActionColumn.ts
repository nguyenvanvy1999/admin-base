import { usePermission } from '@client/hooks/usePermission';
import { useMemo } from 'react';
import { createActionColumn } from '../columnFactories';
import type { ActionColumnOptions } from '../columnRenderers';
import type { DataTableColumn } from '../types';

export type PermissionActionColumnOptions<T extends { id: string }> =
  ActionColumnOptions<T> & {
    editPermission?: string;
    deletePermission?: string;
    viewPermission?: string;
    customPermissions?: Array<{
      permission: string;
      action: (row: T) => void;
      config?: {
        label?: string;
        icon?: React.ReactNode;
        color?: string;
        variant?: 'subtle' | 'light' | 'filled' | 'outline';
      };
    }>;
  };

export function usePermissionActionColumn<T extends { id: string }>(
  options: PermissionActionColumnOptions<T>,
) {
  const { hasPermission } = usePermission();

  return useMemo(() => {
    const result: ActionColumnOptions<T> = {
      title: options.title,
      width: options.width,
      textAlign: options.textAlign,
    };

    // Check edit permission
    if (options.onEdit) {
      if (options.editPermission) {
        if (hasPermission(options.editPermission)) {
          result.onEdit = options.onEdit;
        }
      } else {
        result.onEdit = options.onEdit;
      }
    }

    // Check delete permission
    if (options.onDelete) {
      if (options.deletePermission) {
        if (hasPermission(options.deletePermission)) {
          result.onDelete = options.onDelete;
        }
      } else {
        result.onDelete = options.onDelete;
      }
    }

    // Check view permission
    if (options.onView) {
      if (options.viewPermission) {
        if (hasPermission(options.viewPermission)) {
          result.onView = options.onView;
        }
      } else {
        result.onView = options.onView;
      }
    }

    // Check custom permissions
    if (options.customPermissions) {
      const allowedCustomActions = options.customPermissions
        .filter((custom) => hasPermission(custom.permission))
        .map((custom) => ({
          label: custom.config?.label,
          icon: custom.config?.icon,
          onClick: custom.action,
          color: custom.config?.color,
          variant: custom.config?.variant,
        }));

      if (allowedCustomActions.length > 0) {
        result.custom = allowedCustomActions;
      }
    } else if (options.custom) {
      result.custom = options.custom;
    }

    return result;
  }, [
    hasPermission,
    options.onEdit,
    options.onDelete,
    options.onView,
    options.editPermission,
    options.deletePermission,
    options.viewPermission,
    options.custom,
    options.customPermissions,
    options.title,
    options.width,
    options.textAlign,
  ]);
}

export function useCreatePermissionActionColumn<T extends { id: string }>(
  options: PermissionActionColumnOptions<T>,
): DataTableColumn<T> {
  const normalizedOptions = usePermissionActionColumn(options);
  return createActionColumn(normalizedOptions);
}
