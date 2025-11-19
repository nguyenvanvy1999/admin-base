import { ACCESS_TOKEN_KEY } from '@client/constants';
import { authService } from '@client/services';
import useUserStore from '@client/store/user';
import { accessTokenRefreshSubject } from '@client/utils/subjects';
import type { ILoginDto } from '@server/dto/user.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

type RegisterData = {
  username: string;
  password: string;
  name?: string;
  baseCurrencyId: string;
};

export const useLoginMutation = () => {
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ILoginDto) => {
      return authService.login(data);
    },
    onSuccess: async (data) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      accessTokenRefreshSubject.next(data.accessToken);
      setUser({
        id: String(data.user.id),
        username: data.user.username,
        name: data.user.name,
        role:
          data.user.roleIds && data.user.roleIds.length > 0 ? 'admin' : 'user',
        isSuperAdmin: data.user.isSuperAdmin,
      });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate('/');
    },
  });
};

export const useRegisterMutation = () => {
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      await authService.register({
        username: data.username,
        password: data.password,
        name: data.name,
        baseCurrencyId: data.baseCurrencyId,
      });

      return authService.login(data);
    },
    onSuccess: async (data) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      accessTokenRefreshSubject.next(data.accessToken);
      setUser({
        id: String(data.user.id),
        username: data.user.username,
        name: data.user.name,
        role:
          data.user.roleIds && data.user.roleIds.length > 0 ? 'admin' : 'user',
        isSuperAdmin: data.user.isSuperAdmin,
      });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate('/');
    },
  });
};
