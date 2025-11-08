export const formatCurrency = (
  value: string | number | null | undefined,
  symbol: string | null = null,
): string => {
  if (value === null || value === undefined || value === '') {
    return `${symbol || ''}0.00`;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return `${symbol || ''}0.00`;
  }

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol || ''}${formatted}`;
};
