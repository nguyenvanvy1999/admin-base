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
new Subject<(newToken: boolean) => void>();
new BehaviorSubject<
  | {
      type: 'error' | 'warn';
      code: string;
    }
  | undefined
>(undefined);
