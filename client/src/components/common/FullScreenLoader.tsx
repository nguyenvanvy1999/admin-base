import { Flex, Spin } from 'antd';

export function FullScreenLoader() {
  return (
    <Flex
      align="center"
      justify="center"
      style={{ width: '100%', minHeight: '60vh' }}
    >
      <Spin size="large" />
    </Flex>
  );
}
