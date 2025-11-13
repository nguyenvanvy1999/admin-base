export type UPermission = string;

export interface ITokenPayload {
  userId: string;
  timestamp: number;
  sessionId: string;
  clientIp: string;
  userAgent: string;
}

export interface ICurrentUser {
  id: string;
  sessionId: string;
  username: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  baseCurrencyId: string | null;
  settings: any;
  permissions: UPermission[];
  roleIds: string[];
}

export type AppAuthMeta = {
  derive: { currentUser: ICurrentUser };
  decorator: Record<string, unknown>;
  store: Record<string, unknown>;
  resolve: Record<string, unknown>;
};

import type { PrismaClient } from '@server/generated/prisma/client';

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;
