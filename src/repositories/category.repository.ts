import { prisma } from '@server/configs/db';
import type { CategoryType, Prisma } from '@server/generated';
import { CATEGORY_SELECT_MINIMAL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type CategoryRecord = Prisma.CategoryGetPayload<{
  select: typeof CATEGORY_SELECT_MINIMAL;
}>;

// This is a more detailed type for the tree structure
type CategoryTreeRecord = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    userId: true;
    type: true;
    name: true;
    parentId: true;
    isLocked: true;
    icon: true;
    color: true;
  };
}>;

export class CategoryRepository extends BaseRepository<
  typeof prisma.category,
  CategoryRecord,
  typeof CATEGORY_SELECT_MINIMAL
> {
  constructor() {
    super(prisma.category, CATEGORY_SELECT_MINIMAL);
  }

  /**
   * Find all categories by user ID with full details for tree building
   */
  async findAllByUserIdForTree(
    userId: string,
    types?: CategoryType[],
  ): Promise<CategoryTreeRecord[]> {
    const where: any = { userId };
    if (types && types.length > 0) {
      where.type = { in: types };
    }

    return prisma.category.findMany({
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
   * Count children of a category
   */
  async countChildren(categoryId: string): Promise<number> {
    return prisma.category.count({
      where: { parentId: categoryId },
    });
  }
}

export const categoryRepository = new CategoryRepository();
