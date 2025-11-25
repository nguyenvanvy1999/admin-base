export * from './array.util';
export * from './delete-many.util';
export * from './formatters';
export * from './id.util';
export * from './ownership.util';
export * from './pagination.util';
export * from './query.util';
export * from './time.util';
export * from './validation.util';
// Note: service.util exports are not re-exported to avoid conflicts with validation.util

export const castToRes = <T>(data: T) => ({
  data,
  t: new Date().toISOString(),
  success: true,
  code: 'success',
});
