import { t } from 'elysia';
import {
  DateRangeStartEndDto,
  PaginatedDto,
  PaginationReqDto,
  type WithPermissionContext,
} from 'src/share';

export const ApiKeyUsageFilterDto = t.Intersect([
  t.Object({
    apiKeyId: t.Optional(t.String({ minLength: 1 })),
    userId: t.Optional(t.String({ minLength: 1 })),
    method: t.Optional(t.String({ minLength: 1 })),
    endpoint: t.Optional(t.String({ minLength: 1 })),
    statusCode: t.Optional(t.Integer()),
    ip: t.Optional(t.String({ minLength: 1 })),
  }),
  DateRangeStartEndDto,
]);

export type IApiKeyUsageFilter = WithPermissionContext<
  typeof ApiKeyUsageFilterDto.static
>;

export const ApiKeyUsageListQueryDto = t.Intersect([
  PaginationReqDto,
  ApiKeyUsageFilterDto,
]);

export type IApiKeyUsageListQuery = WithPermissionContext<
  typeof ApiKeyUsageListQueryDto.static
>;

export const ApiKeyUsageResponseDto = t.Object({
  id: t.String(),
  apiKeyId: t.String(),
  endpoint: t.String(),
  method: t.String(),
  ip: t.String(),
  userAgent: t.Nullable(t.String()),
  statusCode: t.Number(),
  timestamp: t.Date(),
});

export const ApiKeyUsagePaginatedResponseDto = PaginatedDto(
  ApiKeyUsageResponseDto,
);

export const ApiKeyUsageStatsResponseDto = t.Object({
  totalRequests: t.Number(),
  lastUsedAt: t.Nullable(t.Date()),
  requestsByMethod: t.Record(t.String(), t.Number()),
  requestsByEndpoint: t.Record(t.String(), t.Number()),
  requestsByStatusCode: t.Record(t.Number(), t.Number()),
});
