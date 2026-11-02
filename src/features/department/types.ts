export interface DepartmentDto {
  id: number;
  name: string;
  description?: string;
  companyId?: number;
  companyName?: string;
  isActive: boolean;
}
