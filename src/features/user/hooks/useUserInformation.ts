"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { userApi } from "../service/userApi";
import { EmployeeInforDto } from "@/types/employee";

export function useUserInfor(userId?: string) {
  const [employee, setEmployee] =
    useState<EmployeeInforDto | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const load = useCallback(
    async () => {
      if (!userId) {
        setEmployee(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const employeeResult =
          await userApi.get(userId);

        setEmployee(employeeResult);
      } catch (error) {
        console.error(
          "Load employee information failed:",
          error
        );

        setEmployee(null);
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    userId: userId ?? null,
    employee,
    isLoading,
    reload: load,
  };
}