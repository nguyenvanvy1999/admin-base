import i18n from '@client/i18n';
import { notifications } from '@mantine/notifications';

type ToastConfig =
  | string
  | {
      i18nKey: string;
      type: 'success' | 'error' | 'info' | 'warning';
      message?: string;
    };

const getMessage = (config: ToastConfig): string => {
  if (typeof config === 'string') {
    return config;
  }
  if (config.message) {
    return config.message;
  }
  const i18nKey = `api.${config.i18nKey}`;
  return i18n.exists(i18nKey) ? i18n.t(i18nKey as any) : config.i18nKey;
};

const toastImpl = {
  success: (config: ToastConfig) => {
    notifications.show({
      message: getMessage(config),
      color: 'green',
      autoClose: 3000,
    });
  },
  error: (config: ToastConfig) => {
    notifications.show({
      message: getMessage(config),
      color: 'red',
      autoClose: 5000,
    });
  },
  info: (config: ToastConfig) => {
    notifications.show({
      message: getMessage(config),
      color: 'blue',
      autoClose: 3000,
    });
  },
  warning: (config: ToastConfig) => {
    notifications.show({
      message: getMessage(config),
      color: 'yellow',
      autoClose: 4000,
    });
  },
};

export const toast = Object.assign(
  (config: {
    i18nKey: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message?: string;
  }) => {
    toastImpl[config.type](config);
  },
  toastImpl,
);
