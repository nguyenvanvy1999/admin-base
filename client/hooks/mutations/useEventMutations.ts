import { eventService } from '@client/services/EventService';
import { toast } from '@client/utils/toast';
import type { IUpsertEventDto } from '@server/dto/event.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUpsertEventDto, 'id'>) => {
      return eventService.createEvent(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['events-options'] });
      toast.success('Event created successfully');
    },
  });
};

export const useUpdateEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IUpsertEventDto) => {
      if (!data.id) {
        throw new Error('Event ID is required for update');
      }

      return eventService.updateEvent(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['event'] });
      await queryClient.invalidateQueries({ queryKey: ['events-options'] });
      toast.success('Event updated successfully');
    },
  });
};

export const useDeleteEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => {
      return eventService.deleteEvent(eventId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['events-options'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Event deleted successfully');
    },
  });
};
