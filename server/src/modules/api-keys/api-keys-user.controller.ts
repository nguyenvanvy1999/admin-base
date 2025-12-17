import { Elysia, t } from 'elysia';
import {
  ApiKeyCreatedResponseDto,
  ApiKeyDetailResponseDto,
  ApiKeyListQueryDto,
  ApiKeyPaginatedResponseDto,
  ApiKeyResponseDto,
  UpsertApiKeyDto,
} from 'src/dtos/api-keys.dto';
import { apiKeyService } from 'src/services/api-keys';
import { authCheck } from 'src/services/auth';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const apiKeysUserController = new Elysia({
  prefix: '/api-keys',
  tags: [DOC_TAG.USER_API_KEY],
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      const result = await apiKeyService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission: false,
      });
      return castToRes(result);
    },
    {
      query: ApiKeyListQueryDto,
      response: {
        200: ResWrapper(ApiKeyPaginatedResponseDto),
        ...authErrors,
      },
    },
  )
  .get(
    '/:id',
    async ({ params: { id }, currentUser }) => {
      const result = await apiKeyService.detail(id, {
        currentUserId: currentUser.id,
        hasViewPermission: false,
      });
      return castToRes(result);
    },
    {
      params: IdDto,
      response: {
        200: ResWrapper(ApiKeyDetailResponseDto),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .post(
    '/',
    async ({ body, currentUser }) => {
      const result = await apiKeyService.upsert(body, {
        currentUserId: currentUser.id,
        hasCreatePermission: false,
        hasUpdatePermission: false,
      });
      return castToRes(result);
    },
    {
      body: UpsertApiKeyDto,
      response: {
        200: ResWrapper(t.Union([ApiKeyCreatedResponseDto, ApiKeyResponseDto])),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .post(
    '/del',
    async ({ body, currentUser }) => {
      await apiKeyService.revokeMany(body.ids, {
        currentUserId: currentUser.id,
        hasDeletePermission: false, // User can only delete their own keys
      });
      return castToRes(null);
    },
    {
      body: IdsDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  );
