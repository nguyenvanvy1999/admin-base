export * from './amount.util';
export * from './array.util';
export * from './async.util';
export * from './email.util';
export * from './id.util';
export * from './pagination.util';
export * from './response.util';
export * from './time.util';
export * from './validation.util';
export * from './value.util';

export const castToRes = <T>(data: T) => ({
  data,
  t: new Date().toISOString(),
  success: true,
  code: 'success',
});
