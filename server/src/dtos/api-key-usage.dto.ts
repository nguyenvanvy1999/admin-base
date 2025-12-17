import { t } from 'elysia';
import { PaginationReqDto } from 'src/share';

export const ApiKeyUsageListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    apiKeyId: t.Optional(t.String({ minLength: 1 })),
    userId: t.Optional(t.String({ minLength: 1 })),
    method: t.Optional(t.String({ minLength: 1 })),
    endpoint: t.Optional(t.String({ minLength: 1 })),
    statusCode: t.Optional(t.Integer()),
    startDate: t.Optional(t.Date({ format: 'date-time' })),
    endDate: t.Optional(t.Date({ format: 'date-time' })),
    ip: t.Optional(t.String({ minLength: 1 })),
  }),
]);

export const ApiKeyUsageStatsQueryDto = t.Object({
  apiKeyId: t.Optional(t.String({ minLength: 1 })),
  userId: t.Optional(t.String({ minLength: 1 })),
  method: t.Optional(t.String({ minLength: 1 })),
  endpoint: t.Optional(t.String({ minLength: 1 })),
  statusCode: t.Optional(t.Integer()),
  startDate: t.Optional(t.Date({ format: 'date-time' })),
  endDate: t.Optional(t.Date({ format: 'date-time' })),
  ip: t.Optional(t.String({ minLength: 1 })),
});

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

export const ApiKeyUsagePaginatedResponseDto = t.Object({
  docs: t.Array(ApiKeyUsageResponseDto),
  count: t.Number(),
});

export const ApiKeyUsageStatsResponseDto = t.Object({
  totalRequests: t.Number(),
  lastUsedAt: t.Nullable(t.Date()),
  requestsByMethod: t.Record(t.String(), t.Number()),
  requestsByEndpoint: t.Record(t.String(), t.Number()),
  requestsByStatusCode: t.Record(t.Number(), t.Number()),
});

export type ApiKeyUsageListQueryParams =
  typeof ApiKeyUsageListQueryDto.static & {
    currentUserId: string;
    hasViewPermission: boolean;
  };

export type ApiKeyUsageStatsQueryParams =
  typeof ApiKeyUsageStatsQueryDto.static & {
    currentUserId: string;
    hasViewPermission: boolean;
  };
