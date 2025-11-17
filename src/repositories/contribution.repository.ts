import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { CONTRIBUTION_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type ContributionRecord = Prisma.ContributionGetPayload<{
  select: typeof CONTRIBUTION_SELECT_FULL;
}>;

export class ContributionRepository extends BaseRepository<
  typeof prisma.contribution,
  ContributionRecord,
  typeof CONTRIBUTION_SELECT_FULL
> {
  constructor() {
    super(prisma.contribution, CONTRIBUTION_SELECT_FULL);
  }

  // Add any contribution-specific database methods here in the future
}

export const contributionRepository = new ContributionRepository();
