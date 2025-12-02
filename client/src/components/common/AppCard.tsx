import { ProCard, type ProCardProps } from '@ant-design/pro-components';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface AppCardProps extends ProCardProps {
  loading?: boolean;
  empty?: boolean;
  emptyText?: ReactNode;
}

export function AppCard({
  loading,
  empty,
  emptyText,
  children,
  ...props
}: AppCardProps) {
  const { t } = useTranslation();

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
          {emptyText ?? t('common.empty.noData')}
        </div>
      ) : (
        children
      )}
    </ProCard>
  );
}
