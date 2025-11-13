import { t } from 'elysia';
import { z } from 'zod';

export const ReportSummaryQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const ReportTransactionsQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('month').optional(),
});

export const ReportInvestmentsQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const IncomeExpenseDetailedQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('month').optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  entityId: z.string().optional(),
});

export const InvestmentPerformanceDetailedQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('month').optional(),
  investmentId: z.string().optional(),
  accountId: z.string().optional(),
  assetType: z.string().optional(),
});

export const InvestmentTradesDetailedQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('month').optional(),
  investmentId: z.string().optional(),
  accountId: z.string().optional(),
});

export const InvestmentFeesDetailedQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('month').optional(),
  investmentId: z.string().optional(),
});

export const InvestmentContributionsDetailedQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('month').optional(),
  investmentId: z.string().optional(),
});

export const DebtStatisticsQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('month').optional(),
  entityId: z.string().optional(),
});

export type IReportSummaryQueryDto = z.infer<typeof ReportSummaryQueryDto>;
export type IReportTransactionsQueryDto = z.infer<
  typeof ReportTransactionsQueryDto
>;
export type IReportInvestmentsQueryDto = z.infer<
  typeof ReportInvestmentsQueryDto
>;
export type IIncomeExpenseDetailedQueryDto = z.infer<
  typeof IncomeExpenseDetailedQueryDto
>;
export type IInvestmentPerformanceDetailedQueryDto = z.infer<
  typeof InvestmentPerformanceDetailedQueryDto
>;
export type IInvestmentTradesDetailedQueryDto = z.infer<
  typeof InvestmentTradesDetailedQueryDto
>;
export type IInvestmentFeesDetailedQueryDto = z.infer<
  typeof InvestmentFeesDetailedQueryDto
>;
export type IInvestmentContributionsDetailedQueryDto = z.infer<
  typeof InvestmentContributionsDetailedQueryDto
>;
export type IDebtStatisticsQueryDto = z.infer<typeof DebtStatisticsQueryDto>;

export const ReportSummaryDto = t.NoValidate(
  t.Object({
    totalBalance: t.Number(),
    totalInvestments: t.Number(),
    totalIncome: t.Number(),
    totalExpense: t.Number(),
    transactionCount: t.Integer(),
    incomeCount: t.Integer(),
    expenseCount: t.Integer(),
    investmentCount: t.Integer(),
    totalTrades: t.Integer(),
  }),
);

export const TransactionStatsItemDto = t.NoValidate(
  t.Object({
    date: t.String(),
    income: t.Number(),
    expense: t.Number(),
    net: t.Number(),
    fee: t.Number(),
    transactionCount: t.Integer(),
  }),
);

export const ReportTransactionsDto = t.NoValidate(
  t.Object({
    stats: t.Array(TransactionStatsItemDto),
    totalIncome: t.Number(),
    totalExpense: t.Number(),
    totalNet: t.Number(),
    totalTransactions: t.Integer(),
  }),
);

export const InvestmentAllocationItemDto = t.NoValidate(
  t.Object({
    investmentId: t.String(),
    investmentName: t.String(),
    investmentSymbol: t.String(),
    assetType: t.String(),
    value: t.Number(),
    percentage: t.Number(),
  }),
);

export const InvestmentPerformanceDto = t.NoValidate(
  t.Object({
    totalInvested: t.Number(),
    totalValue: t.Number(),
    realizedPnl: t.Number(),
    unrealizedPnl: t.Number(),
    totalPnl: t.Number(),
    roi: t.Number(),
    totalTrades: t.Integer(),
    buyTrades: t.Integer(),
    sellTrades: t.Integer(),
  }),
);

export const ReportInvestmentsDto = t.NoValidate(
  t.Object({
    allocation: t.Array(InvestmentAllocationItemDto),
    performance: InvestmentPerformanceDto,
  }),
);

export const CategoryStatsDto = t.NoValidate(
  t.Object({
    categoryId: t.String(),
    categoryName: t.String(),
    parentId: t.Nullable(t.String()),
    income: t.Number(),
    expense: t.Number(),
    net: t.Number(),
    transactionCount: t.Integer(),
    fee: t.Number(),
  }),
);

export const AccountStatsDto = t.NoValidate(
  t.Object({
    accountId: t.String(),
    accountName: t.String(),
    income: t.Number(),
    expense: t.Number(),
    net: t.Number(),
    transactionCount: t.Integer(),
    fee: t.Number(),
  }),
);

export const EntityStatsDto = t.NoValidate(
  t.Object({
    entityId: t.String(),
    entityName: t.String(),
    income: t.Number(),
    expense: t.Number(),
    net: t.Number(),
    transactionCount: t.Integer(),
    fee: t.Number(),
  }),
);

export const FeeStatsDto = t.NoValidate(
  t.Object({
    totalFee: t.Number(),
    averageFeePerTransaction: t.Number(),
    feeByCategory: t.Array(
      t.Object({
        categoryId: t.String(),
        categoryName: t.String(),
        fee: t.Number(),
      }),
    ),
    feeByAccount: t.Array(
      t.Object({
        accountId: t.String(),
        accountName: t.String(),
        fee: t.Number(),
      }),
    ),
  }),
);

export const IncomeExpenseDetailedResponseDto = t.NoValidate(
  t.Object({
    timeStats: t.Array(TransactionStatsItemDto),
    categoryStats: t.Array(CategoryStatsDto),
    accountStats: t.Array(AccountStatsDto),
    entityStats: t.Array(EntityStatsDto),
    feeStats: FeeStatsDto,
    summary: t.Object({
      totalIncome: t.Number(),
      totalExpense: t.Number(),
      totalNet: t.Number(),
      totalFee: t.Number(),
      totalTransactions: t.Integer(),
      averageDailyIncome: t.Number(),
      averageDailyExpense: t.Number(),
      averageMonthlyIncome: t.Number(),
      averageMonthlyExpense: t.Number(),
    }),
  }),
);

