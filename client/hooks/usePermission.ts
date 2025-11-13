import useUserStore from '@client/store/user';

export const usePermission = () => {
  const { hasPermission } = useUserStore();
  return { hasPermission };
};
