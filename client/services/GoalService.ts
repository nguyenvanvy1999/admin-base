import { ServiceBase } from '@client/libs/ServiceBase';
import type { ActionRes } from '@server/dto/common.dto';
import type {
  GoalDetailResponse,
  GoalListResponse,
  GoalResponse,
  IListGoalsQueryDto,
  IUpsertGoalDto,
} from '@server/dto/goal.dto';

export class GoalService extends ServiceBase {
  constructor() {
    super('/api/goals');
  }

  listGoals(query?: IListGoalsQueryDto): Promise<GoalListResponse> {
    return this.get<GoalListResponse>({
      params: query,
    });
  }

  getGoal(goalId: string): Promise<GoalResponse> {
    return this.get<GoalResponse>({
      endpoint: goalId,
    });
  }

  getGoalDetail(goalId: string): Promise<GoalDetailResponse> {
    return this.get<GoalDetailResponse>({
      endpoint: goalId,
    });
  }

  createGoal(data: Omit<IUpsertGoalDto, 'id'>): Promise<GoalResponse> {
    return this.post<GoalResponse>(data);
  }

  updateGoal(data: IUpsertGoalDto): Promise<GoalResponse> {
    return this.post<GoalResponse>(data);
  }

  deleteManyGoals(ids: string[]): Promise<ActionRes> {
    return this.post<ActionRes>(
      { ids },
      {
        endpoint: 'delete-many',
      },
    );
  }
}

export const goalService = new GoalService();
