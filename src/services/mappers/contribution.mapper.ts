import type { Prisma } from '@server/generated';
import {
  dateToIsoString,
  decimalToNullableNumber,
  decimalToNumber,
} from '@server/share';
import type { InvestmentContributionResponse } from '../../dto/contribution.dto';
import type { CONTRIBUTION_SELECT_FULL } from '../selects';

type ContributionRecord = Prisma.InvestmentContributionGetPayload<{
  select: typeof CONTRIBUTION_SELECT_FULL;
}>;

export const mapContribution = (
  contribution: ContributionRecord,
): InvestmentContributionResponse => ({
  ...contribution,
  accountId: contribution.accountId ?? null,
  amount: decimalToNumber(contribution.amount),
  amountInBaseCurrency: decimalToNullableNumber(
    contribution.amountInBaseCurrency,
  ),
  exchangeRate: decimalToNullableNumber(contribution.exchangeRate),
  baseCurrencyId: contribution.baseCurrencyId ?? null,
  timestamp: dateToIsoString(contribution.timestamp),
  note: contribution.note ?? null,
  created: dateToIsoString(contribution.created),
  modified: dateToIsoString(contribution.modified),
  account: contribution.account
    ? {
        id: contribution.account.id,
        name: contribution.account.name,
      }
    : null,
  baseCurrency: contribution.baseCurrency ?? null,
});
