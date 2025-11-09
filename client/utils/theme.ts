export const getColorVariable = (colorName: string): string => {
  return `hsl(var(--color-${colorName}))`;
};

export const getPrimaryColor = (): string => getColorVariable('primary');
export const getIncomeColor = (): string => getColorVariable('income');
export const getExpenseColor = (): string => getColorVariable('expense');

export const getColorWithOpacity = (
  colorName: string,
  opacity: number,
): string => {
  return `hsl(var(--color-${colorName}) / ${opacity})`;
};

export const getSpacing = (size: string): string => {
  return `var(--spacing-${size})`;
};

export const getRadius = (size: string): string => {
  return `var(--radius-${size})`;
};

export const getFontSize = (size: string): string => {
  return `var(--font-size-${size})`;
};

export const getLineHeight = (size: string): string => {
  return `var(--line-height-${size})`;
};

export const getFontWeight = (weight: string): string => {
  return `var(--font-weight-${weight})`;
};

export const getShadow = (size: string): string => {
  return `var(--shadow-${size})`;
};

export const getTransition = (type: string): string => {
  return `var(--transition-${type})`;
};

export const getEasing = (type: string): string => {
  return `var(--easing-${type})`;
};
