import { useMemo } from 'react';
import { useAuth } from 'src/hooks/auth/useAuth';

export type PermissionMatchMode = 'all' | 'any';

export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];

  const hasPermission = useMemo(() => {
    return (required: string | string[], mode: PermissionMatchMode = 'all') => {
      const requiredList = Array.isArray(required) ? required : [required];
      if (requiredList.length === 0) {
        return true;
      }
      if (mode === 'any') {
        return requiredList.some((code) => permissions.includes(code));
      }
      return requiredList.every((code) => permissions.includes(code));
    };
  }, [permissions]);

  return {
    permissions,
    hasPermission,
  };
}
