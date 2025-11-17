import { authCheck } from '@server/services/auth/auth.middleware';
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
import { reportService } from '../services/report.service';
import { castToRes, ResWrapper } from '../share';
import { createControllerDetail } from './base/controller-detail.factory';

const REPORT_DETAIL = createControllerDetail('Report');

const reportController = new Elysia().group('/reports', (group) =>
  group
    .use(authCheck)
    .get(
      '/summary',
      async ({ currentUser, query }) => {
        return castToRes(await reportService.getSummary(currentUser.id, query));
      },
      {
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
      async ({ currentUser, query }) => {
        return castToRes(
          await reportService.getTransactions(currentUser.id, query),
        );
      },
      {
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
      async ({ currentUser, query }) => {
        return castToRes(
          await reportService.getInvestments(currentUser.id, query),
        );
      },
      {
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
      async ({ currentUser, query }) => {
        return castToRes(
          await reportService.getIncomeExpenseDetailed(currentUser.id, query),
        );
      },
      {
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
      async ({ currentUser, query }) => {
        return castToRes(
          await reportService.getInvestmentPerformanceDetailed(
            currentUser.id,
            query,
          ),
        );
      },
      {
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
      async ({ currentUser, query }) => {
        return castToRes(
          await reportService.getInvestmentTradesDetailed(
            currentUser.id,
            query,
          ),
        );
      },
      {
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
      async ({ currentUser, query }) => {
        return castToRes(
          await reportService.getInvestmentFeesDetailed(currentUser.id, query),
        );
      },
      {
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
      async ({ currentUser, query }) => {
        return castToRes(
          await reportService.getInvestmentContributionsDetailed(
            currentUser.id,
            query,
          ),
        );
      },
      {
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
      async ({ currentUser, query }) => {
        return castToRes(
          await reportService.getDebtStatistics(currentUser.id, query),
        );
      },
      {
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
