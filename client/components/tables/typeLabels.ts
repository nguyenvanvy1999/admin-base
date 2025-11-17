import {
  AccountType,
  BudgetPeriod,
  EntityType,
  InvestmentAssetType,
  InvestmentMode,
  TransactionType,
} from '@server/generated';
import type { TFunction } from 'i18next';

export type TypeLabelMap<T extends string> = Record<T, string>;

export function createTypeLabelGetter<T extends string>(
  labelMap: TypeLabelMap<T>,
  t: TFunction,
): (type: T) => string {
  return (type: T) => labelMap[type] || type;
}

export function getAccountTypeLabel(type: AccountType, t: TFunction): string {
  const labelMap: TypeLabelMap<AccountType> = {
    [AccountType.cash]: t('accounts.cash'),
    [AccountType.bank]: t('accounts.bank'),
    [AccountType.credit_card]: t('accounts.credit_card'),
    [AccountType.investment]: t('accounts.investment'),
  };
  return labelMap[type] || type;
}

export function getAccountTypeColor(type: AccountType): string {
  const colorMap: Record<AccountType, string> = {
    [AccountType.cash]: 'blue',
    [AccountType.bank]: 'green',
    [AccountType.credit_card]: 'orange',
    [AccountType.investment]: 'purple',
  };
  return colorMap[type] || 'gray';
}

export function getTransactionTypeLabel(
  type: TransactionType,
  t: TFunction,
): string {
  const labelMap: TypeLabelMap<TransactionType> = {
    [TransactionType.income]: t('transactions.income'),
    [TransactionType.expense]: t('transactions.expense'),
    [TransactionType.transfer]: t('transactions.transfer'),
    [TransactionType.loan_given]: t('transactions.loanGiven'),
    [TransactionType.loan_received]: t('transactions.loanReceived'),
    [TransactionType.repay_debt]: t('categories.repay_debt', {
      defaultValue: 'Repay Debt',
    }),
    [TransactionType.collect_debt]: t('categories.collect_debt', {
      defaultValue: 'Collect Debt',
    }),
    [TransactionType.investment]: t('transactions.investment'),
  };
  return labelMap[type] || type;
}

export function getTransactionTypeColor(type: TransactionType): string {
  const colorMap: Record<TransactionType, string> = {
    [TransactionType.income]: 'green',
    [TransactionType.expense]: 'red',
    [TransactionType.transfer]: 'blue',
    [TransactionType.loan_given]: 'orange',
    [TransactionType.collect_debt]: 'orange',
    [TransactionType.loan_received]: 'cyan',
    [TransactionType.repay_debt]: 'cyan',
    [TransactionType.investment]: 'purple',
  };
  return colorMap[type] || 'gray';
}

export function getBudgetPeriodLabel(
  period: BudgetPeriod,
  t: TFunction,
): string {
  const labelMap: TypeLabelMap<BudgetPeriod> = {
    [BudgetPeriod.daily]: t('budgets.periodOptions.daily', {
      defaultValue: 'Daily',
    }),
    [BudgetPeriod.monthly]: t('budgets.periodOptions.monthly', {
      defaultValue: 'Monthly',
    }),
    [BudgetPeriod.quarterly]: t('budgets.periodOptions.quarterly', {
      defaultValue: 'Quarterly',
    }),
    [BudgetPeriod.yearly]: t('budgets.periodOptions.yearly', {
      defaultValue: 'Yearly',
    }),
    [BudgetPeriod.none]: t('budgets.periodOptions.none', {
      defaultValue: 'None',
    }),
  };
  return labelMap[period] || period;
}

export function getEntityTypeLabel(type: EntityType, t: TFunction): string {
  const labelMap: TypeLabelMap<EntityType> = {
    [EntityType.individual]: t('entities.individual'),
    [EntityType.organization]: t('entities.organization'),
  };
  return labelMap[type] || type;
}

export function getInvestmentAssetTypeLabel(
  type: InvestmentAssetType,
  t: TFunction,
): string {
  const labelMap: TypeLabelMap<InvestmentAssetType> = {
    [InvestmentAssetType.coin]: t('investments.asset.coin', {
      defaultValue: 'Coin',
    }),
    [InvestmentAssetType.ccq]: t('investments.asset.ccq', {
      defaultValue: 'Mutual fund',
    }),
    [InvestmentAssetType.custom]: t('investments.asset.custom', {
      defaultValue: 'Custom',
    }),
  };
  return labelMap[type] || type;
}

export function getInvestmentModeLabel(
  mode: InvestmentMode,
  t: TFunction,
): string {
  const labelMap: TypeLabelMap<InvestmentMode> = {
    [InvestmentMode.priced]: t('investments.modes.priced', {
      defaultValue: 'Market priced',
    }),
    [InvestmentMode.manual]: t('investments.modes.manual', {
      defaultValue: 'Manual valuation',
    }),
  };
  return labelMap[mode] || mode;
}
