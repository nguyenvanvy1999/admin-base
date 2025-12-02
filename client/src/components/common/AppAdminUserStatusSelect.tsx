import {
  ADMIN_USER_STATUSES,
  type AdminUserStatus,
} from 'src/types/admin-users';
import type { AppEnumSelectProps } from './AppEnumSelect';
import { AppEnumSelect } from './AppEnumSelect';

export const ADMIN_USER_STATUS_COLORS: Record<AdminUserStatus, string> = {
  inactive: 'default',
  active: 'green',
  suspendded: 'orange',
  banned: 'red',
};

export type AppAdminUserStatusSelectProps = Omit<
  AppEnumSelectProps<AdminUserStatus>,
  'keys' | 'i18nPrefix' | 'colorMap'
> & {
  i18nPrefix?: string;
};

export function AppAdminUserStatusSelect({
  i18nPrefix = 'adminUsersPage.statuses',
  ...rest
}: AppAdminUserStatusSelectProps) {
  return (
    <AppEnumSelect<AdminUserStatus>
      keys={[...ADMIN_USER_STATUSES]}
      i18nPrefix={i18nPrefix}
      colorMap={ADMIN_USER_STATUS_COLORS}
      {...rest}
    />
  );
}
