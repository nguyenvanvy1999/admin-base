import { logger } from '@server/configs/logger';
import type { AppAuthMeta } from '@server/share';
import { ErrorCode, throwAppError } from '@server/share';
import { Elysia } from 'elysia';
import type { AuthorizeOptions, Policy, PolicyCtx } from './policy-types';

export function authorize<TResource>(
  policy: Policy<TResource>,
  options?: AuthorizeOptions<TResource>,
) {
  return new Elysia<'', AppAuthMeta>()
    .derive(
      { as: 'scoped' },
      async (req): Promise<Partial<PolicyCtx<TResource>>> => {
        const resource = options?.load?.resource
          ? await options.load.resource({
              params: (req.params as Record<string, string>) ?? {},
              query: req.query ?? {},
              body: req.body ?? {},
            })
          : undefined;
        return { resource } as Partial<PolicyCtx<TResource>>;
      },
    )
    .onBeforeHandle(async (ctx) => {
      const allow = await policy({
        currentUser: ctx.currentUser,
        resource: ctx.resource,
        params: ctx.params ?? {},
        query: ctx.query ?? {},
        body: ctx.body ?? {},
        request: ctx.request,
      } satisfies PolicyCtx<TResource>);
      if (!allow) {
        try {
          await options?.onDeny?.({ ctx });
        } catch (error) {
          logger.warning(`Error in onDeny handler: ${error}`);
        }
        throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
      }
    });
}
