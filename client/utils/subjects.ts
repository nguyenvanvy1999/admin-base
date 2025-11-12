import { BehaviorSubject, Subject } from 'rxjs';

export const configSubject = new BehaviorSubject<{
  apiUrl: string;
  authApiUrl: string;
  isDev: boolean;
}>({
  apiUrl: '',
  authApiUrl: '',
  isDev: false,
});

export const accessTokenRefreshSubject = new BehaviorSubject<string>('');

export const accessTokenExpiredSubject = new Subject<
  (newToken: boolean) => void
>();

export const messengerSubject = new BehaviorSubject<
  | {
      type: 'error' | 'warn';
      code: string;
    }
  | undefined
>(undefined);
