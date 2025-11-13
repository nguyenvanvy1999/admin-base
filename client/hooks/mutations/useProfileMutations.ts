import { userService } from '@client/services';
import { toast } from '@client/utils/toast';
import type {
  IChangePasswordDto,
  IUpdateProfileDto,
} from '@server/dto/user.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IUpdateProfileDto) => {
      return userService.updateProfile(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success('Profile updated successfully');
    },
  });
};

export const useChangePasswordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IChangePasswordDto) => {
      return userService.changePassword(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success('Password changed successfully');
    },
  });
};
