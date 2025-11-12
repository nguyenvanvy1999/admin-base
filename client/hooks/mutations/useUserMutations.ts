import useToast from '@client/hooks/useToast';
import { put } from '@client/libs/http';
import useUserStore from '@client/store/user';
import type { UpdateProfileResponse } from '@server/dto/user.dto';
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
      return await put<UpdateProfileResponse, UpdateProfileData>(
        '/api/users/profile',
        data,
      );
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
