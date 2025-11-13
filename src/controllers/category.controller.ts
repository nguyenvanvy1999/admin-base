import { Elysia, t } from 'elysia';
import {
  CategoryDeleteResponseDto,
  CategoryDto,
  CategoryListResponseDto,
  ListCategoriesQueryDto,
  UpsertCategoryDto,
} from '../dto/category.dto';
import { authCheck } from '../service/auth/auth.middleware';
import categoryService from '../services/category.service';
import { castToRes, ResWrapper } from '../share';

const CATEGORY_DETAIL = {
  tags: ['Category'],
  security: [{ JwtAuth: [] }],
};

const categoryController = new Elysia().group(
  '/categories',
  {
    detail: {
      tags: ['Category'],
      description:
        'Category management endpoints for creating, reading, updating, and deleting user categories with tree structure support.',
    },
  },
  (group) =>
    group
      .use(categoryService)
      .use(authCheck)
      .get(
        '/',
        async ({ currentUser, query, categoryService }) => {
          return castToRes(
            await categoryService.getAllCategories(currentUser.id, query),
          );
        },
        {
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Get all categories as tree',
            description:
              'Retrieve all categories for the authenticated user organized as a tree structure. Supports filtering by type and including deleted categories.',
          },
          query: ListCategoriesQueryDto,
          response: {
            200: ResWrapper(CategoryListResponseDto),
          },
        },
      )
      .get(
        '/:id',
        async ({ currentUser, params, categoryService }) => {
          return castToRes(
            await categoryService.getCategoryById(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Get category by ID',
            description:
              'Retrieve detailed information about a specific category by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(CategoryDto),
          },
        },
      )
      .post(
        '/',
        async ({ currentUser, body, categoryService }) => {
          return castToRes(
            await categoryService.createCategory(currentUser.id, body),
          );
        },
        {
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Create category',
            description:
              'Create a new category for the authenticated user. Can optionally specify a parent category to create a hierarchical structure.',
          },
          body: UpsertCategoryDto,
          response: {
            200: ResWrapper(CategoryDto),
          },
        },
      )
      .put(
        '/:id',
        async ({ currentUser, params, body, categoryService }) => {
          return castToRes(
            await categoryService.updateCategory(
              currentUser.id,
              params.id,
              body,
            ),
          );
        },
        {
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Update category',
            description:
              'Update an existing category by its ID. Locked categories cannot be updated. Validates parent relationships and prevents circular references.',
          },
          params: t.Object({ id: t.String() }),
          body: UpsertCategoryDto,
          response: {
            200: ResWrapper(CategoryDto),
          },
        },
      )
      .delete(
        '/:id',
        async ({ currentUser, params, categoryService }) => {
          return castToRes(
            await categoryService.deleteCategory(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Delete category',
            description:
              'Soft delete a category by its ID. Locked categories and categories with children cannot be deleted.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(CategoryDeleteResponseDto),
          },
        },
      ),
);

export default categoryController;
