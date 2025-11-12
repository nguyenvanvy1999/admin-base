import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  ListTagsQueryDto,
  TagDeleteResponseDto,
  TagDto,
  TagListResponseDto,
  UpsertTagDto,
} from '../dto/tag.dto';
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
        ({ user, body, tagService }) => {
          return tagService.upsertTag(user.id, body);
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
          response: {
            200: TagDto,
          },
        },
      )
      .get(
        '/:id',
        ({ user, params, tagService }) => {
          return tagService.getTag(user.id, params.id);
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
          response: {
            200: TagDto,
          },
        },
      )
      .get(
        '/',
        ({ user, query, tagService }) => {
          return tagService.listTags(user.id, query);
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
          response: {
            200: TagListResponseDto,
          },
        },
      )
      .delete(
        '/:id',
        ({ user, params, tagService }) => {
          return tagService.deleteTag(user.id, params.id);
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
          response: {
            200: TagDeleteResponseDto,
          },
        },
      ),
);

export default tagController;
