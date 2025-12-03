import { BadReqErr, ErrCode } from 'src/share';

export const extractIdempotencyKey = (request: Request): string => {
  const idempotencyKey = request.headers.get('idempotency-key');
  if (!idempotencyKey) {
    throw new BadReqErr(ErrCode.BadRequest, {
      errors: 'Missing Idempotency-Key header',
    });
  }
  return idempotencyKey;
};
