import { db, type IDb } from 'src/config/db';
import type { ReferralRequestDto } from 'src/modules/auth/dtos';
import {
  type ReferralService,
  referralService,
} from 'src/service/misc/referral.service';

type ApplyReferralCodeParams = {
  userId: string;
} & typeof ReferralRequestDto.static;

export class UserService {
  constructor(
    private readonly deps: {
      db: IDb;
      referralService: ReferralService;
    } = {
      db,
      referralService,
    },
  ) {}

  applyReferralCode(params: ApplyReferralCodeParams): Promise<boolean> {
    const { userId, refCode } = params;
    const normalizedRefCode = refCode.trim().toUpperCase();

    return this.deps.db.$transaction((tx) =>
      this.deps.referralService.createReferral(tx, userId, normalizedRefCode),
    );
  }
}

export const userService = new UserService();
