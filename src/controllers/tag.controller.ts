import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import { ActionResDto, DeleteManyDto } from '../dto/common.dto';
import {
  ListTagsQueryDto,
  TagDto,
  TagListResponseDto,
  UpsertTagDto,
} from '../dto/tag.dto';
import { tagService } from '../services/tag.service';
import { castToRes, ResWrapper } from '../share';
import { createControllerDetail } from './base/controller-detail.factory';

const TAG_DETAIL = createControllerDetail('Tag');

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
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body }) => {
          return castToRes(await tagService.upsertTag(currentUser.id, body));
        },
        {
          detail: {
            ...TAG_DETAIL,
            summary: 'Create or update tag',
            description:
              'Create a new tag or update an existing tag for the authenticated user. If a tag ID is provided, it will update the existing tag; otherwise, it creates a new one.',
          },
          body: UpsertTagDto,
          response: {
            200: ResWrapper(TagDto),
          },
        },
      )

      .get(
        '/',
        async ({ currentUser, query }) => {
          return castToRes(await tagService.listTags(currentUser.id, query));
        },
        {
          detail: {
            ...TAG_DETAIL,
            summary: 'List all tags',
            description:
              'Get a paginated list of all tags belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListTagsQueryDto,
          response: {
            200: ResWrapper(TagListResponseDto),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, body }) => {
          return castToRes(
            await tagService.deleteManyTags(currentUser.id, body.ids),
          );
        },
        {
          detail: {
            ...TAG_DETAIL,
            summary: 'Delete many tags',
            description:
              'Permanently delete multiple tags by their IDs. This action cannot be undone.',
          },
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default tagController;
