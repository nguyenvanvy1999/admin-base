import { createHash, randomUUID } from 'node:crypto';
import { authTxCache, type IAuthTxCache } from 'src/config/cache';
import type {
  AuthTxState,
  ChallengeType,
} from 'src/services/auth/types/constants';
import { BadReqErr, ErrCode, UnAuthErr } from 'src/share';
import type { AuthTx } from 'src/types/auth.types';

export class AuthTxService {
  constructor(
    private readonly cache: IAuthTxCache = authTxCache,
    private readonly ttl: number = 300, // 5 minutes
  ) {}

  async create(
    userId: string,
    state: AuthTxState,
    ctx: { ip: string; ua?: string },
    securityResult?: any,
    challengeType?: ChallengeType,
  ): Promise<AuthTx> {
    const tx: AuthTx = {
      id: randomUUID(),
      userId,
      state,
      createdAt: Date.now(),
      challengeAttempts: 0,
      ipHash: this.hashIp(ctx.ip),
      uaHash: ctx.ua ? this.hashUa(ctx.ua) : undefined,
      securityResult,
      ...(challengeType && { challengeType }),
    };

    await this.cache.set(tx.id, tx, this.ttl);
    return tx;
  }

  get(id: string): Promise<AuthTx | null> {
    return this.cache.get(id);
  }

  async getOrThrow(id: string): Promise<AuthTx> {
    const tx = await this.get(id);
    if (!tx) {
      throw new UnAuthErr(ErrCode.AuthTxExpired);
    }
    return tx;
  }

  async update(
    id: string,
    updates: Partial<Omit<AuthTx, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const tx = await this.getOrThrow(id);
    await this.cache.set(
      id,
      { ...tx, ...updates },
      this.calculateRemainingTtl(tx),
    );
  }

  async delete(id: string): Promise<void> {
    await this.cache.del(id);
  }

  assertBinding(tx: AuthTx, ctx: { ip: string; ua?: string }): void {
    if (tx.ipHash && tx.ipHash !== this.hashIp(ctx.ip)) {
      throw new BadReqErr(ErrCode.AuthTxBindingMismatch, {
        errors: 'Session binding mismatch',
      });
    }

    if (tx.uaHash && ctx.ua && tx.uaHash !== this.hashUa(ctx.ua)) {
      throw new BadReqErr(ErrCode.AuthTxBindingMismatch, {
        errors: 'Session binding mismatch',
      });
    }
  }

  async incrementChallengeAttempts(id: string): Promise<AuthTx> {
    const tx = await this.getOrThrow(id);
    const updatedTx = {
      ...tx,
      challengeAttempts: tx.challengeAttempts + 1,
    };
    await this.cache.set(id, updatedTx, this.calculateRemainingTtl(tx));
    return updatedTx;
  }

  assertChallengeAttemptsAllowed(tx: AuthTx, maxAttempts: number = 5): void {
    if (tx.challengeAttempts >= maxAttempts) {
      throw new BadReqErr(ErrCode.TooManyAttempts);
    }
  }

  async attachEnroll(
    id: string,
    enroll: NonNullable<AuthTx['enroll']>,
  ): Promise<AuthTx> {
    const tx = await this.getOrThrow(id);
    const updatedTx = { ...tx, enroll };
    await this.cache.set(id, updatedTx, this.calculateRemainingTtl(tx));
    return updatedTx;
  }

  private calculateRemainingTtl(tx: AuthTx): number {
    const elapsed = (Date.now() - tx.createdAt) / 1000;
    return Math.max(1, Math.ceil(this.ttl - elapsed));
  }

  private hashIp(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }

  private hashUa(ua: string): string {
    return createHash('sha256').update(ua).digest('hex');
  }
}

export const authTxService = new AuthTxService();
