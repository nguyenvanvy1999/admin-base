import { defaultRoles, type UPermission } from '@server/share';
import type { PolicyCtx, Predicate } from './policy-types';

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
