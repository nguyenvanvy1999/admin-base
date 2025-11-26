import axios, { AxiosHeaders } from 'axios';

export const http = axios.create({
  baseURL:
    import.meta.env.VITE_APP_API_URL ??
    import.meta.env.VITE_API_URL ??
    window.location.origin,
  timeout: 10_000,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers ?? {});
  headers.setAccept('application/json');
  config.headers = headers;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);
