import { Skeleton, type SkeletonProps } from 'antd';

export interface AppSkeletonProps extends SkeletonProps {
  rows?: number;
  avatar?: boolean;
  title?: boolean;
}

/**
 * Standardized Skeleton component
 */
export function AppSkeleton({
  rows = 3,
  avatar = false,
  title = true,
  active = true,
  ...props
}: AppSkeletonProps) {
  return (
    <Skeleton
      avatar={avatar ? { shape: 'square' } : false}
      title={title}
      paragraph={{ rows }}
      active={active}
      {...props}
    />
  );
}

/**
 * Table skeleton
 */
export function AppTableSkeleton({
  rows = 5,
  ...props
}: { rows?: number } & SkeletonProps) {
  return (
    <Skeleton
      active
      paragraph={{ rows, width: ['100%', '100%', '80%', '60%', '40%'] }}
      title={false}
      {...props}
    />
  );
}

/**
 * Card skeleton
 */
export function AppCardSkeleton(props?: SkeletonProps) {
  return <AppSkeleton rows={4} avatar={false} title={true} {...props} />;
}
