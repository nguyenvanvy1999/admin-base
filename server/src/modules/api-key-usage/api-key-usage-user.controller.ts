import { Elysia } from 'elysia';
import {
  ApiKeyUsageListQueryDto,
  ApiKeyUsagePaginatedResponseDto,
  ApiKeyUsageStatsQueryDto,
  ApiKeyUsageStatsResponseDto,
} from 'src/dtos/api-key-usage.dto';
import { apiKeyUsageService } from 'src/services/api-keys';
import { authCheck } from 'src/services/auth';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const apiKeyUsageUserController = new Elysia({
  prefix: '/api-key-usage',
  tags: [DOC_TAG.USER_API_KEY_USAGE],
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      const result = await apiKeyUsageService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission: false,
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
        hasViewPermission: false,
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
