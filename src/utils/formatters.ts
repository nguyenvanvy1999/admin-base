type DecimalLike = {
  toString(): string;
  toNumber(): number;
};

const hasToNumber = (
  value: unknown,
): value is Pick<DecimalLike, 'toNumber'> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  );
};

const hasToString = (
  value: unknown,
): value is Pick<DecimalLike, 'toString'> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toString' in value &&
    typeof (value as { toString?: unknown }).toString === 'function'
  );
};

export const decimalToString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '0';
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint'
  ) {
    return value.toString();
  }
  if (hasToString(value)) {
    return value.toString();
  }
  return String(value);
};

export const decimalToNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return decimalToString(value);
};

export const decimalToNumber = (value: unknown): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (hasToNumber(value)) {
    return value.toNumber();
  }
  if (hasToString(value)) {
    return Number(value.toString());
  }
  return Number(value);
};

export const decimalToNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return decimalToNumber(value);
};

export const dateToIsoString = (value: Date | string): string => {
  if (typeof value === 'string') {
    return value;
  }
  return value.toISOString();
};

export const dateToNullableIsoString = (
  value: Date | string | null | undefined,
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return dateToIsoString(value);
};
