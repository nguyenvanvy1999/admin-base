export interface BaseListParams {
  skip?: number;
  take?: number;
  search?: string;
}

export interface BaseListResponse<T> {
  docs: T[];
  count: number;
}

export interface BaseCursorListParams {
  take: number;
  cursor?: string;
}

export interface BaseCursorListResponse<T> {
  docs: T[];
  hasNext: boolean;
  nextCursor?: string;
}

export interface BaseServiceMethods<
  TData,
  TListParams,
  TDetail,
  TCreateDto,
  TUpdateDto,
> {
  list: (params?: TListParams) => Promise<BaseListResponse<TData>>;
  detail?: (id: string) => Promise<TDetail>;
  create?: (data: TCreateDto) => Promise<void>;
  update?: (id: string, data: TUpdateDto) => Promise<void>;
  upsert?: (data: TCreateDto | TUpdateDto) => Promise<void>;
  delete?: (ids: string[]) => Promise<void>;
}
