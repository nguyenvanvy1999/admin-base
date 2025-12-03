import {
  PageContainer,
  type PageContainerProps,
} from '@ant-design/pro-components';
import { Flex } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

type PageHeaderConfig = NonNullable<PageContainerProps['header']>;

export interface AppPageProps
  extends Omit<PageContainerProps, 'header' | 'breadcrumb'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  breadcrumb?: PageHeaderConfig['breadcrumb'];
  gap?: number;
  children: ReactNode;
  header?: PageHeaderConfig;
  childrenContentStyle?: CSSProperties;
}

export function AppPage({
  title,
  subtitle,
  extra,
  breadcrumb,
  gap = 24,
  children,
  header,
  childrenContentStyle,
  ...pageProps
}: AppPageProps) {
  const computedHeader: PageContainerProps['header'] = header
    ? {
        ...header,
        title: header.title ?? title ?? undefined,
        breadcrumb: header.breadcrumb ?? breadcrumb ?? undefined,
        extra: header.extra ?? extra ?? undefined,
      }
    : {
        title: title ?? undefined,
        breadcrumb: breadcrumb ?? undefined,
        extra: extra ?? undefined,
      };

  return (
    <PageContainer
      ghost
      header={computedHeader}
      childrenContentStyle={
        childrenContentStyle ?? {
          paddingBlock: 24,
          paddingInline: 0,
        }
      }
      {...pageProps}
    >
      {gap ? (
        <Flex vertical gap={gap}>
          {children}
        </Flex>
      ) : (
        children
      )}
    </PageContainer>
  );
}
