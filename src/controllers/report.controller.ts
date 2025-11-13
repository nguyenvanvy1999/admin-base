import { UserRole } from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';
import {
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
      ({ user, query, reportService }) => {
        return reportService.getSummary(user.id, query);
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
          200: ReportSummaryDto,
        },
      },
    )
    .get(
      '/transactions',
      ({ user, query, reportService }) => {
        return reportService.getTransactions(user.id, query);
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
          200: ReportTransactionsDto,
        },
      },
    )
    .get(
      '/investments',
      ({ user, query, reportService }) => {
        return reportService.getInvestments(user.id, query);
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
          200: ReportInvestmentsDto,
        },
      },
    )
    .get(
      '/income-expense-detailed',
      ({ user, query, reportService }) => {
        return reportService.getIncomeExpenseDetailed(user.id, query);
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
          200: IncomeExpenseDetailedResponseDto,
        },
      },
    )
    .get(
      '/investments/performance-detailed',
      ({ user, query, reportService }) => {
        return reportService.getInvestmentPerformanceDetailed(user.id, query);
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
          200: InvestmentPerformanceDetailedResponseDto,
        },
      },
    )
    .get(
      '/investments/trades-detailed',
      ({ user, query, reportService }) => {
        return reportService.getInvestmentTradesDetailed(user.id, query);
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
          200: InvestmentTradesDetailedResponseDto,
        },
      },
    )
    .get(
      '/investments/fees-detailed',
      ({ user, query, reportService }) => {
        return reportService.getInvestmentFeesDetailed(user.id, query);
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
          200: InvestmentFeesDetailedResponseDto,
        },
      },
    )
    .get(
      '/investments/contributions-detailed',
      ({ user, query, reportService }) => {
        return reportService.getInvestmentContributionsDetailed(user.id, query);
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
          200: InvestmentContributionsDetailedResponseDto,
        },
      },
    ),
);

export default reportController;
