type PaginationQuery = {
  skip?: number | null;
  take?: number | null;
};

export const normalizePagination = (query: PaginationQuery) => {
  return {
    skip: query.skip ?? 0,
    take: query.take ?? 10,
  };
};
