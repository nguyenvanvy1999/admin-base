import { Elysia, t } from 'elysia';
import {
  ApiKeyCreatedResponseDto,
  ApiKeyDetailResponseDto,
  ApiKeyListQueryDto,
  ApiKeyPaginatedResponseDto,
  ApiKeyResponseDto,
  CreateApiKeyDto,
  UpdateApiKeyDto,
} from 'src/dtos/api-keys.dto';
import { apiKeyService } from 'src/services/api-keys';
import { anyOf, authCheck, authorize, has } from 'src/services/auth';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const apiKeysAdminController = new Elysia({
  prefix: '/admin/api-keys',
  tags: [DOC_TAG.ADMIN_API_KEY],
})
  .use(authCheck)
  .use(authorize(has('API_KEY.VIEW')))
  .get(
    '/',
    async ({ query, currentUser }) => {
      const result = await apiKeyService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission: currentUser.permissions.includes('API_KEY.VIEW'),
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
        hasViewPermission: currentUser.permissions.includes('API_KEY.VIEW'),
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
  .use(authorize(has('API_KEY.CREATE')))
  .post(
    '/',
    async ({ body, query: { userId }, currentUser }) => {
      const result = await apiKeyService.create(userId, body, {
        currentUserId: currentUser.id,
        hasCreatePermission: currentUser.permissions.includes('API_KEY.CREATE'),
      });
      return castToRes(result);
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 1 }),
      }),
      body: CreateApiKeyDto,
      response: {
        200: ResWrapper(ApiKeyCreatedResponseDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(anyOf(has('API_KEY.UPDATE'))))
  .put(
    '/:id',
    async ({ body, currentUser }) => {
      const result = await apiKeyService.update(body, {
        currentUserId: currentUser.id,
        hasUpdatePermission: currentUser.permissions.includes('API_KEY.UPDATE'),
      });
      return castToRes(result);
    },
    {
      body: UpdateApiKeyDto,
      response: {
        200: ResWrapper(ApiKeyResponseDto),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(has('API_KEY.DELETE')))
  .post(
    '/:id/revoke',
    async ({ params: { id }, currentUser }) => {
      await apiKeyService.revoke(
        { id },
        {
          currentUserId: currentUser.id,
          hasDeletePermission:
            currentUser.permissions.includes('API_KEY.DELETE'),
        },
      );
      return castToRes(null);
    },
    {
      params: IdDto,
      response: {
        200: ResWrapper(t.Null()),
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
        hasDeletePermission: currentUser.permissions.includes('API_KEY.DELETE'),
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
