export interface I18n {
  id: string;
  key: string;
  en: string | null;
  vi: string | null;
}

export interface I18nPaginatedResponse {
  items: I18n[];
  total: number;
}

export interface I18nListParams {
  skip?: number;
  take?: number;
  key?: string;
}

export interface I18nUpsertDto {
  id?: string;
  key: string;
  en: string | null;
  vi: string | null;
}
