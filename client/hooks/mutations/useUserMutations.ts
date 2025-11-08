import useToast from '@client/hooks/useToast';
import { api } from '@client/libs/api';
import useUserStore from '@client/store/user';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type UpdateProfileData = {
  name?: string;
  baseCurrencyId?: string;
  oldPassword?: string;
  newPassword?: string;
};

export const useUpdateProfileMutation = () => {
  const { setUser } = useUserStore();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await api.api.users.profile.put(data);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async (data) => {
      setUser({
        id: data.id,
        username: data.username,
        name: data.name ?? null,
        role: data.role,
      });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      showSuccess('Profile updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
