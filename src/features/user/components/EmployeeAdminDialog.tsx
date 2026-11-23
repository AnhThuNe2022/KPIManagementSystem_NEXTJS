"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Check,
  KeyRound,
  Layers,
  Lock,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UserCog,
  X,
} from "lucide-react";
import {
  AppButton,
  AppForm,
  AppIconButton,
  AppMultiSelect,
  AppPasswordInput,
  AppSelect,
  AppTabs,
  AppTextInput,
  AssignmentTypeBadge,
  FormDialog,
  InlineErrorBanner,
  LoadingOverlay,
  useAppToast,
  type SelectOption,
} from "@/components/ds";
import { AssignmentType, ConditionStatus } from "@/design-system/registries";
import type { CompanyDto } from "@/features/company/types";
import { conditionAssignmentApi } from "@/features/condition-assignments/services/conditionAssignmentApi";
import type { ConditionAssignmentDto } from "@/features/condition-assignments/types";
import { getErrorMessage, isAbortError } from "@/lib/http/request";
import { userApi } from "../services/userApi";
import {
  userOrganizationApi,
  type UserOrganizationUpsertItem,
} from "../services/userOrganizationApi";
import {
  JOB_POSITION_SCREEN_OPTIONS,
  JobPositionEnumScreen,
  type EmployeeListItemDto,
  type JobPosition,
  type RoleOption,
  type UserOrganizationDto,
} from "../types";
import { AssignmentFormDialog } from "./AssignmentFormDialog";

interface Props {
  isOpen: boolean;
  employee: EmployeeListItemDto | null;
  companies: CompanyDto[];
  jobs: JobPosition[];
  roles: Array<RoleOption & { label: string }>;
  onClose: () => void;
  onSaved: () => void;
}

interface ProfileForm {
  fullName: string;
  userName: string;
  email: string;
  systemCode: string;
  password: string;
  jobPositionId: string;
  screenJobId: string;
  roles: string[];
}

interface HrOption {
  id: string;
  name: string;
  assignmentId?: number;
}

type AdminTab = "info" | "password" | "assignments";

const EMPLOYEE_MANAGER_ID = String(JobPositionEnumScreen.EmployeeManager);
const DEFAULT_ROLE_SET = new Set(["employee", "manager", "director"]);
const ROLES_BY_JOB_ID: Record<string, string[]> = {
  [String(JobPositionEnumScreen.Employee)]: ["Employee"],
  [String(JobPositionEnumScreen.ManagerMid)]: ["Manager"],
  [String(JobPositionEnumScreen.ManagerSenior)]: ["Director"],
  [EMPLOYEE_MANAGER_ID]: ["Manager", "Employee"],
};

function syncJobAndRoles(screenJobId: string, currentRoles: string[]) {
  const preserved = currentRoles.filter((role) => !DEFAULT_ROLE_SET.has(role.toLowerCase()));
  const added = ROLES_BY_JOB_ID[screenJobId] ?? [];
  return {
    screenJobId,
    jobPositionId:
      screenJobId === EMPLOYEE_MANAGER_ID ? String(JobPositionEnumScreen.Employee) : screenJobId,
    roles: [...preserved, ...added],
  };
}

function toProfileForm(employee: EmployeeListItemDto | null): ProfileForm {
  const jobId = employee?.jobPositionId ?? employee?.jobPosition?.id;
  const jobPositionId = jobId != null ? String(jobId) : "";
  const roles = employee?.roles ?? [];
  const lowerRoles = new Set(roles.map((role) => role.toLowerCase()));
  const screenJobId =
    jobPositionId === String(JobPositionEnumScreen.Employee) &&
    lowerRoles.has("employee") &&
    lowerRoles.has("manager")
      ? EMPLOYEE_MANAGER_ID
      : jobPositionId;

  return {
    fullName: employee?.fullName ?? "",
    userName: employee?.userName ?? "",
    email: employee?.email ?? "",
    systemCode: employee?.systemCode ?? "",
    password: "",
    jobPositionId,
    screenJobId,
    roles,
  };
}

function sameItems(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, idx) => value === right[idx]);
}

function todayStartOfDayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T00:00:00`;
}

function validateProfile(form: ProfileForm, creating: boolean): string | null {
  if (!form.fullName.trim()) return "Vui lòng nhập họ tên.";
  if (!form.userName.trim()) return "Vui lòng nhập tên đăng nhập.";
  const email = form.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Địa chỉ email không đúng định dạng.";
  }
  if (!form.systemCode.trim()) return "Vui lòng nhập mã hệ thống.";
  if (creating && !form.password) return "Vui lòng nhập mật khẩu ban đầu.";
  if (!Number(form.jobPositionId)) return "Vui lòng chọn loại biểu mẫu / nhóm chức vụ.";
  return null;
}

function dedupeAssignmentHrs(rows: ConditionAssignmentDto[]): HrOption[] {
  const map = new Map<string, HrOption>();
  for (const row of rows) {
    const userId = (row.userId ?? "").trim();
    if (!userId || map.has(userId)) continue;
    const fullName = (row.fullName ?? "").trim() || userId;
    const code = (row.systemCodeUser ?? "").trim();
    const parsedId = Number(row.id);
    map.set(userId, {
      id: userId,
      name: code ? `${fullName} (${code})` : fullName,
      assignmentId: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : undefined,
    });
  }
  return Array.from(map.values());
}

export function EmployeeAdminDialog({
  isOpen,
  employee,
  companies,
  jobs,
  roles,
  onClose,
  onSaved,
}: Props) {
  const showToast = useAppToast();
  const creating = employee === null;
  const employeeId = employee?.userId || employee?.id || "";

  const [tab, setTab] = useState<AdminTab>("info");
  const [detail, setDetail] = useState<EmployeeListItemDto | null>(employee);
  const [baseline, setBaseline] = useState<ProfileForm>(() => toProfileForm(employee));
  const [profile, setProfile] = useState<ProfileForm>(() => toProfileForm(employee));

  // Admin password reset fields (inline inside single FormDialog to avoid nested <form>)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Assignments
  const [assignments, setAssignments] = useState<UserOrganizationDto[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(!creating);
  const [assignmentsChanged, setAssignmentsChanged] = useState(false);
  const [draftAssignment, setDraftAssignment] = useState<{
    index: number;
    value: UserOrganizationDto;
  } | null>(null);

  // Responsible HR 3-API state
  const [selectableHrs, setSelectableHrs] = useState<HrOption[]>([]);
  const [unitDefaultHrs, setUnitDefaultHrs] = useState<HrOption[]>([]);
  const [previousHr, setPreviousHr] = useState<{ sourceType: number; userIds: string[] } | null>(
    creating ? { sourceType: 1, userIds: [] } : null,
  );
  const [hrBaselineIds, setHrBaselineIds] = useState<string[]>([]);
  const [selectedHrIds, setSelectedHrIds] = useState<string[]>([]);
  const [hrLoading, setHrLoading] = useState(true);
  const [hrUnitLoading, setHrUnitLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever dialog opens for a new employee
  useEffect(() => {
    if (!isOpen) return;
    setTab("info");
    setDetail(employee);
    const initial = toProfileForm(employee);
    setBaseline(initial);
    setProfile(initial);
    setNewPassword("");
    setConfirmPassword("");
    setAssignments([]);
    setAssignmentsLoading(!creating);
    setAssignmentsChanged(false);
    setDraftAssignment(null);
    setSelectableHrs([]);
    setUnitDefaultHrs([]);
    setPreviousHr(creating ? { sourceType: 1, userIds: [] } : null);
    setHrBaselineIds([]);
    setSelectedHrIds([]);
    setHrLoading(true);
    setHrUnitLoading(false);
    setError(null);
  }, [creating, employee, isOpen]);

  // API 1 (selectable HRs) & API 3 (previous responsible HR on edit)
  useEffect(() => {
    if (!isOpen) return;
    const ctrl = new AbortController();
    setHrLoading(true);

    const selectablePromise = conditionAssignmentApi.getAll(
      {
        statusconditions: `${ConditionStatus.ByUnitHRCompile};${ConditionStatus.ByUnitHRCompileHistory}`,
        isactive: "true",
        scopevalue: "Company",
        usercurrent: "1",
      },
      ctrl.signal,
    );

    const previousPromise =
      !creating && employeeId
        ? conditionAssignmentApi.getResponsibleHr(employeeId, ctrl.signal)
        : Promise.resolve(null);

    Promise.allSettled([selectablePromise, previousPromise]).then(([selectableRes, previousRes]) => {
      if (ctrl.signal.aborted) return;
      if (selectableRes.status === "fulfilled") {
        setSelectableHrs(dedupeAssignmentHrs(selectableRes.value));
      }
      if (!creating) {
        const res = previousRes.status === "fulfilled" ? previousRes.value : null;
        const userIds = Array.from(
          new Set((res?.users ?? []).map((u) => u.id.trim()).filter(Boolean)),
        );
        setPreviousHr({ sourceType: res?.assignmentSourceType ?? 1, userIds });
      }
      setHrLoading(false);
    });

    return () => ctrl.abort();
  }, [creating, employeeId, isOpen]);

  // Load full profile + organizations on edit
  useEffect(() => {
    if (!isOpen || creating || !employeeId) return;
    const ctrl = new AbortController();

    userApi
      .get(employeeId, ctrl.signal)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        const merged: EmployeeListItemDto = { ...employee, ...data };
        const next = toProfileForm(merged);
        setDetail(merged);
        setBaseline(next);
        setProfile(next);
      })
      .catch((cause) => {
        if (!isAbortError(cause) && !ctrl.signal.aborted) {
          setError(getErrorMessage(cause, "Chưa tải được thông tin chi tiết nhân viên."));
        }
      });

    userOrganizationApi
      .getPaged(employeeId, ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted) setAssignments(data.items ?? []);
      })
      .catch((cause) => {
        if (!isAbortError(cause) && !ctrl.signal.aborted) {
          setError(getErrorMessage(cause, "Chưa tải được đơn vị công tác."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setAssignmentsLoading(false);
      });

    return () => ctrl.abort();
  }, [creating, employee, employeeId, isOpen]);

  const primaryAssignment = useMemo(
    () =>
      assignments.find((row) => !row.isDeleted && row.assignmentType === AssignmentType.Primary),
    [assignments],
  );

  const unitPairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: Array<{ companyId: number; departmentId: number }> = [];
    for (const row of assignments) {
      if (row.isDeleted || !row.companyId || !row.departmentId) continue;
      const key = `${row.companyId}:${row.departmentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ companyId: row.companyId, departmentId: row.departmentId });
    }
    if (pairs.length === 0 && detail?.companyId && detail?.departmentId) {
      pairs.push({ companyId: detail.companyId, departmentId: detail.departmentId });
    }
    return pairs;
  }, [assignments, detail?.companyId, detail?.departmentId]);

  const unitPairsKey = unitPairs.map((pair) => `${pair.companyId}:${pair.departmentId}`).join("|");

  // API 2: Default HRs by unit companyId + departmentId
  useEffect(() => {
    if (!isOpen) return;
    if (unitPairs.length === 0) {
      setUnitDefaultHrs([]);
      setHrUnitLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setHrUnitLoading(true);
    Promise.all(
      unitPairs.map((pair) =>
        conditionAssignmentApi.getAll(
          {
            statuscondition: ConditionStatus.ByUnitHR,
            isactive: "true",
            scope: "true",
            companyid: String(pair.companyId),
            departmentid: String(pair.departmentId),
          },
          ctrl.signal,
        ),
      ),
    )
      .then((results) => {
        if (!ctrl.signal.aborted) {
          setUnitDefaultHrs(dedupeAssignmentHrs(results.flat()));
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setUnitDefaultHrs([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setHrUnitLoading(false);
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, unitPairsKey]);

  const hrOptions = useMemo(() => {
    const map = new Map<string, HrOption>();
    for (const hr of unitDefaultHrs) map.set(hr.id, hr);
    for (const hr of selectableHrs) {
      if (!map.has(hr.id)) map.set(hr.id, hr);
    }
    return Array.from(map.values());
  }, [unitDefaultHrs, selectableHrs]);

  // Sync baseline & selected HRs when unit defaults / responsible-hr / selectable HRs settle
  useEffect(() => {
    if (!isOpen || hrLoading || hrUnitLoading) return;
    const unitIds = unitDefaultHrs.map((hr) => hr.id);
    const selectableSet = new Set(selectableHrs.map((hr) => hr.id));
    const unitInSelectable =
      selectableSet.size > 0 ? unitIds.filter((uid) => selectableSet.has(uid)) : unitIds;
    const defaultIds = unitInSelectable.length > 0 ? unitInSelectable : unitIds;
    const validOptionSet = new Set(hrOptions.map((hr) => hr.id));

    let nextIds = defaultIds;
    if (!creating && !assignmentsChanged && previousHr) {
      if (previousHr.sourceType === 2) {
        nextIds = previousHr.userIds.filter((uid) => validOptionSet.has(uid));
      } else if (previousHr.userIds.length > 0) {
        const defaultSet = new Set(defaultIds);
        const validPrevious = previousHr.userIds.filter((uid) => defaultSet.has(uid));
        nextIds = validPrevious.length > 0 ? validPrevious : defaultIds;
      }
    }

    setHrBaselineIds(nextIds);
    setSelectedHrIds(nextIds);
  }, [
    assignmentsChanged,
    creating,
    hrLoading,
    hrOptions,
    hrUnitLoading,
    isOpen,
    previousHr,
    selectableHrs,
    unitDefaultHrs,
  ]);

  const roleSelectOptions = useMemo<SelectOption[]>(() => {
    const base = roles.map((r) => ({ value: r.name, label: r.label }));
    const extras = profile.roles
      .filter((val) => !roles.some((r) => r.name === val))
      .map((val) => ({ value: val, label: val }));
    return [...base, ...extras];
  }, [profile.roles, roles]);

  const hrSelectOptions = useMemo<SelectOption[]>(
    () => hrOptions.map((hr) => ({ value: hr.id, label: hr.name })),
    [hrOptions],
  );

  const selectedHrLabels = useMemo(() => {
    const map = new Map(hrOptions.map((hr) => [hr.id, hr.name]));
    return selectedHrIds.map((uid) => ({ id: uid, name: map.get(uid) ?? uid }));
  }, [hrOptions, selectedHrIds]);

  const strengthChecks = useMemo(
    () => [
      { label: "Từ 8 ký tự trở lên", passed: newPassword.length >= 8 },
      { label: "Có chữ in hoa (A–Z)", passed: /[A-Z]/.test(newPassword) },
      { label: "Có chữ số (0–9)", passed: /\d/.test(newPassword) },
      { label: "Có ký tự đặc biệt", passed: /[^A-Za-z0-9]/.test(newPassword) },
    ],
    [newPassword],
  );
  const strengthScore = strengthChecks.filter((c) => c.passed).length;

  const visibleAssignments = assignments.filter((row) => !row.isDeleted);
  const hasPrimaryAssignment = visibleAssignments.some(
    (row) => row.assignmentType === AssignmentType.Primary,
  );

  const profileDirty =
    profile.fullName.trim() !== baseline.fullName.trim() ||
    profile.userName.trim() !== baseline.userName.trim() ||
    profile.email.trim() !== baseline.email.trim() ||
    profile.systemCode.trim() !== baseline.systemCode.trim() ||
    profile.jobPositionId !== baseline.jobPositionId ||
    !sameItems(profile.roles, baseline.roles) ||
    (creating && Boolean(profile.password));
  const hrDirty = !sameItems(selectedHrIds, hrBaselineIds);
  const passwordDirty = Boolean(newPassword || confirmPassword);

  const selectedConditionAssignmentIds = selectedHrIds
    .map((uid) => hrOptions.find((hr) => hr.id === uid)?.assignmentId)
    .filter((cid): cid is number => cid != null);

  const patchProfile = (fields: Partial<ProfileForm>) => {
    setError(null);
    setProfile((prev) => ({ ...prev, ...fields }));
  };

  const handleAddAssignment = () => {
    const selectedJob = jobs.find((item) => String(item.id) === profile.jobPositionId);
    setDraftAssignment({
      index: assignments.length,
      value: {
        _localKey: `draft-${Date.now()}-${assignments.length}`,
        userId: employeeId,
        userName: profile.fullName.trim(),
        systemCode: profile.systemCode.trim(),
        employeeCode: detail?.employeeCode ?? "",
        companyId: 0,
        departmentId: 0,
        assignmentType: hasPrimaryAssignment
          ? AssignmentType.Concurrent
          : AssignmentType.Primary,
        jobPositionId: selectedJob?.id ?? detail?.jobPositionId,
        jobPositionName: selectedJob?.name ?? detail?.jobPosition?.name,
        startDate: todayStartOfDayIso(),
        endDate: null,
        isActive: true,
        isDeleted: false,
      },
    });
  };

  const handleSaveDraftAssignment = (value: UserOrganizationDto) => {
    const index = draftAssignment?.index ?? assignments.length;
    setAssignments((rows) =>
      index === rows.length ? [...rows, value] : rows.map((row, i) => (i === index ? value : row)),
    );
    setDraftAssignment(null);
    setAssignmentsChanged(true);
    setError(null);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments((rows) =>
      rows.flatMap((row, i) =>
        i !== index ? [row] : row.id == null ? [] : [{ ...row, isDeleted: true }],
      ),
    );
    setAssignmentsChanged(true);
  };

  const saveAssignmentsToServer = async (targetUserId: string) => {
    const selectedJob = jobs.find((item) => String(item.id) === profile.jobPositionId);
    const fallbackStartDate = todayStartOfDayIso();

    const payload: UserOrganizationUpsertItem[] = assignments.map((row) => {
      const jobPositionId = creating
        ? Number(profile.jobPositionId)
        : (row.jobPositionId ?? Number(profile.jobPositionId));
      const jobPositionName = creating
        ? selectedJob?.name
        : (row.jobPositionName ?? selectedJob?.name);

      return {
        id: row.id ?? null,
        userId: targetUserId,
        systemCode: (creating ? profile.systemCode : (row.systemCode ?? profile.systemCode)).trim(),
        employeeCode: (row.employeeCode ?? "").trim(),
        userName: (creating ? profile.fullName : (row.userName ?? profile.fullName)).trim(),
        companyId: row.companyId,
        companyName: row.companyName ?? "",
        departmentId: row.departmentId,
        departmentName: row.departmentName ?? "",
        jobPositionId,
        jobPositionName,
        jobTitle: (row.jobTitle ?? "").trim(),
        assignmentType: row.assignmentType,
        isActive: row.isActive ?? true,
        isDeleted: row.isDeleted ?? false,
        startDate: row.startDate || fallbackStartDate,
        endDate: row.endDate ?? null,
        managerID: row.managerID ?? null,
        managerName: row.managerName ?? null,
        managerJobTitle: row.managerJobTitle ?? null,
        managerDepartmentName: row.managerDepartmentName ?? null,
        managerCompanyName: row.managerCompanyName ?? null,
        managerOrganizationId: row.managerOrganizationId ?? null,
      };
    });

    await userOrganizationApi.upsert(targetUserId, payload);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError(null);

    if (creating) {
      const validationError = validateProfile(profile, true);
      if (validationError) {
        setTab("info");
        setError(validationError);
        return;
      }
      if (!primaryAssignment?.companyId || !primaryAssignment.departmentId) {
        setTab("assignments");
        setError("Vui lòng thêm 1 đơn vị công tác chính trước khi tạo nhân viên.");
        return;
      }

      setIsSubmitting(true);
      try {
        const newUserId = await userApi.create({
          FullName: profile.fullName.trim(),
          UserName: profile.userName.trim(),
          Email: profile.email.trim(),
          Password: profile.password,
          JobPositionId: Number(profile.jobPositionId),
          DepartmentId: primaryAssignment.departmentId,
          roles: profile.roles,
          SystemCode: profile.systemCode.trim(),
          EmployeeCode: (primaryAssignment.employeeCode ?? "").trim(),
          JobTitle: (primaryAssignment.jobTitle ?? "").trim(),
          CompanyId: primaryAssignment.companyId,
        });
        await saveAssignmentsToServer(newUserId);
        if (hrDirty) {
          await conditionAssignmentApi.syncDetail(newUserId, selectedConditionAssignmentIds);
        }
        showToast("success", "Đã tạo nhân viên và lưu đơn vị công tác.");
        onSaved();
        onClose();
      } catch (cause) {
        setError(getErrorMessage(cause, "Chưa tạo được nhân viên. Vui lòng thử lại."));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (tab === "info") {
      const validationError = validateProfile(profile, false);
      if (validationError) {
        setError(validationError);
        return;
      }
      setIsSubmitting(true);
      try {
        if (profileDirty) {
          await userApi.update(employeeId, {
            FullName: profile.fullName.trim(),
            UserName: profile.userName.trim(),
            JobPositionId: Number(profile.jobPositionId),
            Email: profile.email.trim(),
            SystemCode: profile.systemCode.trim(),
            roles: profile.roles,
          });
        }
        if (hrDirty) {
          await conditionAssignmentApi.syncDetail(employeeId, selectedConditionAssignmentIds);
        }
        showToast("success", "Đã cập nhật thông tin nhân viên.");
        onSaved();
        onClose();
      } catch (cause) {
        setError(getErrorMessage(cause, "Chưa cập nhật được thông tin nhân viên. Vui lòng thử lại."));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (tab === "password") {
      if (!newPassword.trim()) {
        setError("Vui lòng nhập mật khẩu mới.");
        return;
      }
      if (newPassword.length < 6) {
        setError("Mật khẩu mới cần ít nhất 6 ký tự.");
        return;
      }
      if (confirmPassword !== newPassword) {
        setError("Mật khẩu xác nhận không khớp.");
        return;
      }
      setIsSubmitting(true);
      try {
        await userApi.adminResetPassword(employeeId, newPassword, confirmPassword);
        showToast("success", "Đã đặt lại mật khẩu nhân viên thành công.");
        onClose();
      } catch (cause) {
        setError(getErrorMessage(cause, "Chưa đổi được mật khẩu. Vui lòng thử lại."));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (tab === "assignments" && assignmentsChanged) {
      setIsSubmitting(true);
      try {
        await saveAssignmentsToServer(employeeId);
        showToast("success", "Đã lưu đơn vị công tác.");
        onSaved();
        onClose();
      } catch (cause) {
        setError(getErrorMessage(cause, "Chưa lưu được đơn vị công tác. Vui lòng thử lại."));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const canSave = creating
    ? true
    : tab === "info"
      ? profileDirty || hrDirty
      : tab === "password"
        ? Boolean(newPassword.trim() && confirmPassword.trim())
        : assignmentsChanged && !assignmentsLoading;

  const submitLabel = creating
    ? "Tạo nhân viên"
    : tab === "info"
      ? "Lưu thông tin"
      : tab === "password"
        ? "Đặt lại mật khẩu"
        : "Lưu đơn vị công tác";

  const isDirty = creating
    ? profileDirty || assignmentsChanged || hrDirty
    : profileDirty || hrDirty || assignmentsChanged || passwordDirty;

  const subtitle = creating
    ? "Nhập thông tin tài khoản và gán ít nhất 1 đơn vị công tác chính."
    : [detail?.fullName || detail?.userName, detail?.systemCode].filter(Boolean).join(" · ");

  return (
    <>
      <FormDialog
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={creating ? "Thêm nhân viên mới" : "Chỉnh sửa hồ sơ nhân viên"}
        subtitle={subtitle}
        width={780}
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        submitLabel={submitLabel}
        submitDisabled={!canSave}
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-4">
          <AppTabs
            value={tab}
            onChange={(next) => {
              setTab(next as AdminTab);
              setError(null);
            }}
            size="sm"
            items={[
              {
                value: "info",
                label: "Thông tin & HR",
                icon: <UserCog className="h-3.5 w-3.5" />,
              },
              ...(!creating
                ? [
                    {
                      value: "password",
                      label: "Đổi mật khẩu",
                      icon: <KeyRound className="h-3.5 w-3.5" />,
                    },
                  ]
                : []),
              {
                value: "assignments",
                label: "Đơn vị công tác",
                count: visibleAssignments.length,
                icon: <Layers className="h-3.5 w-3.5" />,
              },
            ]}
          />

          {error ? <InlineErrorBanner message={error} /> : null}

          {tab === "info" ? (
            <div className="ds-fade-in flex flex-col gap-4">
              <div className="ds-form-section">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="ds-section-icon">
                    <UserCog className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-primary">Thông tin tài khoản</h4>
                    <p className="text-xs text-secondary">
                      Họ tên, mã hệ thống, email và tên đăng nhập của nhân sự.
                    </p>
                  </div>
                </div>
                <AppForm>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <AppTextInput
                      label="Họ và tên"
                      value={profile.fullName}
                      onChange={(fullName) => patchProfile({ fullName })}
                      placeholder="VD: Nguyễn Văn A"
                      isRequired
                      isDisabled={isSubmitting}
                    />
                    <AppTextInput
                      label="Email"
                      type="email"
                      value={profile.email}
                      onChange={(email) => patchProfile({ email })}
                      placeholder="ten@deoca.vn"
                      autoComplete="off"
                      isDisabled={isSubmitting}
                    />
                    <AppTextInput
                      label="Tên đăng nhập"
                      value={profile.userName}
                      onChange={(userName) => patchProfile({ userName })}
                      placeholder="VD: nguyen.van.a"
                      autoComplete="off"
                      isRequired
                      isDisabled={isSubmitting}
                    />
                    <AppTextInput
                      label="Mã hệ thống"
                      value={profile.systemCode}
                      onChange={(systemCode) => patchProfile({ systemCode })}
                      placeholder="VD: DC01234"
                      isRequired
                      isDisabled={isSubmitting}
                    />
                  </div>

                  {creating ? (
                    <AppPasswordInput
                      label="Mật khẩu ban đầu"
                      value={profile.password}
                      onChange={(password) => patchProfile({ password })}
                      placeholder="Nhập mật khẩu khởi tạo cho tài khoản"
                      autoComplete="new-password"
                      isRequired
                      isDisabled={isSubmitting}
                    />
                  ) : null}
                </AppForm>
              </div>

              <div className="ds-form-section ds-form-section--tinted">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="ds-section-icon" data-tone="purple">
                    <Briefcase className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-primary">
                      Phân nhóm biểu mẫu, Vai trò & HR phụ trách
                    </h4>
                    <p className="text-xs text-secondary">
                      Loại biểu mẫu tự đồng bộ vai trò mặc định; HR phụ trách tự gợi ý theo đơn vị
                      công tác.
                    </p>
                  </div>
                </div>
                <AppForm>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <AppSelect
                      label="Loại biểu mẫu"
                      value={profile.screenJobId}
                      onChange={(nextScreenId) =>
                        patchProfile(syncJobAndRoles(nextScreenId, profile.roles))
                      }
                      options={JOB_POSITION_SCREEN_OPTIONS.map((opt) => ({
                        value: opt.id,
                        label: opt.name,
                      }))}
                      placeholder="Chọn loại biểu mẫu..."
                      isRequired
                      hasClear={false}
                      hasSearch={false}
                      isDisabled={isSubmitting}
                    />
                    <AppMultiSelect
                      label="Vai trò nhân viên"
                      value={profile.roles}
                      onChange={(nextRoles) => patchProfile({ roles: nextRoles })}
                      options={roleSelectOptions}
                      placeholder="Chọn vai trò..."
                      isDisabled={isSubmitting}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <AppMultiSelect
                      label="HR phụ trách"
                      value={selectedHrIds}
                      onChange={setSelectedHrIds}
                      options={hrSelectOptions}
                      placeholder={
                        unitPairs.length > 0
                          ? "Chọn HR phụ trách..."
                          : "Thêm đơn vị công tác để tự lấy HR mặc định"
                      }
                      isLoading={hrLoading || hrUnitLoading || assignmentsLoading}
                      isDisabled={isSubmitting || hrLoading}
                      description="Hệ thống tự ưu tiên HR phụ trách riêng (nếu đã gán) hoặc mặc định theo Công ty / Phòng ban."
                    />

                    {selectedHrLabels.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {selectedHrLabels.map((hr) => (
                          <span
                            key={hr.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-ring bg-blue-subtle px-2.5 py-0.5 text-xs font-semibold text-blue-vivid"
                          >
                            <UserCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>{hr.name}</span>
                            <button
                              type="button"
                              aria-label={`Bỏ ${hr.name}`}
                              disabled={isSubmitting}
                              onClick={() =>
                                setSelectedHrIds((prev) => prev.filter((item) => item !== hr.id))
                              }
                              className="inline-grid h-4 w-4 place-items-center rounded-full hover:bg-surface/60"
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </AppForm>
              </div>
            </div>
          ) : null}

          {tab === "password" && !creating ? (
            <div className="ds-fade-in ds-form-section">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="ds-section-icon" data-tone="orange">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-primary">Đặt lại mật khẩu quản trị</h4>
                  <p className="text-xs text-secondary">
                    Cấp mật khẩu mới trực tiếp cho tài khoản nhân viên không cần mật khẩu cũ.
                  </p>
                </div>
              </div>

              <AppForm>
                <AppPasswordInput
                  label="Mật khẩu mới"
                  value={newPassword}
                  onChange={(val) => {
                    setNewPassword(val);
                    if (error) setError(null);
                  }}
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  isRequired
                  isDisabled={isSubmitting}
                />

                {newPassword ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-secondary">Độ mạnh mật khẩu</span>
                      <span
                        className={`font-semibold ${
                          strengthScore <= 1
                            ? "text-error"
                            : strengthScore <= 2
                              ? "text-warning"
                              : "text-success"
                        }`}
                      >
                        {strengthScore <= 1 ? "Yếu" : strengthScore <= 2 ? "Trung bình" : "Mạnh"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-1.5 rounded-full ${
                            strengthScore >= step
                              ? strengthScore <= 1
                                ? "bg-error"
                                : strengthScore <= 2
                                  ? "bg-warning"
                                  : "bg-success"
                              : "bg-border"
                          }`}
                        />
                      ))}
                    </div>
                    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {strengthChecks.map((rule) => (
                        <li
                          key={rule.label}
                          className={`flex items-center gap-1.5 text-xs ${
                            rule.passed ? "font-medium text-success" : "text-secondary"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <AppPasswordInput
                  label="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChange={(val) => {
                    setConfirmPassword(val);
                    if (error) setError(null);
                  }}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                  isRequired
                  isDisabled={isSubmitting}
                />
              </AppForm>
            </div>
          ) : null}

          {tab === "assignments" ? (
            <div className="ds-fade-in ds-form-section flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="ds-section-icon" data-tone="cyan">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-primary">Danh sách đơn vị công tác</h4>
                    <p className="text-xs text-secondary">
                      Quản trị viên có thể chỉnh sửa đầy đủ Công ty, Phòng ban, Chức danh và Quản
                      lý trực tiếp.
                    </p>
                  </div>
                </div>
                <AppButton
                  label="Thêm đơn vị"
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  isDisabled={isSubmitting || assignmentsLoading}
                  onClick={handleAddAssignment}
                />
              </div>

              {creating && !hasPrimaryAssignment ? (
                <div className="rounded-lg border border-warning/40 bg-warning-muted px-3.5 py-2.5 text-xs text-primary">
                  Cần thêm ít nhất <strong>1 đơn vị công tác chính</strong> (Công ty, Phòng ban, Mã
                  nhân viên, Chức danh, Quản lý trực tiếp) trước khi tạo nhân viên.
                </div>
              ) : null}

              {assignmentsLoading ? (
                <LoadingOverlay label="Đang tải đơn vị công tác..." />
              ) : visibleAssignments.length === 0 ? (
                <div className="ds-empty-dropzone">
                  <Layers className="h-6 w-6 text-secondary" aria-hidden="true" />
                  <div className="text-sm font-semibold text-primary">Chưa có đơn vị công tác</div>
                  <p className="text-xs text-secondary">
                    Nhấn &ldquo;Thêm đơn vị&rdquo; để gán công ty, phòng ban và quản lý trực tiếp.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {assignments.map((row, index) =>
                    row.isDeleted ? null : (
                      <li
                        key={row.id ?? row._localKey ?? `draft-${index}`}
                        className="ds-attached-item"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-primary">
                              {row.companyName || "Đơn vị công tác"}
                            </span>
                            <AssignmentTypeBadge type={row.assignmentType} />
                          </div>
                          <div className="mt-0.5 truncate text-xs text-secondary">
                            {[row.departmentName, row.jobTitle, row.employeeCode]
                              .filter(Boolean)
                              .join(" · ") || "Chưa cập nhật chi tiết"}
                          </div>
                          {row.managerName ? (
                            <div className="mt-0.5 text-xs text-secondary">
                              Quản lý trực tiếp:{" "}
                              <strong className="font-medium text-primary">
                                {row.managerName}
                              </strong>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <AppIconButton
                            label="Chỉnh sửa đơn vị công tác"
                            icon={<Pencil className="h-4 w-4" />}
                            isDisabled={isSubmitting}
                            onClick={() => setDraftAssignment({ index, value: row })}
                          />
                          <AppIconButton
                            label="Gỡ đơn vị công tác"
                            icon={<Trash2 className="h-4 w-4 text-error" />}
                            isDisabled={isSubmitting}
                            onClick={() => handleRemoveAssignment(index)}
                          />
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </FormDialog>

      <AssignmentFormDialog
        isOpen={Boolean(draftAssignment)}
        onOpenChange={(open) => {
          if (!open) setDraftAssignment(null);
        }}
        userId={employeeId}
        model={draftAssignment?.value ?? null}
        editableDetails
        hasPrimaryAssignment={assignments.some(
          (row, idx) =>
            idx !== draftAssignment?.index &&
            !row.isDeleted &&
            row.assignmentType === AssignmentType.Primary,
        )}
        companies={companies}
        isDirector={false}
        onSubmit={handleSaveDraftAssignment}
      />
    </>
  );
}
