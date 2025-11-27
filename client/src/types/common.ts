/**
 * Common Utility Types
 */

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type ID = string | number;

export interface BaseEntity {
  id: ID;
  createdAt?: string;
  updatedAt?: string;
}

export type FormMode = 'create' | 'edit' | 'view';

export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

export type SortOrder = 'asc' | 'desc' | null;

export interface SortParams {
  field?: string;
  order?: SortOrder;
}

export interface FilterParams {
  [key: string]: unknown;
}
