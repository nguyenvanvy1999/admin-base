import { useQuery } from '@tanstack/react-query';
import { adminRateLimitService } from 'src/services/api/admin-rate-limit.service';
import type {
  AdminRateLimitListParams,
  AdminRateLimitListResponse,
  BlockRateLimitParams,
  UnblockRateLimitParams,
} from 'src/types/admin-rate-limit';
import { type MutationCallbacks, useAppMutation } from './useAppMutation';

export const adminRateLimitKeys = {
  all: ['admin-rate-limits'] as const,
  lists: () => [...adminRateLimitKeys.all, 'list'] as const,
  list: (params?: AdminRateLimitListParams) =>
    [...adminRateLimitKeys.lists(), params] as const,
};

export function useAdminRateLimits(params?: AdminRateLimitListParams) {
  return useQuery<AdminRateLimitListResponse>({
    queryKey: adminRateLimitKeys.list(params),
    queryFn: () => adminRateLimitService.list(params ?? { take: 20, skip: 0 }),
  });
}

export function useBlockRateLimit(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (data: BlockRateLimitParams) =>
      adminRateLimitService.block(data),
    invalidateKeys: [adminRateLimitKeys.lists()],
    successMessageKey: 'adminRateLimitsPage.messages.blockSuccess',
    successMessageDefault: 'Rate limit blocked successfully',
    errorMessageKey: 'adminRateLimitsPage.messages.blockError',
    errorMessageDefault: 'Failed to block rate limit',
    ...options,
  });
}

export function useUnblockRateLimit(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (data: UnblockRateLimitParams) =>
      adminRateLimitService.unblock(data),
    invalidateKeys: [adminRateLimitKeys.lists()],
    successMessageKey: 'adminRateLimitsPage.messages.unblockSuccess',
    successMessageDefault: 'Rate limit unblocked successfully',
    errorMessageKey: 'adminRateLimitsPage.messages.unblockError',
    errorMessageDefault: 'Failed to unblock rate limit',
    ...options,
  });
}

export function useCleanupRateLimits(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: () => adminRateLimitService.cleanup(),
    invalidateKeys: [adminRateLimitKeys.lists()],
    successMessageKey: 'adminRateLimitsPage.messages.cleanupSuccess',
    successMessageDefault: 'Expired rate limits cleaned up successfully',
    errorMessageKey: 'adminRateLimitsPage.messages.cleanupError',
    errorMessageDefault: 'Failed to cleanup rate limits',
    ...options,
  });
}
