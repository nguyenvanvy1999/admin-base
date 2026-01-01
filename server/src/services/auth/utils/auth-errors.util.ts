import { UserStatus } from 'src/generated';
import { BadReqErr, ErrCode, NotFoundErr, UnAuthErr } from 'src/share';

export function assertUserExists<T extends { id: string } | null>(
  user: T,
): asserts user is T & { id: string } {
  if (!user) {
    throw new NotFoundErr(ErrCode.UserNotFound);
  }
}

export function assertUserActive(user: { status: UserStatus }): void {
  if (user.status !== UserStatus.active) {
    throw new UnAuthErr(ErrCode.UserNotActive);
  }
}

export function assertUserActiveOrBadReq(user: { status: UserStatus }): void {
  if (user.status !== UserStatus.active) {
    throw new BadReqErr(ErrCode.UserNotActive);
  }
}
