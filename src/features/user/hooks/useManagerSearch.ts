"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  UserOrganizationDto,
} from "@/types/organization";

import {
  organizationApi,
} from "./../service/organizationApi";

export function useManagerSearch(
  userId: string,
  keyword: string
) {

  const [
    managers,
    setManagers,
  ] = useState<UserOrganizationDto[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const search =
    useCallback(async () => {

      if (!userId) {
        setManagers([]);
        return;
      }

      try {

        setIsLoading(true);
        setError(null);

        const result =
          await organizationApi.searchManagers(
            userId,
            keyword
          );

        setManagers(
          result.items ?? []
        );

      } catch (error) {

        console.error(
          "Search managers failed",
          error
        );

        setManagers([]);

        setError(
          "Không thể tải danh sách quản lý."
        );

      } finally {

        setIsLoading(false);

      }

    }, [
      userId,
      keyword,
    ]);

  useEffect(() => {

    if (!keyword.trim()) {
      setManagers([]);
      return;
    }

    const timer =
      setTimeout(() => {
        search();
      }, 1000);

    return () => {
      clearTimeout(timer);
    };

  }, [
    keyword,
    search,
  ]);

  return {
    managers,
    isLoading,
    error,
  };
}