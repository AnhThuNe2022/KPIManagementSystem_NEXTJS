export interface PagedRequest {
  page: number;
  pageSize: number;
  filters?: Record<string, string | undefined>;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}


export interface FilterString {
  filters: Record<string, string | null>;
}
