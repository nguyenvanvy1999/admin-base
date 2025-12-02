import { Drawer, type DrawerProps } from 'antd';

type DrawerPropsWithoutWidth = Omit<DrawerProps, 'width'>;

export function AppDrawer(props: DrawerPropsWithoutWidth) {
  return (
    <Drawer
      forceRender={false}
      maskClosable={false}
      placement={props.placement ?? 'right'}
      size={props.size ?? 480}
      {...props}
    />
  );
}
