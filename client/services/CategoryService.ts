import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  CategoryDeleteResponse,
  CategoryListResponse,
  CategoryResponse,
  IUpsertCategoryDto,
} from '@server/dto/category.dto';
import type { CategoryType } from '@server/generated/browser-index';

export class CategoryService extends ServiceBase {
  constructor() {
    super('/api/categories');
  }

  listCategories(query?: {
    type?: CategoryType[];
    includeDeleted?: boolean;
  }): Promise<CategoryListResponse> {
    return this.get<CategoryListResponse>({
      params: query,
    });
  }

  createCategory(
    data: Omit<IUpsertCategoryDto, 'id'>,
  ): Promise<CategoryResponse> {
    return this.post<CategoryResponse>(data);
  }

  updateCategory(data: IUpsertCategoryDto): Promise<CategoryResponse> {
    return this.post<CategoryResponse>(data);
  }

  deleteCategory(categoryId: string): Promise<CategoryDeleteResponse> {
    return this.delete<CategoryDeleteResponse>({
      endpoint: categoryId,
    });
  }
}

export const categoryService = new CategoryService();
