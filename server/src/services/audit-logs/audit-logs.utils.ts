import type { AuditChangeSet } from './audit-logs.types';

export function computeChanges<
  TPrev extends Record<string, unknown>,
  TNext extends Record<string, unknown>,
>(
  previous: TPrev,
  next: TNext,
  options?: {
    excludeFields?: (keyof TPrev | keyof TNext)[];
    includeFields?: (keyof TPrev | keyof TNext)[];
  },
): AuditChangeSet {
  const changes: AuditChangeSet = {};
  const allKeys = Array.from(
    new Set([...Object.keys(previous), ...Object.keys(next)]),
  );

  const fieldsToCheck = options?.includeFields
    ? (options.includeFields as string[])
    : allKeys;
  const excludeFields = new Set(options?.excludeFields ?? []);

  for (const field of fieldsToCheck) {
    if (excludeFields.has(field)) {
      continue;
    }

    const prevValue = previous[field];
    const nextValue = next[field];

    if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
      changes[field] = {
        previous: prevValue,
        next: nextValue,
      };
    }
  }

  return changes;
}

export function buildUpdateChanges<
  TPrev extends Record<string, unknown>,
  TNext extends Record<string, unknown>,
>(
  previous: TPrev,
  next: TNext,
  options?: {
    excludeFields?: (keyof TPrev | keyof TNext)[];
    includeFields?: (keyof TPrev | keyof TNext)[];
  },
): AuditChangeSet {
  return computeChanges(previous, next, options);
}

export function buildCreateChanges<TNext extends Record<string, unknown>>(
  next: TNext,
  options?: {
    excludeFields?: (keyof TNext)[];
    includeFields?: (keyof TNext)[];
  },
): AuditChangeSet {
  const previous = Object.keys(next).reduce(
    (acc, key) => {
      acc[key] = null;
      return acc;
    },
    {} as Record<string, null>,
  );
  return computeChanges(previous as TNext, next, options);
}

export function buildDeleteChanges<TPrev extends Record<string, unknown>>(
  previous: TPrev,
  options?: {
    excludeFields?: (keyof TPrev)[];
    includeFields?: (keyof TPrev)[];
  },
): AuditChangeSet {
  const next = Object.keys(previous).reduce(
    (acc, key) => {
      acc[key] = null;
      return acc;
    },
    {} as Record<string, null>,
  );
  return computeChanges(previous, next as TPrev, options);
}
