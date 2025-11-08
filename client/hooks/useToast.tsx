import { notifications } from '@mantine/notifications';
import { AlertTriangle, Check, Info, X } from 'lucide-react';

const useToast = () => {
  return {
    showError: (message: string, duration?: number) =>
      notifications.show({
        message,
        color: 'red',
        icon: <X size={18} />,
        autoClose: duration ?? 5000,
      }),
    showSuccess: (message: string, duration?: number) =>
      notifications.show({
        message,
        color: 'teal',
        icon: <Check size={18} />,
        autoClose: duration ?? 5000,
      }),
    showWarning: (message: string, duration?: number) =>
      notifications.show({
        message,
        color: 'yellow',
        icon: <AlertTriangle size={18} />,
        autoClose: duration ?? 5000,
      }),
    showInfo: (message: string, duration?: number) =>
      notifications.show({
        message,
        color: 'blue',
        icon: <Info size={18} />,
        autoClose: duration ?? 5000,
      }),
  };
};

export default useToast;
