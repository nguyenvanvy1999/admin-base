import dayjs, { type Dayjs } from 'dayjs';

export function toIsoStringOrNull(
  value: Dayjs | string | Date | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
      return null;
    }
    return parsed.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  const maybeHasToISOString = value as unknown as {
    toISOString?: () => string;
    toDate?: () => Date;
  };

  if (typeof maybeHasToISOString.toDate === 'function') {
    const asDate = maybeHasToISOString.toDate();
    if (asDate instanceof Date) {
      return asDate.toISOString();
    }
  }

  if (typeof maybeHasToISOString.toISOString === 'function') {
    return maybeHasToISOString.toISOString();
  }

  return null;
}
