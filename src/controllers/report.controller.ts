import { UserRole } from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';
import {
  DebtStatisticsQueryDto,
  DebtStatisticsResponseDto,
  IncomeExpenseDetailedQueryDto,
  IncomeExpenseDetailedResponseDto,
  InvestmentContributionsDetailedQueryDto,
  InvestmentContributionsDetailedResponseDto,
  InvestmentFeesDetailedQueryDto,
  InvestmentFeesDetailedResponseDto,
  InvestmentPerformanceDetailedQueryDto,
  InvestmentPerformanceDetailedResponseDto,
  InvestmentTradesDetailedQueryDto,
  InvestmentTradesDetailedResponseDto,
  ReportInvestmentsDto,
  ReportInvestmentsQueryDto,
  ReportSummaryDto,
  ReportSummaryQueryDto,
  ReportTransactionsDto,
  ReportTransactionsQueryDto,
} from '../dto/report.dto';
import authMacro from '../macros/auth';
import reportService from '../services/report.service';
import { castToRes, ResWrapper } from '../share';

const REPORT_DETAIL = {
  tags: ['Report'],
  security: [{ JwtAuth: [] }],
};

const reportController = new Elysia().group('/reports', (group) =>
  group
    .use(reportService)
    .use(authMacro)
    .get(
      '/summary',
      async ({ user, query, reportService }) => {
        return castToRes(await reportService.getSummary(user.id, query));
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get summary report',
          description:
            'Return summary statistics including total balance, investments, income, and expenses.',
        },
        query: ReportSummaryQueryDto,
        response: {
          200: ResWrapper(ReportSummaryDto),
        },
      },
    )
    .get(
      '/transactions',
      async ({ user, query, reportService }) => {
        return castToRes(await reportService.getTransactions(user.id, query));
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get transaction statistics',
          description:
            'Return transaction statistics grouped by time period (day/week/month).',
        },
        query: ReportTransactionsQueryDto,
        response: {
          200: ResWrapper(ReportTransactionsDto),
        },
      },
    )
    .get(
      '/investments',
      async ({ user, query, reportService }) => {
        return castToRes(await reportService.getInvestments(user.id, query));
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get investment statistics',
          description:
            'Return investment allocation and performance metrics including P&L and ROI.',
        },
        query: ReportInvestmentsQueryDto,
        response: {
          200: ResWrapper(ReportInvestmentsDto),
        },
      },
    )
    .get(
      '/income-expense-detailed',
      async ({ user, query, reportService }) => {
        return castToRes(
          await reportService.getIncomeExpenseDetailed(user.id, query),
        );
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get detailed income/expense statistics',
          description:
            'Return detailed income and expense statistics with breakdowns by category, account, entity, and fee statistics.',
        },
        query: IncomeExpenseDetailedQueryDto,
        response: {
          200: ResWrapper(IncomeExpenseDetailedResponseDto),
        },
      },
    )
    .get(
      '/investments/performance-detailed',
      async ({ user, query, reportService }) => {
        return castToRes(
          await reportService.getInvestmentPerformanceDetailed(user.id, query),
        );
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get detailed investment performance statistics',
          description:
            'Return investment performance time series with P&L and ROI metrics.',
        },
        query: InvestmentPerformanceDetailedQueryDto,
        response: {
          200: ResWrapper(InvestmentPerformanceDetailedResponseDto),
        },
      },
    )
    .get(
      '/investments/trades-detailed',
      async ({ user, query, reportService }) => {
        return castToRes(
          await reportService.getInvestmentTradesDetailed(user.id, query),
        );
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get detailed investment trades statistics',
          description:
            'Return detailed trade statistics including buy/sell counts, volumes, and average trade sizes.',
        },
        query: InvestmentTradesDetailedQueryDto,
        response: {
          200: ResWrapper(InvestmentTradesDetailedResponseDto),
        },
      },
    )
    .get(
      '/investments/fees-detailed',
      async ({ user, query, reportService }) => {
        return castToRes(
          await reportService.getInvestmentFeesDetailed(user.id, query),
        );
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get detailed investment fees statistics',
          description:
            'Return investment fee statistics with breakdown by investment and time period.',
        },
        query: InvestmentFeesDetailedQueryDto,
        response: {
          200: ResWrapper(InvestmentFeesDetailedResponseDto),
        },
      },
    )
    .get(
      '/investments/contributions-detailed',
      async ({ user, query, reportService }) => {
        return castToRes(
          await reportService.getInvestmentContributionsDetailed(
            user.id,
            query,
          ),
        );
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get detailed investment contributions statistics',
          description:
            'Return investment contributions statistics including deposits, withdrawals, and cumulative amounts.',
        },
        query: InvestmentContributionsDetailedQueryDto,
        response: {
          200: ResWrapper(InvestmentContributionsDetailedResponseDto),
        },
      },
    )
    .get(
      '/debt-statistics',
      async ({ user, query, reportService }) => {
        return castToRes(await reportService.getDebtStatistics(user.id, query));
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          ...REPORT_DETAIL,
          summary: 'Get debt statistics',
          description:
            'Return debt statistics including entity debts, loan history, and time series data.',
        },
        query: DebtStatisticsQueryDto,
        response: {
          200: ResWrapper(DebtStatisticsResponseDto),
        },
      },
    ),
);

export default reportController;
