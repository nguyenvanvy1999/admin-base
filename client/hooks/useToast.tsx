import { notifications } from '@mantine/notifications';
import { Check, Close, Info, Warning } from '@mui/icons-material';

const useToast = () => {
  return {
    showError: (message: string, duration?: number) =>
      notifications.show({
        message,
        color: 'red',
        icon: <Close />,
        autoClose: duration ?? 5000,
      }),
    showSuccess: (message: string, duration?: number) =>
      notifications.show({
        message,
        color: 'teal',
        icon: <Check />,
        autoClose: duration ?? 5000,
      }),
    showWarning: (message: string, duration?: number) =>
      notifications.show({
        message,
        color: 'yellow',
        icon: <Warning />,
        autoClose: duration ?? 5000,
      }),
    showInfo: (message: string, duration?: number) =>
      notifications.show({
        message,
        color: 'blue',
        icon: <Info />,
        autoClose: duration ?? 5000,
      }),
  };
};

export default useToast;
