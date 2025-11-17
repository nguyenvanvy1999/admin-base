import type {
  CategoryListResponse,
  CategoryResponse,
  IListCategoriesQueryDto,
  IUpsertCategoryDto,
} from '@server/dto/category.dto';
import type { ActionRes } from '@server/dto/common.dto';

export interface ICategoryService {
  getCategoryId(userId: string, code: string, type?: string): string;
  getAllCategories(
    userId: string,
    query?: IListCategoriesQueryDto,
  ): Promise<CategoryListResponse>;
  getCategoryById(
    userId: string,
    categoryId: string,
  ): Promise<CategoryResponse>;
  getOrCreateBalanceAdjustmentCategory(
    userId: string,
    type: 'income' | 'expense',
  ): Promise<string>;
  createCategory(
    userId: string,
    data: IUpsertCategoryDto,
  ): Promise<CategoryResponse>;
  updateCategory(
    userId: string,
    categoryId: string,
    data: IUpsertCategoryDto,
  ): Promise<CategoryResponse>;
  deleteManyCategories(userId: string, ids: string[]): Promise<ActionRes>;
  seedDefaultCategories(tx: any, userId: string): Promise<void>;
}
