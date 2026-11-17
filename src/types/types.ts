export interface ApiResponse<T> {
  success: boolean;
  errorCode: string | null;
  message: string | null;
  data: T | null;
}