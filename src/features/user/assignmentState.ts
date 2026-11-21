import { AssignmentType } from "@/design-system/registries";
import type { UserOrganizationDto } from "./types";

let localKeyCounter = 0;

export function createDraftLocalKey(): string {
  localKeyCounter += 1;
  return `draft-${Date.now()}-${localKeyCounter}`;
}

export function getAssignmentKey(item: UserOrganizationDto): string {
  if (item.id && item.id > 0) return `id-${item.id}`;
  return item._localKey ?? `tmp-${item.companyId}-${item.departmentId}-${item.employeeCode ?? ""}`;
}

export function getVisibleAssignments(items: UserOrganizationDto[]): UserOrganizationDto[] {
  return items.filter((item) => !item.isDeleted);
}

export function hasActivePrimaryAssignment(
  items: UserOrganizationDto[],
  excluding?: UserOrganizationDto | null,
): boolean {
  const excludeKey = excluding ? getAssignmentKey(excluding) : null;
  return getVisibleAssignments(items).some(
    (item) =>
      item.assignmentType === AssignmentType.Primary &&
      (excludeKey === null || getAssignmentKey(item) !== excludeKey),
  );
}

export function upsertLocalAssignment(
  items: UserOrganizationDto[],
  incoming: UserOrganizationDto,
): UserOrganizationDto[] {
  const target: UserOrganizationDto =
    incoming.id && incoming.id > 0
      ? { ...incoming }
      : { ...incoming, _localKey: incoming._localKey || createDraftLocalKey() };

  const targetKey = getAssignmentKey(target);
  const idx = items.findIndex((item) => getAssignmentKey(item) === targetKey);
  if (idx === -1) {
    return [...items, target];
  }
  const next = [...items];
  next[idx] = { ...next[idx], ...target };
  return next;
}

export function removeLocalAssignment(
  items: UserOrganizationDto[],
  target: UserOrganizationDto,
): UserOrganizationDto[] {
  // Saved DB records are soft-deleted so upsert sends isDeleted: true
  if (target.id && target.id > 0) {
    return items.map((item) =>
      item.id === target.id ? { ...item, isDeleted: true } : item,
    );
  }
  // Unsaved drafts are removed completely by stable _localKey
  const key = getAssignmentKey(target);
  return items.filter((item) => getAssignmentKey(item) !== key);
}
