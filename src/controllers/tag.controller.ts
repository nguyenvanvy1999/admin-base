import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import { ListTagsQueryDto, UpsertTagDto } from '../dto/tag.dto';
import authMacro from '../macros/auth';
import tagService from '../services/tag.service';

const TAG_DETAIL = {
  tags: ['Tag'],
  security: [{ JwtAuth: [] }],
};

const tagController = new Elysia().group(
  '/tags',
  {
    detail: {
      tags: ['Tag'],
      description:
        'Tag management endpoints for creating, reading, updating, and deleting tags.',
    },
  },
  (group) =>
    group
      .use(tagService)
      .use(authMacro)
      .post(
        '/',
        async ({ user, body, tagService }) => {
          return await tagService.upsertTag(user.id, body);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TAG_DETAIL,
            summary: 'Create or update tag',
            description:
              'Create a new tag or update an existing tag for the authenticated user. If a tag ID is provided, it will update the existing tag; otherwise, it creates a new one.',
          },
          body: UpsertTagDto,
        },
      )
      .get(
        '/:id',
        async ({ user, params, tagService }) => {
          return await tagService.getTag(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TAG_DETAIL,
            summary: 'Get tag by ID',
            description:
              'Retrieve detailed information about a specific tag by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
        },
      )
      .get(
        '/',
        async ({ user, query, tagService }) => {
          return await tagService.listTags(user.id, query);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TAG_DETAIL,
            summary: 'List all tags',
            description:
              'Get a paginated list of all tags belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListTagsQueryDto,
        },
      )
      .delete(
        '/:id',
        async ({ user, params, tagService }) => {
          return await tagService.deleteTag(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TAG_DETAIL,
            summary: 'Delete tag',
            description:
              'Permanently delete a tag by its ID. This action cannot be undone.',
          },
          params: t.Object({ id: t.String() }),
        },
      ),
);

export default tagController;
