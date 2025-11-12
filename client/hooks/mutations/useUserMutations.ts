import { userService } from '@client/services';
import useUserStore from '@client/store/user';
import { toast } from '@client/utils/toast';
import type { UpdateProfileRes } from '@server/dto/user.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type UpdateProfileData = {
  name?: string;
  baseCurrencyId?: string;
  oldPassword?: string;
  newPassword?: string;
};

export const useUpdateProfileMutation = () => {
  const { setUser } = useUserStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileData) => {
      return userService.put<UpdateProfileRes>(data, {
        endpoint: 'profile',
      });
    },
    onSuccess: async (data) => {
      setUser({
        id: data.id,
        username: data.username,
        name: data.name ?? null,
        role: data.role,
      });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Profile updated successfully');
    },
  });
};
