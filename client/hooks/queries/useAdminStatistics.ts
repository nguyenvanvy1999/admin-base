import { sessionService, userService } from '@client/services';
import type { IUserStatisticsQueryDto } from '@server/dto/admin/user.dto';
import { useQuery } from '@tanstack/react-query';

export const useUserStatistics = (query?: IUserStatisticsQueryDto) => {
  return useQuery({
    queryKey: ['user-statistics', query],
    queryFn: () => userService.getUserStatistics(query),
  });
};

export const useSessionStatistics = () => {
  return useQuery({
    queryKey: ['session-statistics'],
    queryFn: () => sessionService.getSessionStatistics(),
  });
};
