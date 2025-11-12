import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  InvestmentContributionFormData,
  InvestmentFormData,
  InvestmentTradeFormData,
  InvestmentValuationFormData,
} from '@client/types/investment';
import type {
  InvestmentContributionListResponse,
  InvestmentContributionResponse,
} from '@server/dto/contribution.dto';
import type {
  InvestmentListResponse,
  InvestmentPositionResponse,
  InvestmentResponse,
} from '@server/dto/investment.dto';
import type {
  InvestmentTradeListResponse,
  InvestmentTradeResponse,
} from '@server/dto/trade.dto';
import type {
  InvestmentValuationListResponse,
  InvestmentValuationResponse,
} from '@server/dto/valuation.dto';
import type {
  InvestmentAssetType,
  InvestmentMode,
  TradeSide,
} from '@server/generated/prisma/enums';

export class InvestmentService extends ServiceBase {
  constructor() {
    super('/api/investments');
  }

  async listInvestments(query?: {
    assetTypes?: InvestmentAssetType[];
    modes?: InvestmentMode[];
    currencyIds?: string[];
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<InvestmentListResponse> {
    return this.get<InvestmentListResponse>({
      params: query,
    });
  }

  async getInvestment(investmentId: string): Promise<InvestmentResponse> {
    return this.get<InvestmentResponse>({
      endpoint: investmentId,
    });
  }

  async getInvestmentPosition(
    investmentId: string,
  ): Promise<InvestmentPositionResponse> {
    return this.get<InvestmentPositionResponse>({
      endpoint: `${investmentId}/holdings`,
    });
  }

  async createInvestment(
    data: Omit<InvestmentFormData, 'id'>,
  ): Promise<InvestmentResponse> {
    return this.post<InvestmentResponse>(data);
  }

  async updateInvestment(
    data: InvestmentFormData,
  ): Promise<InvestmentResponse> {
    return this.post<InvestmentResponse>(data);
  }

  async listTrades(
    investmentId: string,
    query?: {
      side?: TradeSide;
      accountIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<InvestmentTradeListResponse> {
    return this.get<InvestmentTradeListResponse>({
      endpoint: `${investmentId}/trades`,
      params: query,
    });
  }

  async createTrade(
    investmentId: string,
    data: InvestmentTradeFormData,
  ): Promise<InvestmentTradeResponse> {
    return this.post<InvestmentTradeResponse>(data, {
      endpoint: `${investmentId}/trades`,
    });
  }

  async listContributions(
    investmentId: string,
    query?: {
      accountIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<InvestmentContributionListResponse> {
    return this.get<InvestmentContributionListResponse>({
      endpoint: `${investmentId}/contributions`,
      params: query,
    });
  }

  async createContribution(
    investmentId: string,
    data: InvestmentContributionFormData,
  ): Promise<InvestmentContributionResponse> {
    return this.post<InvestmentContributionResponse>(data, {
      endpoint: `${investmentId}/contributions`,
    });
  }

  async listValuations(
    investmentId: string,
    query?: {
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<InvestmentValuationListResponse> {
    return this.get<InvestmentValuationListResponse>({
      endpoint: `${investmentId}/valuations`,
      params: query,
    });
  }

  async getLatestValuation(
    investmentId: string,
  ): Promise<InvestmentValuationResponse | null> {
    return this.get<InvestmentValuationResponse | null>({
      endpoint: `${investmentId}/valuations/latest`,
    });
  }

  async upsertValuation(
    investmentId: string,
    data: InvestmentValuationFormData,
  ): Promise<InvestmentValuationResponse> {
    return this.post<InvestmentValuationResponse>(data, {
      endpoint: `${investmentId}/valuations`,
    });
  }
}

export const investmentService = new InvestmentService();
