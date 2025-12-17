import { Elysia } from 'elysia';
import {
  ApiKeyUsageListQueryDto,
  ApiKeyUsagePaginatedResponseDto,
  ApiKeyUsageStatsQueryDto,
  ApiKeyUsageStatsResponseDto,
} from 'src/dtos/api-key-usage.dto';
import { apiKeyUsageService } from 'src/services/api-keys';
import { authCheck, authorize, has } from 'src/services/auth';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const apiKeyUsageAdminController = new Elysia({
  prefix: '/admin/api-key-usage',
  tags: [DOC_TAG.ADMIN_API_KEY_USAGE],
})
  .use(authCheck)
  .use(authorize(has('API_KEY.VIEW')))
  .get(
    '/',
    async ({ query, currentUser }) => {
      const result = await apiKeyUsageService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission: true,
      });
      return castToRes(result);
    },
    {
      query: ApiKeyUsageListQueryDto,
      response: {
        200: ResWrapper(ApiKeyUsagePaginatedResponseDto),
        ...authErrors,
      },
    },
  )
  .get(
    '/stats',
    async ({ query, currentUser }) => {
      const result = await apiKeyUsageService.getStatsWithFilter({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission: true,
      });
      return castToRes(result);
    },
    {
      query: ApiKeyUsageStatsQueryDto,
      response: {
        200: ResWrapper(ApiKeyUsageStatsResponseDto),
        ...authErrors,
      },
    },
  );
