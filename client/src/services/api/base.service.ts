import { apiClient } from '@client/lib/api/client';
import type { PaginatedResponse, PaginationParams } from '@client/types/api';

export abstract class BaseService<
  T,
  CreateDto = Partial<T>,
  UpdateDto = Partial<T>,
> {
  protected abstract basePath: string;

  getAll(params?: PaginationParams): Promise<PaginatedResponse<T>> {
    return apiClient.get<PaginatedResponse<T>>(this.basePath, { params });
  }

  getById(id: string | number): Promise<T> {
    return apiClient.get<T>(`${this.basePath}/${id}`);
  }

  create(data: CreateDto): Promise<T> {
    return apiClient.post<T>(this.basePath, data);
  }

  update(id: string | number, data: UpdateDto): Promise<T> {
    return apiClient.put<T>(`${this.basePath}/${id}`, data);
  }

  patch(id: string | number, data: Partial<UpdateDto>): Promise<T> {
    return apiClient.patch<T>(`${this.basePath}/${id}`, data);
  }

  delete(id: string | number): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }
}

export function createQueryKeys(baseKey: string) {
  return {
    all: [baseKey] as const,
    lists: () => [...createQueryKeys(baseKey).all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...createQueryKeys(baseKey).lists(), filters] as const,
    details: () => [...createQueryKeys(baseKey).all, 'detail'] as const,
    detail: (id: string | number) =>
      [...createQueryKeys(baseKey).details(), id] as const,
  };
}
