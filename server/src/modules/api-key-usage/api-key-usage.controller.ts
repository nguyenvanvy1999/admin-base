import { Elysia } from 'elysia';
import {
  ApiKeyUsageFilterDto,
  ApiKeyUsageListQueryDto,
  ApiKeyUsagePaginatedResponseDto,
  ApiKeyUsageStatsResponseDto,
} from 'src/dtos/api-key-usage.dto';
import { apiKeyUsageService } from 'src/services/api-keys';
import { authCheck } from 'src/services/auth';
import {
  ACCESS_AUTH,
  authErrors,
  castToRes,
  DOC_TAG,
  type ICurrentUser,
  ResWrapper,
} from 'src/share';

const canApiKeyView = (user: ICurrentUser) =>
  user.permissions.includes('API_KEY.VIEW');

export const apiKeyUsageController = new Elysia({
  prefix: '/api-key-usage',
  tags: [DOC_TAG.API_KEY_USAGE],
  detail: { security: ACCESS_AUTH },
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      const hasViewPermission = canApiKeyView(currentUser);

      const result = await apiKeyUsageService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission,
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
      const hasViewPermission = canApiKeyView(currentUser);

      const result = await apiKeyUsageService.getStatsWithFilter({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission,
      });

      return castToRes(result);
    },
    {
      query: ApiKeyUsageFilterDto,
      response: {
        200: ResWrapper(ApiKeyUsageStatsResponseDto),
        ...authErrors,
      },
    },
  );
