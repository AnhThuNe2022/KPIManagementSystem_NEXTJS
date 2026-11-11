export interface CompanyDto {
  id: number;
  companyName: string;
  companyCode?: string;
}

export enum EnumCompanyCode {
  DCG = 3,
  BGLS,
}
