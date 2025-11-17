import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import {
  CategoryDto,
  CategoryListResponseDto,
  ListCategoriesQueryDto,
  UpsertCategoryDto,
} from '../dto/category.dto';
import { ActionResDto, DeleteManyDto } from '../dto/common.dto';
import { categoryService } from '../services/category.service';
import { castToRes, ResWrapper } from '../share';
import { createControllerDetail } from './base/controller-detail.factory';

const CATEGORY_DETAIL = createControllerDetail('Category');

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
      .use(authCheck)
      .get(
        '/',
        async ({ currentUser, query }) => {
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
        async ({ currentUser, params }) => {
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
        async ({ currentUser, body }) => {
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
        async ({ currentUser, params, body }) => {
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
      .post(
        '/delete-many',
        async ({ currentUser, body }) => {
          return castToRes(
            await categoryService.deleteManyCategories(
              currentUser.id,
              body.ids,
            ),
          );
        },
        {
          detail: {
            ...CATEGORY_DETAIL,
            summary: 'Delete many categories',
            description:
              'Permanently delete multiple categories by their IDs. Locked categories and categories with children cannot be deleted. This action cannot be undone.',
          },
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default categoryController;
