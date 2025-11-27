import { PageHeader } from '@client/components/common/PageHeader';
import { Flex, type FlexProps } from 'antd';
import type { ReactNode } from 'react';

export interface AppPageProps extends Omit<FlexProps, 'children'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  breadcrumb?: ReactNode;
  children: ReactNode;
}

/**
 * Page wrapper component with common layout patterns
 */
export function AppPage({
  title,
  subtitle,
  extra,
  breadcrumb,
  children,
  vertical = true,
  gap = 24,
  ...flexProps
}: AppPageProps) {
  return (
    <Flex vertical={vertical} gap={gap} {...flexProps}>
      {(title || subtitle || extra) && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          extra={extra}
          breadcrumb={breadcrumb}
        />
      )}
      {children}
    </Flex>
  );
}
