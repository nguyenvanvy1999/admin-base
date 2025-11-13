export * from './array.util';
export * from './id.util';
export * from './time.util';

export const castToRes = <T>(data: T) => ({
  data,
  t: new Date().toISOString(),
  success: true,
  code: 'success',
});
