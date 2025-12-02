import type { SelectProps } from 'antd';
import { Select, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  ADMIN_USER_STATUSES,
  type AdminUserStatus,
} from 'src/types/admin-users';

export const ADMIN_USER_STATUS_COLORS: Record<AdminUserStatus, string> = {
  inactive: 'default',
  active: 'green',
  suspendded: 'orange',
  banned: 'red',
};

export function buildAdminUserStatusOptions(
  t: Function,
  i18nPrefix = 'adminUsersPage.statuses',
) {
  return ADMIN_USER_STATUSES.map((status) => {
    const labelKey = `${i18nPrefix}.${status}`;
    const label = t(labelKey);
    return {
      value: status,
      label,
    };
  });
}

export type AppAdminUserStatusSelectProps = Omit<
  SelectProps<AdminUserStatus>,
  'options'
> & {
  i18nPrefix?: string;
};

export function AppAdminUserStatusSelect({
  i18nPrefix = 'adminUsersPage.statuses',
  showSearch = true,
  allowClear = true,
  ...rest
}: AppAdminUserStatusSelectProps) {
  const { t } = useTranslation();
  const options = buildAdminUserStatusOptions(t, i18nPrefix);

  return (
    <Select<AdminUserStatus>
      {...rest}
      allowClear={allowClear}
      showSearch={
        showSearch && {
          filterOption: (input, option) => {
            const label = String(option?.label ?? '');
            return label.toLowerCase().includes(input.toLowerCase());
          },
        }
      }
      options={options}
      optionRender={(option) => {
        const status = option.value as AdminUserStatus;
        const label = option.label as string;
        const color = ADMIN_USER_STATUS_COLORS[status] ?? 'default';

        return <Tag color={color}>{label}</Tag>;
      }}
    />
  );
}
