export interface DepartmentDto {
  id: number;
  name: string;
  description?: string | null;
  companyId: number;
  companyName?: string | null;
  isActive: boolean;
}

export interface DepartmentDraft {
  id: number;
  name: string;
  description: string;
  companyId: number;
  isActive: boolean;
}
