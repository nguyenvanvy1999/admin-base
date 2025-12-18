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
  type ICurrentUser,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

const canApiKeyView = (user: ICurrentUser) =>
  user.permissions.includes('API_KEY.VIEW');

const canApiKeyUpdate = (user: ICurrentUser) =>
  user.permissions.includes('API_KEY.UPDATE');

const canApiKeyDelete = (user: ICurrentUser) =>
  user.permissions.includes('API_KEY.DELETE');

export const apiKeysController = new Elysia({
  prefix: '/api-keys',
  tags: [DOC_TAG.USER_API_KEY, DOC_TAG.ADMIN_API_KEY],
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      const hasViewPermission = canApiKeyView(currentUser);

      const result = await apiKeyService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission,
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
      const hasViewPermission = canApiKeyView(currentUser);

      const result = await apiKeyService.detail(id, {
        currentUserId: currentUser.id,
        hasViewPermission,
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
    async ({ body, query, currentUser }) => {
      const isAdminLike = canApiKeyUpdate(currentUser);

      const userId = isAdminLike
        ? (query?.userId ?? currentUser.id)
        : currentUser.id;

      const result = await apiKeyService.upsert(
        {
          ...body,
          userId,
        },
        {
          currentUserId: currentUser.id,
          hasCreatePermission: isAdminLike,
          hasUpdatePermission: isAdminLike,
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
  .post(
    '/del',
    async ({ body, currentUser }) => {
      const hasDeletePermission = canApiKeyDelete(currentUser);

      await apiKeyService.revokeMany(body.ids, {
        currentUserId: currentUser.id,
        hasDeletePermission,
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
