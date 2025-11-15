import type { ICurrentUser, UPermission } from '@server/share';

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

export type PermissionKey<
  TDomain extends string = string,
  TAction extends string = string,
> = Extract<UPermission, `${TDomain}.${TAction}`>;