export type ReportSummaryResponse = typeof ReportSummaryDto.static;
export type ReportTransactionsResponse = typeof ReportTransactionsDto.static;
export type ReportInvestmentsResponse = typeof ReportInvestmentsDto.static;
export const InvestmentPerformanceTimeSeriesDto = t.NoValidate(
  t.Object({
    date: t.String(),
    totalInvested: t.Number(),
    totalValue: t.Number(),
    realizedPnl: t.Number(),
    unrealizedPnl: t.Number(),
    totalPnl: t.Number(),
    roi: t.Number(),
  }),
);

export const TradeStatsDto = t.NoValidate(
  t.Object({
    date: t.String(),
    buyCount: t.Integer(),
    sellCount: t.Integer(),
    buyVolume: t.Number(),
    sellVolume: t.Number(),
    totalVolume: t.Number(),
    averageTradeSize: t.Number(),
  }),
);

export const InvestmentFeeBreakdownDto = t.NoValidate(
  t.Object({
    investmentId: t.String(),
    investmentName: t.String(),
    investmentSymbol: t.String(),
    fee: t.Number(),
  }),
);

export const InvestmentFeesDetailedResponseDto = t.NoValidate(
  t.Object({
    timeStats: t.Array(
      t.Object({
        date: t.String(),
        totalFee: t.Number(),
        transactionCount: t.Integer(),
      }),
    ),
    feeByInvestment: t.Array(InvestmentFeeBreakdownDto),
    summary: t.Object({
      totalFee: t.Number(),
      averageFeePerTrade: t.Number(),
      feePercentageOfReturns: t.Number(),
    }),
  }),
);

export const InvestmentPerformanceDetailedResponseDto = t.NoValidate(
  t.Object({
    timeSeries: t.Array(InvestmentPerformanceTimeSeriesDto),
    summary: t.Object({
      totalInvested: t.Number(),
      currentValue: t.Number(),
      totalPnl: t.Number(),
      realizedPnl: t.Number(),
      unrealizedPnl: t.Number(),
      roi: t.Number(),
    }),
  }),
);

export const InvestmentTradesDetailedResponseDto = t.NoValidate(
  t.Object({
    stats: t.Array(TradeStatsDto),
    summary: t.Object({
      totalBuyTrades: t.Integer(),
      totalSellTrades: t.Integer(),
      totalBuyVolume: t.Number(),
      totalSellVolume: t.Number(),
      averageTradeSize: t.Number(),
      totalTrades: t.Integer(),
    }),
  }),
);

export const ContributionStatsDto = t.NoValidate(
  t.Object({
    date: t.String(),
    deposits: t.Number(),
    withdrawals: t.Number(),
    net: t.Number(),
    cumulative: t.Number(),
  }),
);

export const InvestmentContributionsDetailedResponseDto = t.NoValidate(
  t.Object({
    stats: t.Array(ContributionStatsDto),
    summary: t.Object({
      totalDeposits: t.Number(),
      totalWithdrawals: t.Number(),
      netContributions: t.Number(),
    }),
  }),
);

export type IncomeExpenseDetailedResponse =
  typeof IncomeExpenseDetailedResponseDto.static;
export type InvestmentPerformanceDetailedResponse =
  typeof InvestmentPerformanceDetailedResponseDto.static;
export type InvestmentTradesDetailedResponse =
  typeof InvestmentTradesDetailedResponseDto.static;
export type InvestmentFeesDetailedResponse =
  typeof InvestmentFeesDetailedResponseDto.static;
export type InvestmentContributionsDetailedResponse =
  typeof InvestmentContributionsDetailedResponseDto.static;

export const EntityDebtDto = t.NoValidate(
  t.Object({
    entityId: t.String(),
    entityName: t.String(),
    totalLoanGiven: t.Number(),
    totalLoanReceived: t.Number(),
    netDebt: t.Number(),
    currencyId: t.String(),
    currency: t.Object({
      id: t.String(),
      code: t.String(),
      name: t.String(),
      symbol: t.Nullable(t.String()),
    }),
    transactionCount: t.Integer(),
  }),
);

export const LoanHistoryItemDto = t.NoValidate(
  t.Object({
    id: t.String(),
    date: t.String(),
    type: t.String(),
    amount: t.Number(),
    currencyId: t.String(),
    currency: t.Object({
      id: t.String(),
      code: t.String(),
      name: t.String(),
      symbol: t.Nullable(t.String()),
    }),
    entityId: t.String(),
    entityName: t.String(),
    accountId: t.String(),
    accountName: t.String(),
    note: t.Nullable(t.String()),
  }),
);

export const DebtTimeSeriesDto = t.NoValidate(
  t.Object({
    date: t.String(),
    totalLoanGiven: t.Number(),
    totalLoanReceived: t.Number(),
    netDebt: t.Number(),
    cumulativeNetDebt: t.Number(),
    transactionCount: t.Integer(),
  }),
);

export const DebtStatisticsResponseDto = t.NoValidate(
  t.Object({
    entityDebts: t.Array(EntityDebtDto),
    loanHistory: t.Array(LoanHistoryItemDto),
    timeSeries: t.Array(DebtTimeSeriesDto),
    summary: t.Object({
      totalLoanGiven: t.Number(),
      totalLoanReceived: t.Number(),
      netDebt: t.Number(),
      totalTransactions: t.Integer(),
      entityCount: t.Integer(),
    }),
  }),
);

export type DebtStatisticsResponse = typeof DebtStatisticsResponseDto.static;
