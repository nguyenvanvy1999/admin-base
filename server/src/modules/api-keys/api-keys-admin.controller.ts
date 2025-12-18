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
import { authCheck, authorize, has } from 'src/services/auth';
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
        hasViewPermission: true,
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
        hasViewPermission: true,
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
  .use(authorize(has('API_KEY.UPDATE')))
  .post(
    '/',
    async ({ body, query, currentUser }) => {
      const userId = query?.userId;
      const result = await apiKeyService.upsert(
        {
          ...body,
          userId,
        },
        {
          currentUserId: currentUser.id,
          hasCreatePermission: true,
          hasUpdatePermission: true,
        },
      );
      return castToRes(result);
    },
    {
      query: t.Optional(
        t.Object({
          userId: t.Optional(t.String({ minLength: 1 })),
        }),
      ),
      body: UpsertApiKeyDto,
      response: {
        200: ResWrapper(t.Union([ApiKeyCreatedResponseDto, ApiKeyResponseDto])),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(has('API_KEY.DELETE')))
  .post(
    '/del',
    async ({ body, currentUser }) => {
      await apiKeyService.revokeMany(body.ids, {
        currentUserId: currentUser.id,
        hasDeletePermission: true,
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
