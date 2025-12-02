import { Empty, type EmptyProps } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface AppEmptyProps extends EmptyProps {
  description?: ReactNode;
  action?: ReactNode;
}

export function AppEmpty({ description, action, ...props }: AppEmptyProps) {
  const { t } = useTranslation();

  return (
    <Empty description={description ?? t('common.empty.noData')} {...props}>
      {action}
    </Empty>
  );
}
