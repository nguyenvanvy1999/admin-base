export function trimFormValues<T extends Record<string, any>>(values: T): T {
  const trimmed = {} as T;

  for (const key in values) {
    const value = values[key];
    if (typeof value === 'string') {
      trimmed[key] = value.trim() as any;
    } else {
      trimmed[key] = value;
    }
  }

  return trimmed;
}

export function emptyToUndefined<T extends Record<string, any>>(values: T): T {
  const processed = {} as T;

  for (const key in values) {
    const value = values[key];
    if (value === '') {
      processed[key] = undefined as any;
    } else {
      processed[key] = value;
    }
  }

  return processed;
}

export function sanitizeFormValues<T extends Record<string, any>>(
  values: T,
): T {
  return emptyToUndefined(trimFormValues(values));
}
