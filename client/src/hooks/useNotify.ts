import { App } from 'antd';

export function useNotify() {
  const { notification, message } = App.useApp();

  return {
    notification,
    message,
    success: (content: string) =>
      notification.success({
        title: content,
      }),
    error: (content: string) =>
      notification.error({
        title: content,
      }),
  };
}
