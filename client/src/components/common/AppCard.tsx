import { ProCard, type ProCardProps } from '@ant-design/pro-components';
import type { ReactNode } from 'react';

export interface AppCardProps extends ProCardProps {
  loading?: boolean;
  empty?: boolean;
  emptyText?: ReactNode;
}

export function AppCard({
  loading,
  empty,
  emptyText = 'Không có dữ liệu',
  children,
  ...props
}: AppCardProps) {
  return (
    <ProCard loading={loading} {...props}>
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
    </ProCard>
  );
}
