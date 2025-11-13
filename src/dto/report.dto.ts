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

export type IReportSummaryQueryDto = z.infer<typeof ReportSummaryQueryDto>;
export type IReportTransactionsQueryDto = z.infer<
  typeof ReportTransactionsQueryDto
>;
export type IReportInvestmentsQueryDto = z.infer<
  typeof ReportInvestmentsQueryDto
>;

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

export type ReportSummaryResponse = typeof ReportSummaryDto.static;
export type ReportTransactionsResponse = typeof ReportTransactionsDto.static;
export type ReportInvestmentsResponse = typeof ReportInvestmentsDto.static;
