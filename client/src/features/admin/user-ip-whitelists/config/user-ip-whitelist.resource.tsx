import type { ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { createDateColumn } from 'src/components/common/tableColumns';
import { userIpWhitelistService } from 'src/services/api/admin/user-ip-whitelists.service';
import type {
  UserIpWhitelist,
  UserIpWhitelistListParams,
} from 'src/types/admin-user-ip-whitelist';
import type { ListResponse } from 'src/types/api';
import type { ResourceContext } from 'src/types/resource';

export type UserIpWhitelistListParamsForResource = UserIpWhitelistListParams & {
  take: number;
  cursor?: string;
};

function createUserIpWhitelistColumns(
  t: (key: string, options?: Record<string, any>) => string,
): ProColumns<UserIpWhitelist>[] {
  return [
    {
      title: t('common.fields.userId'),
      dataIndex: 'userId',
      copyable: true,
      ellipsis: true,
      width: 250,
    },
    {
      title: t('common.fields.ip'),
      dataIndex: 'ip',
      copyable: true,
      width: 200,
    },
    {
      title: t('common.fields.note'),
      dataIndex: 'note',
      ellipsis: true,
      width: 200,
      render: (_: unknown, record) =>
        record.note ? <Tag color="blue">{record.note}</Tag> : '-',
    },
    createDateColumn<UserIpWhitelist>({
      dataIndex: 'created',
      title: t('common.fields.createdAt'),
      valueType: 'dateTime',
    }),
  ];
}

export const userIpWhitelistResource = (
  t: (key: string, options?: Record<string, any>) => string,
): ResourceContext<
  UserIpWhitelist,
  UserIpWhitelistListParamsForResource,
  { ids: string[] }
> => ({
  name: 'user-ip-whitelist',
  displayName: 'User IP Whitelist',
  permissions: {
    view: ['IPWHITELIST.VIEW'],
    viewAll: 'IPWHITELIST.VIEW',
    create: ['IPWHITELIST.CREATE', 'IPWHITELIST.UPDATE'],
    update: ['IPWHITELIST.UPDATE'],
    delete: ['IPWHITELIST.DELETE'],
  },
  endpoints: {
    list: '/api/user-ip-whitelists',
    create: '/api/user-ip-whitelists',
    update: '/api/user-ip-whitelists',
    delete: '/api/user-ip-whitelists/del',
  },
  dataConfig: {
    idField: 'id',
    ownerField: 'userId',
  },
  uiConfig: {
    columns: createUserIpWhitelistColumns(t),
  },
  scope: 'both',
  listService: async (
    params: UserIpWhitelistListParamsForResource,
  ): Promise<{
    docs: UserIpWhitelist[];
    hasNext: boolean;
    nextCursor?: string;
  }> => {
    const { cursor, take, ...rest } = params;
    const skip = cursor ? Number(cursor) || 0 : 0;

    const response: ListResponse<UserIpWhitelist> =
      await userIpWhitelistService.list({
        ...rest,
        skip,
        take,
      });

    const nextSkip = skip + take;
    const hasNext = nextSkip < response.count;

    return {
      docs: response.docs,
      hasNext,
      nextCursor: hasNext ? String(nextSkip) : undefined,
    };
  },
  actionService: async (action, params) => {
    if (action === 'delete') {
      const ids = (params as { ids: string[] }).ids;
      await userIpWhitelistService.delete(ids);
    }
  },
});
