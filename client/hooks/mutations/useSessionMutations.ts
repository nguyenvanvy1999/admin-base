import { sessionService } from '@client/services';
import { toast } from '@client/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useRevokeSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      userId,
    }: {
      sessionId: string;
      userId?: string;
    }) => {
      return sessionService.revokeSession(sessionId, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast.success('Session revoked successfully');
    },
  });
};

export const useRevokeManySessionsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionIds,
      userId,
    }: {
      sessionIds: string[];
      userId?: string;
    }) => {
      return sessionService.revokeManySessions(sessionIds, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast.success('Sessions revoked successfully');
    },
  });
};
