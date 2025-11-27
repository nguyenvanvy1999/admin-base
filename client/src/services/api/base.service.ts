import { apiClient } from '@client/lib/api/client';
import type { PaginatedResponse, PaginationParams } from '@client/types/api';

/**
 * Base service class with common CRUD operations
 */
export abstract class BaseService<
  T,
  CreateDto = Partial<T>,
  UpdateDto = Partial<T>,
> {
  protected abstract basePath: string;

  /**
   * Get all items (with optional pagination)
   */
  getAll(params?: PaginationParams): Promise<PaginatedResponse<T>> {
    return apiClient.get<PaginatedResponse<T>>(this.basePath, { params });
  }

  /**
   * Get item by ID
   */
  getById(id: string | number): Promise<T> {
    return apiClient.get<T>(`${this.basePath}/${id}`);
  }

  /**
   * Create new item
   */
  create(data: CreateDto): Promise<T> {
    return apiClient.post<T>(this.basePath, data);
  }

  /**
   * Update item by ID
   */
  update(id: string | number, data: UpdateDto): Promise<T> {
    return apiClient.put<T>(`${this.basePath}/${id}`, data);
  }

  /**
   * Patch item by ID (partial update)
   */
  patch(id: string | number, data: Partial<UpdateDto>): Promise<T> {
    return apiClient.patch<T>(`${this.basePath}/${id}`, data);
  }

  /**
   * Delete item by ID
   */
  delete(id: string | number): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }
}

/**
 * Query key factory pattern
 */
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
