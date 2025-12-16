import type { LogLevel } from 'src/generated';

export type InternalEventType =
  | 'internal_error'
  | 'rate_limit'
  | 'system_event'
  | 'api_event';

export interface InternalEventPayloadMap {
  internal_error: {
    error: string;
    stack?: string;
    context?: Record<string, unknown>;
  };
  rate_limit: {
    routePath: string;
    identifier: string;
    count: number;
    limit: number;
  };
  system_event: {
    event: string;
    details: Record<string, unknown>;
  };
  api_event: {
    endpoint: string;
    method: string;
    statusCode: number;
    duration?: number;
  };
}

export type InternalEventPayload<T extends InternalEventType> =
  T extends keyof InternalEventPayloadMap
    ? {
        category: 'internal' | 'system';
        eventType: T;
        level: LogLevel;
      } & InternalEventPayloadMap[T]
    : {
        category: 'internal' | 'system';
        eventType: T;
        level: LogLevel;
        detail: Record<string, unknown>;
      };
