import { organizationApi } from './../service/organizationApi';
"use client";

import { useCallback, useState } from "react";

import {
  UserOrganizationDto,
  AssignmentType
} from "@/types/organization";

export function useAssignments(
  userId: string | null
) {

  const [
    assignments,
    setAssignments
  ] = useState<UserOrganizationDto[]>([]);

  const [
    isLoading,
    setIsLoading
  ] = useState(false);

  const [
    isSaving,
    setIsSaving
  ] = useState(false);

  const loadAssignments =
    useCallback(async () => {

      if (!userId) {
        return;
      }

      try {

        setIsLoading(true);

        const result =
          await organizationApi.getPaged(
            userId
          );

        setAssignments(
          result.items
        );

      } finally {

        setIsLoading(false);
      }

    }, [userId]);

  const addAssignment = (
    assignment: UserOrganizationDto
  ) => {

    setAssignments(prev => [
      ...prev,
      assignment
    ]);
  };

  const updateAssignment = (
    assignment: UserOrganizationDto
  ) => {

    setAssignments(prev =>
      prev.map(item =>
        item.id === assignment.id
          ? assignment
          : item
      )
    );
  };

  const deleteAssignment = (
    item: UserOrganizationDto
  ) => {

    setAssignments(prev => {

      if (item.id) {

        return prev.map(x =>
          x.id === item.id
            ? {
                ...x,
                isDeleted: true
              }
            : x
        );
      }

      return prev.filter(
        x => x !== item
      );
    });
  };

  const saveAssignments =
    async () => {

      if (!userId) {
        return false;
      }

      if (!assignments.length) {
        return true;
      }

      try {

        setIsSaving(true);

        const result =
          await organizationApi.upsert(
            userId,
            assignments
          );

        if (!result.success) {
          return false;
        }

        await loadAssignments();

        return true;

      } finally {

        setIsSaving(false);
      }
    };

  return {
    assignments,
    setAssignments,

    isLoading,
    isSaving,

    loadAssignments,

    addAssignment,
    updateAssignment,
    deleteAssignment,

    saveAssignments
  };
}