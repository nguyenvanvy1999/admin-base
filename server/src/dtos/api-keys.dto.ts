import { t } from 'elysia';
import { ApiKeyStatus } from 'src/generated';
import {
  DtoFields,
  PaginatedDto,
  PaginationReqDto,
  UpsertBaseDto,
  UserFilterDto,
  UserInfoDto,
  type WithPermissionContext,
} from 'src/share';

export const UpsertApiKeyDto = t.Intersect([
  UpsertBaseDto,
  t.Object({
    userId: t.Optional(t.String({ minLength: 1 })),
    name: t.String({ minLength: 1, maxLength: 255 }),
    expiresAt: t.Optional(t.Date()),
    permissions: t.Optional(t.Array(t.String())),
    ipWhitelist: t.Optional(t.Array(t.String())),
    metadata: t.Optional(t.Any()),
  }),
]);

export const ApiKeyListQueryDto = t.Intersect([
  PaginationReqDto,
  UserFilterDto,
  t.Object({
    status: t.Optional(t.Enum(ApiKeyStatus)),
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
    user: t.Optional(UserInfoDto),
    metadata: t.Nullable(t.Any()),
    usage: t.Optional(
      t.Object({
        totalRequests: t.Number(),
        lastUsedAt: t.Nullable(t.Date()),
      }),
    ),
  }),
]);

export const ApiKeyPaginatedResponseDto = PaginatedDto(ApiKeyResponseDto);

export const ApiKeyCreatedResponseDto = t.Object({
  id: t.String(),
  key: t.String(), // Full key only returned on creation
  keyPrefix: t.String(),
  name: t.String(),
  expiresAt: t.Nullable(t.Date()),
  created: t.Date(),
});

export type UpsertApiKeyParams = typeof UpsertApiKeyDto.static;
export type ApiKeyListQueryParams = WithPermissionContext<
  typeof ApiKeyListQueryDto.static
>;
