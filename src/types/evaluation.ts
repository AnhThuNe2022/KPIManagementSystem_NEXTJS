export interface EvaluationDto {
  id: number;
  period?: string;
  templateName?: string;
  submitDate?: string | null;
  status: string;
  evalPeriodTemplateId: number;
}

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