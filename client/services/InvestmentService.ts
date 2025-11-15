import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  ICreateInvestmentContributionDto,
  InvestmentContributionListResponse,
  InvestmentContributionResponse,
} from '@server/dto/contribution.dto';
import type {
  InvestmentListResponse,
  InvestmentPositionResponse,
  InvestmentResponse,
  IUpsertInvestmentDto,
} from '@server/dto/investment.dto';
import type {
  ICreateInvestmentTradeDto,
  InvestmentTradeListResponse,
  InvestmentTradeResponse,
} from '@server/dto/trade.dto';
import type {
  InvestmentValuationListResponse,
  InvestmentValuationResponse,
  IUpsertInvestmentValuationDto,
} from '@server/dto/valuation.dto';
import type {
  InvestmentAssetType,
  InvestmentMode,
  TradeSide,
} from '@server/generated';

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
    data: Omit<IUpsertInvestmentDto, 'id'>,
  ): Promise<InvestmentResponse> {
    return this.post<InvestmentResponse>(data);
  }

  updateInvestment(data: IUpsertInvestmentDto): Promise<InvestmentResponse> {
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
    data: ICreateInvestmentTradeDto,
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
    data: ICreateInvestmentContributionDto,
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
    data: IUpsertInvestmentValuationDto,
  ): Promise<InvestmentValuationResponse> {
    return this.post<InvestmentValuationResponse>(data, {
      endpoint: `${investmentId}/valuations`,
    });
  }

  deleteInvestment(
    investmentId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>({
      endpoint: investmentId,
    });
  }

  deleteTrade(
    investmentId: string,
    tradeId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>({
      endpoint: `${investmentId}/trades/${tradeId}`,
    });
  }

  deleteContribution(
    investmentId: string,
    contributionId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>({
      endpoint: `${investmentId}/contributions/${contributionId}`,
    });
  }

  deleteValuation(
    investmentId: string,
    valuationId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>({
      endpoint: `${investmentId}/valuations/${valuationId}`,
    });
  }
}

export const investmentService = new InvestmentService();
