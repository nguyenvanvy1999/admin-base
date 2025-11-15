import { eventService } from '@client/services/EventService';
import { useQuery } from '@tanstack/react-query';

type ListEventsQuery = {
  search?: string;
  startAtFrom?: string;
  startAtTo?: string;
  endAtFrom?: string;
  endAtTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'startAt' | 'endAt' | 'created';
  sortOrder?: 'asc' | 'desc';
};

export const useEventsQuery = (queryParams?: ListEventsQuery) => {
  return useQuery({
    queryKey: ['events', queryParams],
    queryFn: () => {
      return eventService.listEvents(queryParams);
    },
  });
};

export const useEventsOptionsQuery = () => {
  return useQuery({
    queryKey: ['events-options'],
    queryFn: () => {
      return eventService.listEvents({ limit: 1000 });
    },
  });
};
