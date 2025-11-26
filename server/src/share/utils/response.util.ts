import type { TSchema } from 'elysia';
import { BadReqErr, ErrCode } from 'src/share';
import { authErrors, ResWrapper } from 'src/share/type/dto';

export const createAuthResponse = <T extends TSchema>(schema: T) => ({
  200: ResWrapper(schema),
  ...authErrors,
});

export const createResponse = <T extends TSchema>(schema: T) => ({
  200: ResWrapper(schema),
});

export const extractIdempotencyKey = (request: Request): string => {
  const idempotencyKey = request.headers.get('idempotency-key');
  if (!idempotencyKey) {
    throw new BadReqErr(ErrCode.BadRequest, {
      errors: 'Missing Idempotency-Key header',
    });
  }
  return idempotencyKey;
};
