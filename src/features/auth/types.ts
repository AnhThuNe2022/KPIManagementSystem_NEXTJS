export type LoginCredentials = { username: string; password: string };

export type LoginResponse = { accessToken: string; userId:string; roles: string[] };


export enum UserRoleSystem {
  Admin = 1,
  ManagerMid,
  Employee,
  ManagerSenior,
  HR,
  ChairMan,
  DirectorSystem,
  ChiefOfStaff,
  DepartmentHead,
  HRSummary,
  Unknown,
}


export interface AuthUser {
  id: string;
  roles: string[];
  username?: string;
  email?: string;
  fullName?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  refresh: () => Promise<void>;

  logout: () => Promise<void>;
}
