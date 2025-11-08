import { ACCESS_TOKEN_KEY } from '@client/constants';
import { api } from '@client/libs/api';
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

      const response = await api.api.users.me.get();
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to fetch user',
        );
      }

      const user = response.data as {
        id: string;
        username: string;
        role: string;
      };

      setUser({
        id: user.id,
        username: user.username,
        role: user.role,
      });

      return user;
    },
    enabled: !!localStorage.getItem(ACCESS_TOKEN_KEY),
  });
};
