import { useMemo } from 'react';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import type { ResourceContext } from 'src/types/resource';

export function useResourcePermissions(
  resource: ResourceContext<any, any, any>,
) {
  const { hasPermission } = usePermissions();

  const permissions = useMemo(() => {
    const viewPerms = Array.isArray(resource.permissions.view)
      ? resource.permissions.view
      : [resource.permissions.view];
    const canView = hasPermission(viewPerms, 'any');

    const canViewAll = resource.permissions.viewAll
      ? hasPermission(resource.permissions.viewAll)
      : false;

    const canCreate = resource.permissions.create
      ? hasPermission(
          Array.isArray(resource.permissions.create)
            ? resource.permissions.create
            : [resource.permissions.create],
          'any',
        )
      : false;

    const canUpdate = resource.permissions.update
      ? hasPermission(
          Array.isArray(resource.permissions.update)
            ? resource.permissions.update
            : [resource.permissions.update],
          'any',
        )
      : false;

    const canDelete = resource.permissions.delete
      ? hasPermission(
          Array.isArray(resource.permissions.delete)
            ? resource.permissions.delete
            : [resource.permissions.delete],
          'any',
        )
      : false;

    const canAction = (action: string) => {
      const actionPerms = resource.permissions.action?.[action];
      if (!actionPerms) return false;
      return hasPermission(
        Array.isArray(actionPerms) ? actionPerms : [actionPerms],
        'any',
      );
    };

    return {
      canView,
      canViewAll,
      canCreate,
      canUpdate,
      canDelete,
      canAction,
    };
  }, [resource, hasPermission]);

  return permissions;
}
