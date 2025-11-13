import { UserRole } from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';
import {
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
    ),
);

export default reportController;
