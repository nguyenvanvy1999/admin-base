import { Empty, type EmptyProps } from 'antd';
import type { ReactNode } from 'react';

export interface AppEmptyProps extends EmptyProps {
  description?: ReactNode;
  action?: ReactNode;
}

export function AppEmpty({
  description = 'Không có dữ liệu',
  action,
  ...props
}: AppEmptyProps) {
  return (
    <Empty description={description} {...props}>
      {action}
    </Empty>
  );
}
