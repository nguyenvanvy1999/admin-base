import type { AuditChangeSet } from '../types/cud-types';

export function computeChanges<T extends Record<string, unknown>>(
  previous: T,
  next: T,
  options?: {
    excludeFields?: string[];
    includeFields?: string[];
  },
): AuditChangeSet {
  const changes: AuditChangeSet = {};
  const excludeFields = new Set(options?.excludeFields ?? []);
  const includeFields = options?.includeFields
    ? new Set(options.includeFields)
    : null;

  const fieldsToCheck = includeFields
    ? Array.from(includeFields)
    : Object.keys({ ...previous, ...next });

  for (const field of fieldsToCheck) {
    if (excludeFields.has(field)) continue;

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

export function extractEntityDisplay<T extends Record<string, unknown>>(
  entity: T,
  displayFields: (keyof T)[],
): Record<string, unknown> {
  const display: Record<string, unknown> = {};

  for (const field of displayFields) {
    if (field in entity) {
      display[String(field)] = entity[field];
    }
  }

  return display;
}
