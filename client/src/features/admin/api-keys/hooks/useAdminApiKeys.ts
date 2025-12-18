import { useQuery } from '@tanstack/react-query';
import {
  type MutationCallbacks,
  useAppMutation,
} from 'src/hooks/api/useMutation';
import {
  adminApiKeyKeys,
  adminApiKeyService,
} from 'src/services/api/admin/api-keys.service';
import type {
  AdminApiKeyActionResponse,
  AdminApiKeyCreatePayload,
  AdminApiKeyCreateResponse,
  AdminApiKeyDetail,
  AdminApiKeyListQuery,
  AdminApiKeyUpdatePayload,
  AdminApiKeyUsageListQuery,
  AdminApiKeyUsageListResponse,
  AdminApiKeyUsageStatsResponse,
} from 'src/types/admin-api-keys';

export function useAdminApiKeyList(
  query?: AdminApiKeyListQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: adminApiKeyKeys.list(query),
    queryFn: () => adminApiKeyService.list(query),
    enabled,
  });
}

export function useAdminApiKeyDetail(apiKeyId?: string, enabled = true) {
  return useQuery<AdminApiKeyDetail>({
    queryKey: apiKeyId
      ? adminApiKeyKeys.detail(apiKeyId)
      : adminApiKeyKeys.detail('unknown'),
    queryFn: () => {
      if (!apiKeyId) {
        return Promise.reject(new Error('Missing API key id'));
      }
      return adminApiKeyService.detail(apiKeyId);
    },
    enabled: Boolean(apiKeyId) && enabled,
  });
}

export function useCreateAdminApiKey(
  options?: MutationCallbacks<
    AdminApiKeyCreateResponse,
    Error,
    AdminApiKeyCreatePayload
  >,
) {
  return useAppMutation({
    mutationFn: (payload: AdminApiKeyCreatePayload) =>
      adminApiKeyService.createWithKey(payload),
    invalidateKeys: [adminApiKeyKeys.lists()],
    successMessageKey: 'apiKeysPage.messages.createSuccess',
    successMessageDefault: 'API key created successfully',
    errorMessageKey: 'apiKeysPage.messages.createError',
    errorMessageDefault: 'Failed to create API key',
    ...options,
  });
}

export function useUpdateAdminApiKey(
  options?: MutationCallbacks<
    AdminApiKeyActionResponse,
    Error,
    { apiKeyId: string; payload: AdminApiKeyUpdatePayload }
  >,
) {
  return useAppMutation({
    mutationFn: ({
      apiKeyId,
      payload,
    }: {
      apiKeyId: string;
      payload: AdminApiKeyUpdatePayload;
    }) => adminApiKeyService.update(apiKeyId, payload),
    invalidateKeys: (vars) => [
      adminApiKeyKeys.detail(vars.apiKeyId),
      adminApiKeyKeys.lists(),
    ],
    successMessageKey: 'apiKeysPage.messages.updateSuccess',
    successMessageDefault: 'API key updated successfully',
    errorMessageKey: 'apiKeysPage.messages.updateError',
    errorMessageDefault: 'Failed to update API key',
    ...options,
  });
}

export function useDeleteAdminApiKeys(
  options?: MutationCallbacks<AdminApiKeyActionResponse, Error, string[]>,
) {
  return useAppMutation({
    mutationFn: (ids: string[]) => adminApiKeyService.delete(ids),
    invalidateKeys: [adminApiKeyKeys.lists()],
    successMessageKey: 'apiKeysPage.messages.deleteSuccess',
    successMessageDefault: 'API keys deleted successfully',
    errorMessageKey: 'apiKeysPage.messages.deleteError',
    errorMessageDefault: 'Failed to delete API keys',
    ...options,
  });
}

export function useRevokeAdminApiKey(
  options?: MutationCallbacks<AdminApiKeyActionResponse, Error, string>,
) {
  return useAppMutation({
    mutationFn: (apiKeyId: string) => adminApiKeyService.revoke(apiKeyId),
    invalidateKeys: (apiKeyId) => [
      adminApiKeyKeys.detail(apiKeyId),
      adminApiKeyKeys.lists(),
    ],
    successMessageKey: 'apiKeysPage.messages.revokeSuccess',
    successMessageDefault: 'API key revoked successfully',
    errorMessageKey: 'apiKeysPage.messages.revokeError',
    errorMessageDefault: 'Failed to revoke API key',
    ...options,
  });
}

export function useRegenerateAdminApiKey(
  options?: MutationCallbacks<AdminApiKeyCreateResponse, Error, string>,
) {
  return useAppMutation({
    mutationFn: (apiKeyId: string) => adminApiKeyService.regenerate(apiKeyId),
    invalidateKeys: (apiKeyId) => [
      adminApiKeyKeys.detail(apiKeyId),
      adminApiKeyKeys.lists(),
    ],
    successMessageKey: 'apiKeysPage.messages.regenerateSuccess',
    successMessageDefault: 'API key regenerated successfully',
    errorMessageKey: 'apiKeysPage.messages.regenerateError',
    errorMessageDefault: 'Failed to regenerate API key',
    ...options,
  });
}

export function useAdminApiKeyUsageList(
  query?: AdminApiKeyUsageListQuery,
  enabled = true,
) {
  return useQuery<AdminApiKeyUsageListResponse>({
    queryKey: adminApiKeyKeys.usage.list(query),
    queryFn: () => adminApiKeyService.listUsage(query || {}),
    enabled,
  });
}

export function useAdminApiKeyUsageStats(apiKeyId?: string, enabled = true) {
  return useQuery<AdminApiKeyUsageStatsResponse>({
    queryKey: apiKeyId
      ? adminApiKeyKeys.usage.stats(apiKeyId)
      : adminApiKeyKeys.usage.stats('unknown'),
    queryFn: () => {
      if (!apiKeyId) {
        return Promise.reject(new Error('Missing API key id'));
      }
      return adminApiKeyService.getUsageStats(apiKeyId);
    },
    enabled: Boolean(apiKeyId) && enabled,
  });
}
