import { Drawer, type DrawerProps } from 'antd';

export function AppDrawer(props: DrawerProps) {
  return (
    <Drawer
      destroyOnClose
      maskClosable={false}
      placement={props.placement ?? 'right'}
      width={props.width ?? 480}
      {...props}
    />
  );
}
