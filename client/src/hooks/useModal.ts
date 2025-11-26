import { App } from 'antd';

export function useModal() {
  const { modal } = App.useApp();
  return modal;
}
