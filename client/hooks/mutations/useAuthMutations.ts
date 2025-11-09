import { ACCESS_TOKEN_KEY } from '@client/constants';
import useToast from '@client/hooks/useToast';
import { api } from '@client/libs/api';
import useUserStore from '@client/store/user';
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

type AuthResponse = {
  user: {
    id: string;
    username: string;
    role: string;
  };
  jwt: string;
};

export const useLoginMutation = () => {
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { showError } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await api.api.users.login.post(data);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async (data) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.jwt);
      setUser({
        id: String(data.user.id),
        username: data.user.username,
        name: null,
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
      const registerResponse = await api.api.users.register.post({
        username: data.username,
        password: data.password,
        name: data.name,
      });
      if (registerResponse.error) {
        throw new Error(
          registerResponse.error.value?.message ?? 'An unknown error occurred',
        );
      }

      const loginResponse = await api.api.users.login.post(data);
      if (loginResponse.error) {
        throw new Error(
          loginResponse.error.value?.message ?? 'An unknown error occurred',
        );
      }

      return loginResponse.data as AuthResponse;
    },
    onSuccess: async (data) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.jwt);
      setUser({
        id: String(data.user.id),
        username: data.user.username,
        name: null,
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
