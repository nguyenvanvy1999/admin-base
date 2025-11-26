import { ReferralStatus } from 'src/generated';
import type { PrismaTx } from 'src/share';

export class ReferralService {
  async createReferral(
    tx: PrismaTx,
    referrerId: string,
    refCode?: string,
  ): Promise<boolean> {
    if (!refCode) return false;
    const referred = await tx.user.findUnique({
      where: { refCode },
      select: { id: true },
    });

    if (referred) {
      await tx.referral.create({
        data: {
          referrerId,
          referredId: referred.id,
          status: ReferralStatus.INACTIVE,
        },
        select: { id: true },
      });
      await tx.user.update({
        where: { id: referred.id },
        data: { pendingRef: { increment: 1 } },
        select: { id: true },
      });
      return true;
    }
    return false;
  }

  async activeReferral(tx: PrismaTx, referrerId: string): Promise<boolean> {
    const referral = await tx.referral.findUnique({ where: { referrerId } });
    if (referral && referral.status === ReferralStatus.INACTIVE) {
      await tx.referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.ACTIVE },
        select: { id: true },
      });
      await tx.user.update({
        where: { id: referral.referredId },
        data: { pendingRef: { decrement: 1 }, activeRef: { increment: 1 } },
        select: { id: true },
      });
      return true;
    }
    return false;
  }
}

export const referralService = new ReferralService();
