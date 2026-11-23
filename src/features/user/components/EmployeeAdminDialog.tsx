"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  EyeNoneIcon,
  EyeOpenIcon,
  LayersIcon,
  LockClosedIcon,
  Pencil2Icon,
  PersonIcon,
  PlusIcon,
  ReloadIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import type { CompanyDto } from "@/features/company/types";
import { conditionAssignmentApi } from "@/features/condition-assignments/services/conditionAssignmentApi";
import { ConditionStatus, type ConditionAssignmentDto } from "@/features/condition-assignments/types";
import { employeeErrorMessage } from "../services/employeeListApi";
import { userApi } from "../services/userApi";
import { userOrganizationApi, type UserOrganizationUpsertItem } from "../services/userOrganizationApi";
import {
  AssignmentType,
  JOB_POSITION_SCREEN_OPTIONS,
  JobPositionEnumScreen,
  type EmployeeListItemDto,
  type JobPosition,
  type RoleOption,
  type UserOrganizationDto,
} from "../types";
import AssignmentDialog from "./AssignmentDialog";
import PasswordChange from "./PasswordChange";
import "./EmployeeAdminDialog.css";

type Props = {
  employee: EmployeeListItemDto | null;
  companies: CompanyDto[];
  jobs: JobPosition[];
  roles: (RoleOption & { label: string })[];
  onClose: () => void;
  onSaved: () => void;
};

type ProfileForm = {
  fullName: string;
  userName: string;
  email: string;
  systemCode: string;
  password: string;
  jobPositionId: string;
  screenJobId: string;
  roles: string[];
};

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
    jobPositionId: screenJobId === EMPLOYEE_MANAGER_ID ? String(JobPositionEnumScreen.Employee) : screenJobId,
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

function sameItems(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, i) => value === right[i]);
}

function todayStartOfDayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T00:00:00`;
}

function validateProfile(form: ProfileForm, creating: boolean): string {
  if (!form.fullName.trim()) return "Vui lòng nhập họ tên.";
  if (!form.userName.trim()) return "Vui lòng nhập tên đăng nhập.";
  const email = form.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Địa chỉ email không đúng định dạng.";
  if (!form.systemCode.trim()) return "Vui lòng nhập mã hệ thống.";
  if (creating && !form.password) return "Vui lòng nhập mật khẩu ban đầu.";
  if (!Number(form.jobPositionId)) return "Vui lòng chọn nhóm chức vụ.";
  return "";
}

type HrOption = SearchableSelectOption & { assignmentId?: number };

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

export function EmployeeAdminDialog({ employee, companies, jobs, roles, onClose, onSaved }: Props) {
  const creating = employee === null;
  const employeeId = employee?.userId || employee?.id || "";
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);

  const [tab, setTab] = useState<"info" | "password" | "assignments">("info");
  const [detail, setDetail] = useState(employee);
  const [baseline, setBaseline] = useState<ProfileForm>(() => toProfileForm(employee));
  const [profile, setProfile] = useState<ProfileForm>(() => toProfileForm(employee));
  const [showPassword, setShowPassword] = useState(false);

  const [assignments, setAssignments] = useState<UserOrganizationDto[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(!creating);
  const [assignmentsChanged, setAssignmentsChanged] = useState(false);
  const [draft, setDraft] = useState<{ index: number; value: UserOrganizationDto }>();

  const [selectableHrs, setSelectableHrs] = useState<HrOption[]>([]);
  const [unitDefaultHrs, setUnitDefaultHrs] = useState<HrOption[]>([]);
  const [previousHr, setPreviousHr] = useState<{ sourceType: number; userIds: string[] } | null>(
    creating ? { sourceType: 1, userIds: [] } : null,
  );
  const [hrBaselineIds, setHrBaselineIds] = useState<string[]>([]);
  const [selectedHrIds, setSelectedHrIds] = useState<string[]>([]);
  const [hrLoading, setHrLoading] = useState(true);
  const [hrUnitLoading, setHrUnitLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node?.close();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Load selectable HRs (API 1) and, on edit, previous responsible HR (API 3)
  useEffect(() => {
    const controller = new AbortController();
    setHrLoading(true);

    const selectablePromise = conditionAssignmentApi.getAll(
      {
        filters: {
          statusconditions: `${ConditionStatus.ByUnitHRCompile};${ConditionStatus.ByUnitHRCompileHistory}`,
          isactive: "true",
          scopevalue: "Company",
          usercurrent: "1",
        },
      },
      controller.signal,
    );

    const previousPromise =
      !creating && employeeId
        ? conditionAssignmentApi.getResponsibleHr(employeeId, controller.signal)
        : Promise.resolve(null);

    Promise.allSettled([selectablePromise, previousPromise]).then(([selectableRes, previousRes]) => {
      if (controller.signal.aborted) return;
      if (selectableRes.status === "fulfilled") {
        setSelectableHrs(dedupeAssignmentHrs(selectableRes.value));
      }
      if (!creating) {
        const res = previousRes.status === "fulfilled" ? previousRes.value : null;
        const userIds = Array.from(
          new Set((res?.users ?? []).map((user) => user.id.trim()).filter(Boolean)),
        );
        setPreviousHr({ sourceType: res?.assignmentSourceType ?? 1, userIds });
      }
      setHrLoading(false);
    });

    return () => controller.abort();
  }, [creating, employeeId]);

  useEffect(() => {
    if (creating || !employeeId) return;
    const controller = new AbortController();

    userApi.get(employeeId, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        const merged = { ...employee, ...data };
        const next = toProfileForm(merged);
        setDetail(merged);
        setBaseline(next);
        setProfile(next);
      },
      (cause) => {
        if (!controller.signal.aborted) {
          setError(employeeErrorMessage(cause, "Chưa tải được thông tin chi tiết nhân viên."));
        }
      },
    );

    userOrganizationApi
      .getPaged(employeeId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setAssignments(data.items ?? []);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(employeeErrorMessage(cause, "Chưa tải được đơn vị công tác."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAssignmentsLoading(false);
      });

    return () => controller.abort();
  }, [creating, employee, employeeId]);

  const primaryAssignment = useMemo(
    () => assignments.find((row) => !row.isDeleted && row.assignmentType === AssignmentType.Primary),
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
    if (!pairs.length && detail?.companyId && detail?.departmentId) {
      pairs.push({ companyId: detail.companyId, departmentId: detail.departmentId });
    }
    return pairs;
  }, [assignments, detail?.companyId, detail?.departmentId]);
  const unitPairsKey = unitPairs.map((pair) => `${pair.companyId}:${pair.departmentId}`).join("|");

  // Load default HRs by unit companyId + departmentId (API 2, deduped)
  useEffect(() => {
    if (!unitPairs.length) {
      setUnitDefaultHrs([]);
      setHrUnitLoading(false);
      return;
    }
    const controller = new AbortController();
    setHrUnitLoading(true);
    Promise.all(
      unitPairs.map((pair) =>
        conditionAssignmentApi.getAll(
          {
            filters: {
              statuscondition: ConditionStatus.ByUnitHR,
              isactive: "true",
              scope: "true",
              companyid: String(pair.companyId),
              departmentid: String(pair.departmentId),
            },
          },
          controller.signal,
        ),
      ),
    )
      .then((results) => {
        if (!controller.signal.aborted) {
          setUnitDefaultHrs(dedupeAssignmentHrs(results.flat()));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnitDefaultHrs([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHrUnitLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitPairsKey]);

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
    if (hrLoading || hrUnitLoading) return;
    const unitIds = unitDefaultHrs.map((hr) => hr.id);
    const selectableSet = new Set(selectableHrs.map((hr) => hr.id));
    const unitInSelectable = selectableSet.size > 0
      ? unitIds.filter((uid) => selectableSet.has(uid))
      : unitIds;
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
  }, [creating, assignmentsChanged, hrLoading, hrUnitLoading, selectableHrs, unitDefaultHrs, hrOptions, previousHr]);

  const roleOptions = useMemo(() => {
    const base = roles.map((role) => ({ id: role.name, name: role.label }));
    const extras = profile.roles
      .filter((value) => !roles.some((role) => role.name === value))
      .map((value) => ({ id: value, name: value }));
    return [...base, ...extras];
  }, [roles, profile.roles]);

  const selectedHrLabels = useMemo(() => {
    const labelById = new Map(hrOptions.map((hr) => [hr.id, hr.name]));
    return selectedHrIds.map((uid) => ({ id: uid, name: labelById.get(uid) ?? uid }));
  }, [hrOptions, selectedHrIds]);

  function close(force = false) {
    if (!force && (busy || closing)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.current?.close();
      onClose();
      return;
    }
    setClosing(true);
  }

  function patchProfile(fields: Partial<ProfileForm>) {
    setError("");
    setProfile((prev) => ({ ...prev, ...fields }));
  }

  function addAssignment() {
    const selectedJob = jobs.find((item) => String(item.id) === profile.jobPositionId);
    const hasPrimary = assignments.some((row) => !row.isDeleted && row.assignmentType === AssignmentType.Primary);
    setDraft({
      index: assignments.length,
      value: {
        userId: employeeId,
        userName: profile.fullName.trim(),
        systemCode: profile.systemCode.trim(),
        employeeCode: detail?.employeeCode ?? "",
        assignmentType: hasPrimary ? AssignmentType.Concurrent : AssignmentType.Primary,
        jobPositionId: selectedJob?.id ?? detail?.jobPositionId,
        jobPositionName: selectedJob?.name ?? detail?.jobPosition?.name,
        startDate: todayStartOfDayIso(),
        endDate: null,
        isActive: true,
        isDeleted: false,
      },
    });
  }

  function saveDraft(value: UserOrganizationDto) {
    const index = draft?.index ?? assignments.length;
    setAssignments((rows) =>
      index === rows.length ? [...rows, value] : rows.map((row, i) => (i === index ? value : row)),
    );
    setDraft(undefined);
    setAssignmentsChanged(true);
    setError("");
  }

  function removeDraft(index: number) {
    setAssignments((rows) =>
      rows.flatMap((row, i) => (i !== index ? [row] : row.id == null ? [] : [{ ...row, isDeleted: true }])),
    );
    setAssignmentsChanged(true);
  }

  async function saveAssignments(targetUserId: string) {
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
  }

  const profileDirty =
    profile.fullName.trim() !== baseline.fullName.trim() ||
    profile.userName.trim() !== baseline.userName.trim() ||
    profile.email.trim() !== baseline.email.trim() ||
    profile.systemCode.trim() !== baseline.systemCode.trim() ||
    profile.jobPositionId !== baseline.jobPositionId ||
    !sameItems(profile.roles, baseline.roles);
  const hrDirty = !sameItems(selectedHrIds, hrBaselineIds);
  const selectedConditionAssignmentIds = selectedHrIds
    .map((uid) => hrOptions.find((hr) => hr.id === uid)?.assignmentId)
    .filter((cid): cid is number => cid != null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || closing) return;
    setError("");

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

      setBusy(true);
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
        await saveAssignments(newUserId);
        if (hrDirty) {
          await conditionAssignmentApi.syncDetail(newUserId, selectedConditionAssignmentIds);
        }
        notify("success", "Đã tạo nhân viên và lưu đơn vị công tác.");
        onSaved();
        close(true);
      } catch (cause) {
        setError(employeeErrorMessage(cause, "Chưa tạo được nhân viên. Vui lòng thử lại."));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (tab === "info") {
      const validationError = validateProfile(profile, false);
      if (validationError) {
        setError(validationError);
        return;
      }
      setBusy(true);
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
        notify("success", "Đã cập nhật thông tin nhân viên.");
        onSaved();
        close(true);
      } catch (cause) {
        setError(employeeErrorMessage(cause, "Chưa cập nhật được thông tin nhân viên. Vui lòng thử lại."));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (tab === "assignments" && assignmentsChanged) {
      setBusy(true);
      try {
        await saveAssignments(employeeId);
        notify("success", "Đã lưu đơn vị công tác.");
        onSaved();
        close(true);
      } catch (cause) {
        setError(employeeErrorMessage(cause, "Chưa lưu được đơn vị công tác. Vui lòng thử lại."));
      } finally {
        setBusy(false);
      }
    }
  }

  const tabs: readonly ("info" | "password" | "assignments")[] = creating
    ? ["info", "assignments"]
    : ["info", "password", "assignments"];
  const visibleAssignments = assignments.filter((row) => !row.isDeleted);
  const hasPrimaryAssignment = visibleAssignments.some((row) => row.assignmentType === AssignmentType.Primary);
  const showSave = creating || tab === "info" || tab === "assignments";
  const canSave = creating ? true : tab === "info" ? (profileDirty || hrDirty) : assignmentsChanged && !assignmentsLoading;
  const subtitle = creating
    ? "Nhập thông tin tài khoản và gán ít nhất 1 đơn vị công tác chính."
    : [detail?.fullName || detail?.userName, detail?.systemCode].filter(Boolean).join(" · ");

  return (
    <>
      <dialog
        ref={dialog}
        className="emp-modal emp-admin-modal"
        data-closing={closing}
        aria-labelledby={id + "-title"}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && closing) {
            dialog.current?.close();
            onClose();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="emp-modal-shell" inert={closing}>
          <header className="emp-modal-head">
            <div className="emp-modal-head-main">
              <span className="emp-modal-emblem" aria-hidden="true">
                <PersonIcon />
              </span>
              <div className="emp-modal-head-copy">
                <span className="emp-modal-eyebrow">
                  <span className="emp-modal-eyebrow-bar" aria-hidden="true" />
                  {creating ? "Hồ sơ mới" : "Quản lý nhân sự"}
                </span>
                <h2 id={id + "-title"}>{creating ? "Thêm nhân viên" : "Chỉnh sửa nhân viên"}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              className="emp-modal-close"
              aria-label="Đóng"
              disabled={busy}
              onClick={() => close()}
            >
              <Cross2Icon aria-hidden="true" />
            </button>
          </header>

          <div
            className="emp-admin-tabs"
            role="tablist"
            aria-label="Thông tin nhân viên"
            onKeyDown={(event) => {
              if (busy || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const current = tabs.indexOf(tab);
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (current + (event.key === "ArrowLeft" ? -1 : 1) + tabs.length) % tabs.length;
              setTab(tabs[nextIndex]);
              setError("");
              event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="tab"]')[nextIndex]?.focus();
            }}
          >
            <button
              id={id + "-info"}
              type="button"
              role="tab"
              aria-selected={tab === "info"}
              aria-controls={id + "-info-panel"}
              tabIndex={tab === "info" ? 0 : -1}
              disabled={busy}
              onClick={() => { setTab("info"); setError(""); }}
            >
              <PersonIcon aria-hidden="true" />
              <span>Thông tin</span>
            </button>
            {!creating && (
              <button
                id={id + "-password"}
                type="button"
                role="tab"
                aria-selected={tab === "password"}
                aria-controls={id + "-password-panel"}
                tabIndex={tab === "password" ? 0 : -1}
                disabled={busy}
                onClick={() => { setTab("password"); setError(""); }}
              >
                <LockClosedIcon aria-hidden="true" />
                <span>Đổi mật khẩu</span>
              </button>
            )}
            <button
              id={id + "-assignments"}
              type="button"
              role="tab"
              aria-selected={tab === "assignments"}
              aria-controls={id + "-assignments-panel"}
              tabIndex={tab === "assignments" ? 0 : -1}
              disabled={busy}
              onClick={() => { setTab("assignments"); setError(""); }}
            >
              <LayersIcon aria-hidden="true" />
              <span>Đơn vị công tác</span>
              <span className="emp-admin-tabCount" data-ready={visibleAssignments.length > 0}>
                {visibleAssignments.length}
              </span>
            </button>
          </div>

          <div className="emp-modal-body" data-tab={tab}>
            <form id={id + "-form"} onSubmit={handleSubmit} noValidate>
              <section role="tabpanel" id={id + "-info-panel"} aria-labelledby={id + "-info"} hidden={tab !== "info"}>
                <fieldset disabled={busy} className="emp-admin-fields">
                  <div className="emp-field">
                    <label htmlFor={id + "-fullname"}>
                      Họ tên<span className="emp-req" aria-hidden="true">*</span>
                    </label>
                    <input
                      id={id + "-fullname"}
                      required
                      value={profile.fullName}
                      placeholder="VD: Nguyễn Văn A"
                      onChange={(event) => patchProfile({ fullName: event.target.value })}
                    />
                  </div>

                  <div className="emp-field">
                    <label htmlFor={id + "-email"}>Email</label>
                    <input
                      id={id + "-email"}
                      type="email"
                      value={profile.email}
                      autoComplete="off"
                      placeholder="ten@deoca.vn"
                      onChange={(event) => patchProfile({ email: event.target.value })}
                    />
                  </div>

                  <div className="emp-field">
                    <label htmlFor={id + "-username"}>
                      Tên đăng nhập<span className="emp-req" aria-hidden="true">*</span>
                    </label>
                    <input
                      id={id + "-username"}
                      required
                      value={profile.userName}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="VD: nguyen.van.a"
                      onChange={(event) => patchProfile({ userName: event.target.value })}
                    />
                  </div>

                  <div className="emp-field">
                    <label htmlFor={id + "-code"}>
                      Mã hệ thống<span className="emp-req" aria-hidden="true">*</span>
                    </label>
                    <input
                      id={id + "-code"}
                      required
                      value={profile.systemCode}
                      placeholder="VD: DC01234"
                      onChange={(event) => patchProfile({ systemCode: event.target.value })}
                    />
                  </div>

                  {creating && (
                    <div className="emp-field emp-admin-fullRow">
                      <label htmlFor={id + "-password-input"}>
                        Mật khẩu ban đầu<span className="emp-req" aria-hidden="true">*</span>
                      </label>
                      <div className="emp-password-wrap">
                        <input
                          id={id + "-password-input"}
                          required
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={profile.password}
                          placeholder="Nhập mật khẩu khởi tạo"
                          onChange={(event) => patchProfile({ password: event.target.value })}
                        />
                        <button
                          type="button"
                          className="emp-password-toggle"
                          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          onClick={() => setShowPassword((value) => !value)}
                        >
                          {showPassword ? <EyeNoneIcon aria-hidden="true" /> : <EyeOpenIcon aria-hidden="true" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="emp-field">
                    <label htmlFor={id + "-job"}>
                      Loại biểu mẫu<span className="emp-req" aria-hidden="true">*</span>
                    </label>
                    <SearchableSelect
                      id={id + "-job"}
                      label="Loại biểu mẫu"
                      value={profile.screenJobId}
                      placeholder="Chọn loại biểu mẫu"
                      options={JOB_POSITION_SCREEN_OPTIONS}
                      required
                      onChange={(nextScreenId) =>
                        patchProfile(syncJobAndRoles(nextScreenId, profile.roles))
                      }
                    />
                  </div>

                  <div className="emp-field">
                    <label htmlFor={id + "-roles"}>Vai trò NV</label>
                    <SearchableSelect
                      id={id + "-roles"}
                      label="Vai trò"
                      multiple
                      value={profile.roles}
                      placeholder="Chọn vai trò"
                      options={roleOptions}
                      onChange={(nextRoles) => patchProfile({ roles: nextRoles })}
                    />
                  </div>

                  <div className="emp-field emp-admin-fullRow">
                    <label htmlFor={id + "-hr"}>HR phụ trách</label>
                    <SearchableSelect
                      id={id + "-hr"}
                      label="HR phụ trách"
                      multiple
                      value={selectedHrIds}
                      placeholder={
                        unitPairs.length > 0
                          ? "Chọn HR phụ trách"
                          : "Thêm đơn vị công tác để tự lấy HR mặc định"
                      }
                      options={hrOptions}
                      loading={hrLoading || hrUnitLoading || assignmentsLoading}
                      onChange={setSelectedHrIds}
                    />
                    {selectedHrLabels.length > 0 && (
                      <div className="emp-hr-tags">
                        {selectedHrLabels.map((hr) => (
                          <span key={hr.id} className="emp-hr-tag">
                            <span>{hr.name}</span>
                            <button
                              type="button"
                              aria-label={`Bỏ ${hr.name}`}
                              onClick={() => setSelectedHrIds((prev) => prev.filter((item) => item !== hr.id))}
                            >
                              <Cross2Icon aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </fieldset>
              </section>

              <section
                role="tabpanel"
                id={id + "-assignments-panel"}
                aria-labelledby={id + "-assignments"}
                hidden={tab !== "assignments"}
              >
                <div className="emp-admin-toolbar">
                  <h3>Đơn vị công tác</h3>
                  <button
                    type="button"
                    className="emp-btn emp-btn--sm"
                    disabled={busy || assignmentsLoading}
                    onClick={addAssignment}
                  >
                    <PlusIcon aria-hidden="true" />
                    <span>Thêm đơn vị</span>
                  </button>
                </div>

                {creating && !hasPrimaryAssignment && (
                  <p className="emp-admin-hint">
                    Cần thêm ít nhất <strong>1 đơn vị công tác chính</strong> (Công ty, Phòng ban, Mã nhân viên, Chức danh, Quản lý trực tiếp) trước khi tạo nhân viên.
                  </p>
                )}

                {assignmentsLoading ? (
                  <p className="emp-admin-empty" role="status">Đang tải đơn vị công tác…</p>
                ) : visibleAssignments.length === 0 ? (
                  <p className="emp-admin-empty">Chưa có đơn vị công tác.</p>
                ) : (
                  <ul className="emp-admin-assignments">
                    {assignments.map(
                      (row, index) =>
                        !row.isDeleted && (
                          <li key={row.id ?? `draft-${index}`}>
                            <div>
                              <strong>{row.companyName || "Đơn vị công tác"}</strong>
                              <p>{[row.departmentName, row.jobTitle, row.employeeCode].filter(Boolean).join(" · ")}</p>
                              {row.managerName && <p>Quản lý trực tiếp: {row.managerName}</p>}
                            </div>
                            <span className="emp-role-pill">
                              {row.assignmentType === AssignmentType.Primary ? "Chính" : "Kiêm nhiệm"}
                            </span>
                            <div className="emp-row-actions">
                              <button
                                type="button"
                                className="emp-action-btn"
                                title="Sửa đơn vị"
                                aria-label="Sửa đơn vị"
                                disabled={busy}
                                onClick={() => setDraft({ index, value: row })}
                              >
                                <Pencil2Icon aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="emp-action-btn emp-action-btn--danger"
                                title="Gỡ khỏi danh sách"
                                aria-label="Gỡ khỏi danh sách"
                                disabled={busy}
                                onClick={() => removeDraft(index)}
                              >
                                <TrashIcon aria-hidden="true" />
                              </button>
                            </div>
                          </li>
                        ),
                    )}
                  </ul>
                )}
              </section>
            </form>

            {!creating && (
              <section
                role="tabpanel"
                id={id + "-password-panel"}
                aria-labelledby={id + "-password"}
                className="emp-admin-passwordPanel"
                hidden={tab !== "password"}
              >
                {tab === "password" && (
                  <PasswordChange
                    isAdmin
                    onPasswordSubmit={async (model) => {
                      setError("");
                      setBusy(true);
                      try {
                        await userApi.adminResetPassword(
                          employeeId,
                          model.newPassword ?? "",
                          model.confirmPassword ?? "",
                        );
                        notify("success", "Đã đổi mật khẩu nhân viên.");
                        close(true);
                      } catch (cause) {
                        setError(employeeErrorMessage(cause, "Chưa đổi được mật khẩu. Vui lòng thử lại."));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                )}
              </section>
            )}

            {error && (
              <div className="emp-form-error" role="alert">
                <ExclamationTriangleIcon aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <footer className="emp-modal-foot">
            <button type="button" className="emp-btn" onClick={() => close()} disabled={busy}>
              {showSave ? "Hủy" : "Đóng"}
            </button>
            {showSave && (
              <button
                className="emp-btn emp-btn--brand"
                type="submit"
                form={id + "-form"}
                disabled={busy || !canSave}
              >
                {busy ? <ReloadIcon className="emp-spin" aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}
                <span>
                  {busy
                    ? "Đang lưu…"
                    : creating
                      ? "Tạo nhân viên"
                      : tab === "info"
                        ? "Lưu thông tin"
                        : "Lưu đơn vị công tác"}
                </span>
              </button>
            )}
          </footer>
        </div>
      </dialog>

      {draft && (
        <AssignmentDialog
          open
          userId={employeeId}
          model={draft.value}
          isEdit={draft.index < assignments.length}
          editableDetails
          hasPrimaryAssignment={assignments.some(
            (row, index) => index !== draft.index && !row.isDeleted && row.assignmentType === AssignmentType.Primary,
          )}
          companies={companies}
          isDirector={false}
          onClose={() => setDraft(undefined)}
          onSubmit={saveDraft}
        />
      )}
    </>
  );
}
