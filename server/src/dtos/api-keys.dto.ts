import { t } from 'elysia';
import { DtoFields, PaginationReqDto } from 'src/share';

export const CreateApiKeyDto = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  expiresAt: t.Optional(t.Date()),
  permissions: t.Optional(t.Array(t.String())),
  ipWhitelist: t.Optional(t.Array(t.String())),
  metadata: t.Optional(t.Any()),
});

export const UpdateApiKeyDto = t.Object({
  id: t.String({ minLength: 1 }),
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  expiresAt: t.Optional(t.Date()),
  permissions: t.Optional(t.Array(t.String())),
  ipWhitelist: t.Optional(t.Array(t.String())),
  metadata: t.Optional(t.Any()),
});

export const ApiKeyListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    userId: t.Optional(t.String()),
    userIds: t.Optional(t.Array(t.String())),
    status: t.Optional(t.String()),
    search: DtoFields.search,
  }),
]);

export const ApiKeyResponseDto = t.Object({
  id: t.String(),
  userId: t.String(),
  name: t.String(),
  keyPrefix: t.String(),
  status: t.String(),
  permissions: t.Nullable(t.Any()),
  ipWhitelist: t.Array(t.String()),
  lastUsedAt: t.Nullable(t.Date()),
  expiresAt: t.Nullable(t.Date()),
  created: t.Date(),
  modified: t.Date(),
});

export const ApiKeyDetailResponseDto = t.Intersect([
  ApiKeyResponseDto,
  t.Object({
    user: t.Optional(
      t.Object({
        id: t.String(),
        email: t.String(),
        name: t.Nullable(t.String()),
      }),
    ),
    metadata: t.Nullable(t.Any()),
    usage: t.Optional(
      t.Object({
        totalRequests: t.Number(),
        lastUsedAt: t.Nullable(t.Date()),
      }),
    ),
  }),
]);

export const ApiKeyPaginatedResponseDto = t.Object({
  docs: t.Array(ApiKeyResponseDto),
  count: t.Number(),
});

export const ApiKeyCreatedResponseDto = t.Object({
  id: t.String(),
  key: t.String(), // Full key only returned on creation
  keyPrefix: t.String(),
  name: t.String(),
  expiresAt: t.Nullable(t.Date()),
  created: t.Date(),
});

export type CreateApiKeyParams = typeof CreateApiKeyDto.static;
export type UpdateApiKeyParams = typeof UpdateApiKeyDto.static;
export type ApiKeyListQueryParams = typeof ApiKeyListQueryDto.static & {
  currentUserId: string;
  hasViewPermission: boolean;
};
