export const DEFAULT_LIST_LIMIT = 25;
export const MAX_LIST_LIMIT = 100;

export function resolvePagination(limit?: number, offset?: number): { limit: number; offset: number } {
  return {
    limit: limit ?? DEFAULT_LIST_LIMIT,
    offset: offset ?? 0,
  };
}

export function paginatedResult<T>(items: T[], total: number, limit: number, offset: number) {
  return { items, total, limit, offset, hasMore: offset + items.length < total };
}
