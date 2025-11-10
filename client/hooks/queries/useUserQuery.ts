import { ACCESS_TOKEN_KEY } from '@client/constants';
import { get } from '@client/libs/http';
import useUserStore from '@client/store/user';
import type { CurrentUserResponse } from '@server/src/dto/user.dto';
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

      const user = await get<CurrentUserResponse>('/api/users/me');

      setUser({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      });

      return user;
    },
    enabled: !!localStorage.getItem(ACCESS_TOKEN_KEY),
  });
};
