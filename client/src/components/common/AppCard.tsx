import { ProCard, type ProCardProps } from '@ant-design/pro-components';

export interface AppCardProps extends ProCardProps {}

export function AppCard(props: AppCardProps) {
  return <ProCard {...props} />;
}
