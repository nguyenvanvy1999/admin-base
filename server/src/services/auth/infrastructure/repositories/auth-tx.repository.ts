import { createHash, randomUUID } from 'node:crypto';
import { authTxCache, type IAuthTxCache } from 'src/config/cache';
import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import type {
  AuthTxState,
  ChallengeType,
} from 'src/services/auth/types/constants';
import { BadReqErr, ErrCode, UnAuthErr } from 'src/share';
import type { AuthTx } from 'src/types/auth.types';
import { AuthTransaction } from '../../domain/entities/auth-transaction.entity';

export interface IAuthTxRepository {
  create(
    userId: string,
    state: AuthTxState,
    ctx: { ip: string; ua?: string },
    securityResult?: SecurityCheckResult,
    challengeType?: ChallengeType,
  ): Promise<AuthTransaction>;
  get(id: string): Promise<AuthTransaction | null>;
  getOrThrow(id: string): Promise<AuthTransaction>;
  update(
    id: string,
    updates: Partial<Omit<AuthTx, 'id' | 'createdAt'>>,
  ): Promise<void>;
  delete(id: string): Promise<void>;
  assertBinding(tx: AuthTransaction, ctx: { ip: string; ua?: string }): void;
  incrementChallengeAttempts(id: string): Promise<AuthTransaction>;
  assertChallengeAttemptsAllowed(
    tx: AuthTransaction,
    maxAttempts?: number,
  ): void;
  attachEnroll(
    id: string,
    enroll: NonNullable<AuthTx['enroll']>,
  ): Promise<AuthTransaction>;
}

export class AuthTxRepository implements IAuthTxRepository {
  constructor(
    private readonly cache: IAuthTxCache = authTxCache,
    private readonly ttl: number = 300,
  ) {}

  async create(
    userId: string,
    state: AuthTxState,
    ctx: { ip: string; ua?: string },
    securityResult?: SecurityCheckResult,
    challengeType?: ChallengeType,
  ): Promise<AuthTransaction> {
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

    return this.toEntity(tx);
  }

  async get(id: string): Promise<AuthTransaction | null> {
    const tx = await this.cache.get(id);
    return tx ? this.toEntity(tx) : null;
  }

  async getOrThrow(id: string): Promise<AuthTransaction> {
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
    const tx = await this.cache.get(id);
    if (!tx) {
      throw new UnAuthErr(ErrCode.AuthTxExpired);
    }

    const updated = { ...tx, ...updates };
    await this.cache.set(id, updated, this.calculateRemainingTtl(tx));
  }

  async delete(id: string): Promise<void> {
    await this.cache.del(id);
  }

  assertBinding(tx: AuthTransaction, ctx: { ip: string; ua?: string }): void {
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

  async incrementChallengeAttempts(id: string): Promise<AuthTransaction> {
    const tx = await this.getOrThrow(id);
    const updatedTx: AuthTx = {
      id: tx.id,
      userId: tx.userId,
      state: tx.state,
      createdAt: tx.createdAt,
      challengeAttempts: tx.challengeAttempts + 1,
      ipHash: tx.ipHash,
      uaHash: tx.uaHash,
      securityResult: tx.securityResult,
      challengeType: tx.challengeType,
      enroll: tx.enroll,
      emailOtpToken: tx.emailOtpToken,
      deviceVerifyToken: tx.deviceVerifyToken,
    };

    await this.cache.set(id, updatedTx, this.calculateRemainingTtl(updatedTx));

    return this.toEntity(updatedTx);
  }

  assertChallengeAttemptsAllowed(
    tx: AuthTransaction,
    maxAttempts: number = 5,
  ): void {
    if (tx.hasExceededMaxAttempts(maxAttempts)) {
      throw new BadReqErr(ErrCode.TooManyAttempts);
    }
  }

  async attachEnroll(
    id: string,
    enroll: NonNullable<AuthTx['enroll']>,
  ): Promise<AuthTransaction> {
    await this.getOrThrow(id);
    await this.update(id, { enroll });
    return this.getOrThrow(id);
  }

  private toEntity(tx: AuthTx): AuthTransaction {
    return new AuthTransaction(
      tx.id,
      tx.userId,
      tx.state,
      tx.createdAt,
      tx.challengeAttempts,
      tx.ipHash,
      tx.uaHash,
      tx.securityResult,
      tx.challengeType,
      tx.enroll,
      tx.emailOtpToken,
      tx.deviceVerifyToken,
    );
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

export const authTxRepository = new AuthTxRepository();
