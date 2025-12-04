export type Optional<T> = T | undefined;

export type SortOrder = 'asc' | 'desc' | null;

// Base entity interface for all entities with common fields
export interface BaseEntity {
  id: string;
  created: string;
  modified?: string;
}

// DTO utility types for CRUD operations
export type UpsertDto<T extends { id?: string }> = Partial<Pick<T, 'id'>> &
  Omit<T, 'id' | 'created' | 'modified'>;
export type CreateDto<T> = Omit<T, 'id' | 'created' | 'modified'>;
export type UpdateDto<T> = Partial<Omit<T, 'id' | 'created' | 'modified'>>;
