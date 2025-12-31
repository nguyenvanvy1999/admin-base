import { Elysia } from 'elysia';
import { type ILogger, logger } from 'src/config/logger';
import {
  type AppAuthMeta,
  defaultRoles,
  ErrCode,
  type ICurrentUser,
  UnAuthErr,
  type UPermission,
} from 'src/share';

export type Loader<TResource> = (args: {
  params: Record<string, string>;
  query: unknown;
  body: unknown;
}) => Promise<TResource>;

export type PolicyCtx<TResource = unknown> = {
  currentUser: ICurrentUser;
  resource?: TResource;
  params: Record<string, string>;
  query: unknown;
  body: unknown;
  request: Request;
};

export type Predicate<TResource = unknown> = (
  ctx: PolicyCtx<TResource>,
) => boolean | Promise<boolean>;

export type Policy<
  TResource = unknown,
  _TPerm extends UPermission = UPermission,
> = Predicate<TResource> | ComposedPredicate<TResource>;

export type ComposedPredicate<TResource> = Predicate<TResource> & {
  __type: 'allOf' | 'anyOf' | 'notOf' | 'primitive';
};

export interface AuthorizeOptions<TResource> {
  load?: {
    resource?: Loader<TResource>;
  };
  onDeny?: (args: { ctx: PolicyCtx<TResource> }) => void | Promise<void>;
}

export function has<T extends UPermission>(key: T): Predicate<any> {
  return Object.assign(
    (ctx: PolicyCtx): boolean => ctx.currentUser.permissions.includes(key),
    { __type: 'primitive' as const },
  );
}

export function isRole<T extends keyof typeof defaultRoles>(
  role: T,
): Predicate<any> {
  return Object.assign(
    (ctx: PolicyCtx): boolean =>
      ctx.currentUser.roleIds.some((r) => r === defaultRoles[role].id) ?? false,
    { __type: 'primitive' as const },
  );
}

export function isSelf<TResource>(
  selectUserId: (ctx: PolicyCtx<TResource>) => string,
): Predicate<TResource> {
  return Object.assign(
    (ctx: PolicyCtx<TResource>): boolean =>
      selectUserId(ctx) === ctx.currentUser.id,
    { __type: 'primitive' as const },
  );
}

export function resourceAttr<TResource>(
  predicate: (resource: TResource) => boolean,
): Predicate<TResource> {
  return Object.assign(
    (ctx: PolicyCtx<TResource>): boolean =>
      ctx.resource ? predicate(ctx.resource) : false,
    { __type: 'primitive' as const },
  );
}

export function allOf<TResource>(
  ...predicates: Predicate<TResource>[]
): Predicate<TResource> {
  return Object.assign(
    async (ctx: PolicyCtx<TResource>): Promise<boolean> => {
      for (const p of predicates) {
        const ok = await p(ctx);
        if (!ok) return false;
      }
      return true;
    },
    { __type: 'allOf' as const },
  );
}

export function anyOf<TResource>(
  ...predicates: Predicate<TResource>[]
): Predicate<TResource> {
  return Object.assign(
    async (ctx: PolicyCtx<TResource>): Promise<boolean> => {
      for (const p of predicates) {
        if (await p(ctx)) return true;
      }
      return false;
    },
    { __type: 'anyOf' as const },
  );
}

export function notOf<TResource>(
  predicate: Predicate<TResource>,
): Predicate<TResource> {
  return Object.assign(
    async (ctx: PolicyCtx<TResource>): Promise<boolean> =>
      !(await predicate(ctx)),
    { __type: 'notOf' as const },
  );
}

export function authorize<TResource>(
  policy: Policy<TResource>,
  options?: AuthorizeOptions<TResource>,
  loggerInstance: ILogger = logger,
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
          loggerInstance.warning(`Error in onDeny handler: ${error}`);
        }
        throw new UnAuthErr(ErrCode.PermissionDenied);
      }
    });
}
