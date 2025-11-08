import type { ToastType } from '@client/store/toast';
import useToastStore from '@client/store/toast';

const useToast = () => {
  const { showToast: showToastFromStore } = useToastStore();

  return {
    showError: (message: string, duration?: number) =>
      showToastFromStore(message, 'error', duration),
    showSuccess: (message: string, duration?: number) =>
      showToastFromStore(message, 'success', duration),
    showWarning: (message: string, duration?: number) =>
      showToastFromStore(message, 'warning', duration),
    showInfo: (message: string, duration?: number) =>
      showToastFromStore(message, 'info', duration),
    showToast: (message: string, type?: ToastType, duration?: number) =>
      showToastFromStore(message, type, duration),
  };
};

export default useToast;
