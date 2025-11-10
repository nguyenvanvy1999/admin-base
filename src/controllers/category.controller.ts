import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  CategoryDeleteResponseDto,
  CategoryDto,
  CategoryListResponseDto,
  ListCategoriesQueryDto,
  UpsertCategoryDto,
} from '../dto/category.dto';
import authMacro from '../macros/auth';
import categoryService from '../services/category.service';

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
      .use(authMacro)
      .get(
        '/',
        async ({ user, query, categoryService }) => {
          return await categoryService.getAllCategories(user.id, query);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Get all categories as tree',
            description:
              'Retrieve all categories for the authenticated user organized as a tree structure. Supports filtering by type and including deleted categories.',
          },
          query: ListCategoriesQueryDto,
          response: {
            200: CategoryListResponseDto,
          },
        },
      )
      .get(
        '/:id',
        async ({ user, params, categoryService }) => {
          return await categoryService.getCategoryById(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Get category by ID',
            description:
              'Retrieve detailed information about a specific category by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: CategoryDto,
          },
        },
      )
      .post(
        '/',
        async ({ user, body, categoryService }) => {
          return await categoryService.createCategory(user.id, body);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Create category',
            description:
              'Create a new category for the authenticated user. Can optionally specify a parent category to create a hierarchical structure.',
          },
          body: UpsertCategoryDto,
          response: {
            200: CategoryDto,
          },
        },
      )
      .put(
        '/:id',
        async ({ user, params, body, categoryService }) => {
          return await categoryService.updateCategory(user.id, params.id, body);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Update category',
            description:
              'Update an existing category by its ID. Locked categories cannot be updated. Validates parent relationships and prevents circular references.',
          },
          params: t.Object({ id: t.String() }),
          body: UpsertCategoryDto,
          response: {
            200: CategoryDto,
          },
        },
      )
      .delete(
        '/:id',
        async ({ user, params, categoryService }) => {
          return await categoryService.deleteCategory(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Delete category',
            description:
              'Soft delete a category by its ID. Locked categories and categories with children cannot be deleted.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: CategoryDeleteResponseDto,
          },
        },
      ),
);

export default categoryController;
