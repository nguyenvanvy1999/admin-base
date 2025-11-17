import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  BudgetListResponse,
  BudgetPeriodDetailResponse,
  BudgetPeriodListResponse,
  BudgetResponse,
  IBudgetPeriodQueryDto,
  IListBudgetsQueryDto,
  IUpsertBudgetDto,
} from '@server/dto/budget.dto';
import type { ActionRes } from '@server/dto/common.dto';

export class BudgetService extends ServiceBase {
  constructor() {
    super('/api/budgets');
  }

  listBudgets(query?: IListBudgetsQueryDto): Promise<BudgetListResponse> {
    return this.get<BudgetListResponse>({
      params: query,
    });
  }

  getBudget(budgetId: string): Promise<BudgetResponse> {
    return this.get<BudgetResponse>({
      endpoint: budgetId,
    });
  }

  createBudget(data: Omit<IUpsertBudgetDto, 'id'>): Promise<BudgetResponse> {
    return this.post<BudgetResponse>(data);
  }

  updateBudget(data: IUpsertBudgetDto): Promise<BudgetResponse> {
    return this.post<BudgetResponse>(data);
  }

  deleteManyBudgets(ids: string[]): Promise<ActionRes> {
    return this.post<ActionRes>(
      { ids },
      {
        endpoint: 'delete-many',
      },
    );
  }

  getBudgetPeriods(
    budgetId: string,
    query?: IBudgetPeriodQueryDto,
  ): Promise<BudgetPeriodListResponse> {
    return this.get<BudgetPeriodListResponse>({
      endpoint: `${budgetId}/periods`,
      params: query,
    });
  }

  getBudgetPeriodDetail(
    budgetId: string,
    periodId: string,
  ): Promise<BudgetPeriodDetailResponse> {
    return this.get<BudgetPeriodDetailResponse>({
      endpoint: `${budgetId}/periods/${periodId}`,
    });
  }
}

export const budgetService = new BudgetService();
