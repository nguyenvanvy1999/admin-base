import { ACCESS_TOKEN_KEY } from '@client/constants';
import useToast from '@client/hooks/useToast';
import { post } from '@client/libs/http';
import useUserStore from '@client/store/user';
import type { LoginResponse, RegisterResponse } from '@server/src/dto/user.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  name?: string;
};

export const useLoginMutation = () => {
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { showError } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      return await post<LoginResponse, LoginData>('/api/users/login', data);
    },
    onSuccess: async (data) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.jwt);
      setUser({
        id: String(data.user.id),
        username: data.user.username,
        name: data.user.name,
        role: data.user.role,
      });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate('/');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useRegisterMutation = () => {
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { showError } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      await post<RegisterResponse, RegisterData>('/api/users/register', {
        username: data.username,
        password: data.password,
        name: data.name,
      });

      return await post<LoginResponse, LoginData>('/api/users/login', data);
    },
    onSuccess: async (data) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.jwt);
      setUser({
        id: String(data.user.id),
        username: data.user.username,
        name: data.user.name,
        role: data.user.role,
      });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate('/');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
