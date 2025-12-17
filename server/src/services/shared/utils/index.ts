export * from '../../audit-logs/utils/change-tracking.util';
export * from './amount.util';
export * from './common.util';
export * from './crud-helpers.util';
export * from './id.util';
export * from './list-query.util';
export * from './permission.util';
export * from './search.util';
export * from './security-event.util';
export * from './service-utils';
export * from './session.util';

export const castToRes = <T>(data: T) => ({
  data,
  t: new Date().toISOString(),
  success: true,
  code: 'success',
});
