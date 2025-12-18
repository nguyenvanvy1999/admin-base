import { apiClient } from 'src/lib/api/client';
import type {
  UserIpWhitelist,
  UserIpWhitelistFormData,
  UserIpWhitelistListParams,
} from 'src/types/admin-user-ip-whitelist';
import type { ListResponse } from 'src/types/api';

// Unified controller prefix: /user-ip-whitelists (mounted under /api)
const BASE_URL = '/api/user-ip-whitelists';

export const userIpWhitelistService = {
  list(
    params: UserIpWhitelistListParams,
  ): Promise<ListResponse<UserIpWhitelist>> {
    return apiClient.get<ListResponse<UserIpWhitelist>>(BASE_URL, { params });
  },

  upsert(data: UserIpWhitelistFormData): Promise<UserIpWhitelist> {
    return apiClient.post<UserIpWhitelist>(BASE_URL, data);
  },

  delete(ids: string[]): Promise<{ count: number }> {
    return apiClient.post<{ count: number }>(`${BASE_URL}/del`, { ids });
  },
};
