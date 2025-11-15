import { ServiceBase } from '@client/libs/ServiceBase';
import type { ActionRes } from '@server/dto/common.dto';
import type {
  EventListResponse,
  EventResponse,
  IUpsertEventDto,
} from '@server/dto/event.dto';

export class EventService extends ServiceBase {
  constructor() {
    super('/api/events');
  }

  listEvents(query?: {
    search?: string;
    startAtFrom?: string;
    startAtTo?: string;
    endAtFrom?: string;
    endAtTo?: string;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'startAt' | 'endAt' | 'created';
    sortOrder?: 'asc' | 'desc';
  }): Promise<EventListResponse> {
    return this.get<EventListResponse>({
      params: query,
    });
  }

  getEvent(eventId: string): Promise<EventResponse> {
    return this.get<EventResponse>({
      endpoint: eventId,
    });
  }

  createEvent(data: Omit<IUpsertEventDto, 'id'>): Promise<EventResponse> {
    return this.post<EventResponse>(data);
  }

  updateEvent(data: IUpsertEventDto): Promise<EventResponse> {
    return this.post<EventResponse>(data);
  }

  deleteManyEvents(ids: string[]): Promise<ActionRes> {
    return this.post<ActionRes>(
      { ids },
      {
        endpoint: 'delete-many',
      },
    );
  }
}

export const eventService = new EventService();
