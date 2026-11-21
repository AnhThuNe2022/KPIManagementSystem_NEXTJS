export interface ApiResponse<T> {
  success?: boolean;
  message?: string | null;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export function unwrapApiData<T>(payload: T | ApiResponse<T> | null | undefined): T | null {
  if (payload === null || payload === undefined) return null;
  if (typeof payload === "object" && "data" in payload && !Array.isArray(payload)) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}
