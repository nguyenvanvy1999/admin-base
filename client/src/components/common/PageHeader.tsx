import type { BreadcrumbProps } from 'antd';
import { Breadcrumb, Flex, Typography } from 'antd';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  breadcrumb?: BreadcrumbProps['items'];
};

export function PageHeader({
  title,
  subtitle,
  extra,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <Flex vertical gap={8} style={{ marginBottom: 24 }}>
      {breadcrumb ? <Breadcrumb items={breadcrumb} /> : null}
      <Flex align="center" justify="space-between">
        <div>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {title}
          </Typography.Title>
          {subtitle ? (
            <Typography.Text type="secondary">{subtitle}</Typography.Text>
          ) : null}
        </div>
        {extra}
      </Flex>
    </Flex>
  );
}
