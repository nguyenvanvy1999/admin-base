export * from './amount.util';
export * from './array.util';
export * from './async.util';
export * from './audit-log.util';
export * from './email.util';
export * from './id.util';
export * from './response.util';
export * from './security-event.util';
export * from './service-utils';
export * from './session.util';
export * from './time.util';
export * from './value.util';

export const castToRes = <T>(data: T) => ({
  data,
  t: new Date().toISOString(),
  success: true,
  code: 'success',
});
