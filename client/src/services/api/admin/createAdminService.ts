import { apiClient } from 'src/lib/api/client';
import { createQueryKeys } from '../base.service';

export interface AdminServiceConfig<
  TListQuery extends Record<string, any>,
  TDetail,
  TListResponse extends { docs: any[]; count: number },
  TCreate = any,
  TUpdate = any,
> {
  basePath: string;
  queryKey: string;
  list?: (params?: TListQuery) => Promise<TListResponse>;
  detail?: (id: string) => Promise<TDetail>;
  create?: (data: TCreate) => Promise<void>;
  update?: (id: string, data: TUpdate) => Promise<void>;
  delete?: (ids: string[]) => Promise<void>;
}

export function createAdminService<
  TListQuery extends Record<string, any>,
  TDetail,
  TListResponse extends { docs: any[]; count: number },
  TCreate = any,
  TUpdate = any,
>(
  config: AdminServiceConfig<
    TListQuery,
    TDetail,
    TListResponse,
    TCreate,
    TUpdate
  >,
) {
  const queryKeys = {
    ...createQueryKeys(config.queryKey),
    list: (filters?: Partial<TListQuery>) =>
      [...createQueryKeys(config.queryKey).lists(), filters] as const,
    detail: (id: string) =>
      [...createQueryKeys(config.queryKey).details(), id] as const,
  };

  const service: any = {};

  if (config.list) {
    service.list = config.list;
  } else {
    service.list = (params?: TListQuery): Promise<TListResponse> => {
      return apiClient.get<TListResponse>(config.basePath, { params });
    };
  }

  if (config.detail) {
    service.detail = config.detail;
  } else {
    service.detail = (id: string): Promise<TDetail> => {
      return apiClient.get<TDetail>(`${config.basePath}/${id}`);
    };
  }

  if (config.create) {
    service.create = config.create;
  } else {
    service.create = (data: TCreate): Promise<void> => {
      return apiClient.post<void>(config.basePath, data);
    };
  }

  if (config.update) {
    service.update = config.update;
  } else {
    service.update = (id: string, data: TUpdate): Promise<void> => {
      return apiClient.patch<void>(`${config.basePath}/${id}`, data);
    };
  }

  if (config.delete) {
    service.delete = config.delete;
  } else {
    service.delete = (ids: string[]): Promise<void> => {
      return apiClient.post<void>(`${config.basePath}/del`, { ids });
    };
  }

  return {
    queryKeys,
    service,
  };
}
