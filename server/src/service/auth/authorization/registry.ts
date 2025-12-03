import type { Policy } from './policy-types';

export interface PolicyEntry<TResource> {
  policy: Policy<TResource>;
}

export class PolicyRegistry {
  private readonly entries = new Map<string, PolicyEntry<any>>();

  register<TResource>(key: string, entry: PolicyEntry<TResource>): void {
    this.entries.set(key, entry as PolicyEntry<any>);
  }

  get<TResource>(key: string): PolicyEntry<TResource> | undefined {
    return this.entries.get(key) as PolicyEntry<TResource> | undefined;
  }
}

export const adminPolicyRegistry = new PolicyRegistry();
