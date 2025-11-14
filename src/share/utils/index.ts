export * from './array.util';
export * from './formatters';
export * from './id.util';
export * from './query.util';
export * from './time.util';
export * from './validation.util';

export const castToRes = <T>(data: T) => ({
  data,
  t: new Date().toISOString(),
  success: true,
  code: 'success',
});
