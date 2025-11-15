import { ACCESS_TOKEN_KEY } from '@client/constants';
import { userService } from '@client/services';
import useUserStore from '@client/store/user';
import { useQuery } from '@tanstack/react-query';

export const useUserQuery = () => {
  const { setUser } = useUserStore();

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!accessToken) {
        return null;
      }

      const user = await userService.getCurrentUser();

      setUser({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.roleIds && user.roleIds.length > 0 ? 'admin' : 'user',
        isSuperAdmin: user.isSuperAdmin,
        permissions: user.permissions,
      });

      return user;
    },
    enabled: !!localStorage.getItem(ACCESS_TOKEN_KEY),
  });
};
