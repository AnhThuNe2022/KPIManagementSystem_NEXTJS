export enum UserRoleSystem {
  Admin = 1,
  ManagerMid = 2,
  Employee = 3,
  ManagerSenior = 4,
  HR = 5,
  ChairMan = 6,
  DirectorSystem = 7,
  ChiefOfStaff = 8,
  DepartmentHead = 9,
  HRSummary = 10,
  Unknown = 11,
}

export type ReviewRole = UserRoleSystem.ManagerMid | UserRoleSystem.HR;

export interface AuthUser {
  id: string;
  roles: string[];
  username?: string;
  email?: string;
  fullName?: string;
}

export function isAdminRole(roles: string[] | null | undefined): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => {
    const clean = String(role ?? "").trim().toLowerCase();
    return clean === "admin" || clean === String(UserRoleSystem.Admin);
  });
}
