export type ThemeMode = 'light' | 'dark';

export type ColorName =
  | 'primary'
  | 'primary-foreground'
  | 'primary-hover'
  | 'primary-active'
  | 'primary-light'
  | 'primary-dark'
  | 'income'
  | 'income-foreground'
  | 'income-hover'
  | 'income-active'
  | 'income-light'
  | 'income-dark'
  | 'expense'
  | 'expense-foreground'
  | 'expense-hover'
  | 'expense-active'
  | 'expense-light'
  | 'expense-dark'
  | 'background'
  | 'foreground'
  | 'card'
  | 'card-foreground'
  | 'popover'
  | 'popover-foreground'
  | 'secondary'
  | 'secondary-foreground'
  | 'muted'
  | 'muted-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'destructive'
  | 'destructive-foreground'
  | 'border'
  | 'input'
  | 'ring';

export type FontSize =
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl';

export type LineHeight =
  | 'none'
  | 'tight'
  | 'snug'
  | 'normal'
  | 'relaxed'
  | 'loose';

export type FontWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';

export type Spacing =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '8'
  | '10'
  | '12'
  | '16'
  | '20'
  | '24';

export type Radius =
  | 'none'
  | 'sm'
  | 'base'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | 'full';

export type Shadow = 'sm' | 'base' | 'md' | 'lg' | 'xl';

export type Transition = 'fast' | 'base' | 'slow' | 'slower';

export type Easing = 'base' | 'in' | 'out' | 'in-out';

export interface ThemeTokens {
  colors: Record<ColorName, string>;
  fontSizes: Record<FontSize, string>;
  lineHeights: Record<LineHeight, string>;
  fontWeights: Record<FontWeight, number>;
  spacing: Record<Spacing, string>;
  radius: Record<Radius, string>;
  shadows: Record<Shadow, string>;
  transitions: Record<Transition, string>;
  easings: Record<Easing, string>;
}
