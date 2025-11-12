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

  listInvestments(query?: {
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

  getInvestment(investmentId: string): Promise<InvestmentResponse> {
    return this.get<InvestmentResponse>({
      endpoint: investmentId,
    });
  }

  getInvestmentPosition(
    investmentId: string,
  ): Promise<InvestmentPositionResponse> {
    return this.get<InvestmentPositionResponse>({
      endpoint: `${investmentId}/holdings`,
    });
  }

  createInvestment(
    data: Omit<InvestmentFormData, 'id'>,
  ): Promise<InvestmentResponse> {
    return this.post<InvestmentResponse>(data);
  }

  updateInvestment(data: InvestmentFormData): Promise<InvestmentResponse> {
    return this.post<InvestmentResponse>(data);
  }

  listTrades(
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

  createTrade(
    investmentId: string,
    data: InvestmentTradeFormData,
  ): Promise<InvestmentTradeResponse> {
    return this.post<InvestmentTradeResponse>(data, {
      endpoint: `${investmentId}/trades`,
    });
  }

  listContributions(
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

  createContribution(
    investmentId: string,
    data: InvestmentContributionFormData,
  ): Promise<InvestmentContributionResponse> {
    return this.post<InvestmentContributionResponse>(data, {
      endpoint: `${investmentId}/contributions`,
    });
  }

  listValuations(
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

  getLatestValuation(
    investmentId: string,
  ): Promise<InvestmentValuationResponse | null> {
    return this.get<InvestmentValuationResponse | null>({
      endpoint: `${investmentId}/valuations/latest`,
    });
  }

  upsertValuation(
    investmentId: string,
    data: InvestmentValuationFormData,
  ): Promise<InvestmentValuationResponse> {
    return this.post<InvestmentValuationResponse>(data, {
      endpoint: `${investmentId}/valuations`,
    });
  }
}

export const investmentService = new InvestmentService();
