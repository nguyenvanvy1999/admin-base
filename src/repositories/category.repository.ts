import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { CategoryType, Prisma } from '@server/generated';
import { CATEGORY_SELECT_MINIMAL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type CategoryRecord = Prisma.CategoryGetPayload<{
  select: typeof CATEGORY_SELECT_MINIMAL;
}>;

export class CategoryRepository extends BaseRepository<
  CategoryRecord,
  typeof CATEGORY_SELECT_MINIMAL
> {
  constructor(db: IDb = prisma) {
    super(db, 'category', CATEGORY_SELECT_MINIMAL);
  }

  /**
   * Find all categories by user ID with full details for tree building
   */
  async findAllByUserIdForTree(
    userId: string,
    types?: CategoryType[],
  ): Promise<any[]> {
    const where: any = { userId };
    if (types && types.length > 0) {
      where.type = { in: types };
    }

    return this.db.category.findMany({
      where,
      select: {
        id: true,
        userId: true,
        type: true,
        name: true,
        parentId: true,
        isLocked: true,
        icon: true,
        color: true,
      },
      orderBy: {
        created: 'asc',
      },
    });
  }

  /**
   * Find category by parent ID
   */
  async findByParentId(parentId: string): Promise<CategoryRecord[]> {
    return this.db.category.findMany({
      where: { parentId },
      select: this.select,
    });
  }

  /**
   * Count children of a category
   */
  async countChildren(categoryId: string): Promise<number> {
    return this.db.category.count({
      where: { parentId: categoryId },
    });
  }
}

export const categoryRepository = new CategoryRepository();
