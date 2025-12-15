import { Flex, Spin } from 'antd';

export type AppLoaderVariant = 'fullscreen' | 'inline';

export interface AppLoaderProps {
  variant?: AppLoaderVariant;
  size?: 'small' | 'default' | 'large';
}

export function AppLoader({
  variant = 'fullscreen',
  size = 'large',
}: AppLoaderProps) {
  if (variant === 'inline') {
    return <Spin size={size} />;
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{ width: '100%', minHeight: '60vh' }}
    >
      <Spin size={size} />
    </Flex>
  );
}

export function FullScreenLoader() {
  return <AppLoader variant="fullscreen" />;
}
