import { ServiceBase } from '@client/libs/ServiceBase';

export interface ReportSummaryResponse {
  totalBalance: number;
  totalInvestments: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  investmentCount: number;
  totalTrades: number;
}

export interface TransactionStatsItem {
  date: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

export interface ReportTransactionsResponse {
  stats: TransactionStatsItem[];
  totalIncome: number;
  totalExpense: number;
  totalNet: number;
  totalTransactions: number;
}

export interface InvestmentAllocationItem {
  investmentId: string;
  investmentName: string;
  investmentSymbol: string;
  assetType: string;
  value: number;
  percentage: number;
}

export interface InvestmentPerformance {
  totalInvested: number;
  totalValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  roi: number;
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
}

export interface ReportInvestmentsResponse {
  allocation: InvestmentAllocationItem[];
  performance: InvestmentPerformance;
}

export class ReportService extends ServiceBase {
  constructor() {
    super('/api/reports');
  }

  getSummary(query?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ReportSummaryResponse> {
    return this.get<ReportSummaryResponse>({
      endpoint: 'summary',
      params: query,
    });
  }

  getTransactions(query?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<ReportTransactionsResponse> {
    return this.get<ReportTransactionsResponse>({
      endpoint: 'transactions',
      params: query,
    });
  }

  getInvestments(query?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ReportInvestmentsResponse> {
    return this.get<ReportInvestmentsResponse>({
      endpoint: 'investments',
      params: query,
    });
  }
}

export const reportService = new ReportService();
