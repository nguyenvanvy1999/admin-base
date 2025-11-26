import { App } from 'antd';

export function useNotify() {
  const { notification, message } = App.useApp();

  return {
    notification,
    message,
    success: (content: string) =>
      notification.success({
        message: content,
      }),
  };
}
