import type { PrismaClient } from '@server/generated/prisma/client';

export type PrismaTx = Omit<
  PrismaClient<never, never>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;
