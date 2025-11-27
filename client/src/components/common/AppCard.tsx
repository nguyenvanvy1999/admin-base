import { Card, type CardProps } from 'antd';
import type { ReactNode } from 'react';

export interface AppCardProps extends CardProps {
  loading?: boolean;
  empty?: boolean;
  emptyText?: ReactNode;
}

/**
 * Standardized Card component with common patterns
 */
export function AppCard({
  loading,
  empty,
  emptyText = 'Không có dữ liệu',
  children,
  ...props
}: AppCardProps) {
  return (
    <Card loading={loading} {...props}>
      {empty ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            color: 'rgba(0, 0, 0, 0.45)',
          }}
        >
          {emptyText}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
