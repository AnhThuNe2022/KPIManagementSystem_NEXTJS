"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpZA,
  Download,
  FileSpreadsheet,
  IdCard,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  AppButton,
  AppIconButton,
  AppSelect,
  AppTextInput,
  CompanyChip,
  ConfirmDialog,
  DataTable,
  FilterBar,
  PageFrame,
  PageHeader,
  TagBadge,
  UserIdentityCell,
  pixel,
  proportional,
  useAppToast,
  type ActiveFilterChip,
  type SelectOption,
  type TableColumn,
} from "@/components/ds";
import type { CompanyDto } from "@/features/company/types";
import type { DepartmentDto } from "@/features/department/types";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { employeeListApi } from "../services/employeeListApi";
import { userApi } from "../services/userApi";
import {
  EMPLOYEE_SORT_OPTIONS,
  MISSING_INFO_OPTIONS,
  ROLE_LABELS,
  type EmployeeListFilters,
  type EmployeeListItemDto,
  type EmployeeSortOrder,
  type JobPosition,
  type MissingInfoFilterValue,
  type RoleOption,
} from "../types";
import { EmployeeAdminDialog } from "./EmployeeAdminDialog";

const DEFAULT_FILTERS: EmployeeListFilters = {
  keyword: "",
  companyId: "",
  departmentId: "",
  jobId: "",
  roleId: "",
  sortOrder: "EmployeeAsc",
  missingInfo: "0",
};

export function EmployeeManagementView() {
  const showToast = useAppToast();

  const [draft, setDraft] = useState<EmployeeListFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<EmployeeListFilters>(DEFAULT_FILTERS);
  const [appliedDeptLabel, setAppliedDeptLabel] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [revision, setRevision] = useState(0);

  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [items, setItems] = useState<EmployeeListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEmployee, setDialogEmployee] = useState<EmployeeListItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItemDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: "/" focuses search, "N" opens Create dialog (matching legacy)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      if (dialogOpen || deleteTarget) return;
      if (event.key === "/") {
        event.preventDefault();
        searchWrapRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setDialogEmployee(null);
        setDialogOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, dialogOpen]);

  // Load lookup catalogs (companies, job positions, roles)
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      employeeListApi.getCompanies(ctrl.signal),
      employeeListApi.getJobPositions(ctrl.signal),
      employeeListApi.getRoles(ctrl.signal),
    ])
      .then(([companyRows, jobRows, roleRows]) => {
        if (ctrl.signal.aborted) return;
        setCompanies(companyRows);
        setJobPositions(jobRows);
        setRoles(roleRows);
      })
      .catch((cause) => {
        if (!isAbortError(cause) && !ctrl.signal.aborted) {
          showToast("error", getErrorMessage(cause, "Chưa tải được danh mục bộ lọc."));
        }
      });
    return () => ctrl.abort();
  }, [showToast]);

  // Load departments dependent on selected company
  useEffect(() => {
    setDepartments([]);
    if (!draft.companyId) {
      setDepartmentsLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setDepartmentsLoading(true);
    employeeListApi
      .getDepartments(draft.companyId, ctrl.signal)
      .then((rows) => {
        if (!ctrl.signal.aborted) setDepartments(rows);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setDepartments([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setDepartmentsLoading(false);
      });
    return () => ctrl.abort();
  }, [draft.companyId]);

  // Load paged employees
  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    employeeListApi
      .getPaged(page, pageSize, applied, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(res.total / pageSize));
        if (page > lastPage && res.total > 0) {
          setPage(lastPage);
          return;
        }
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((cause) => {
        if (isAbortError(cause) || ctrl.signal.aborted) return;
        setError(getErrorMessage(cause, "Chưa tải được danh sách nhân viên. Vui lòng thử lại."));
        setIsUnauthorized(cause instanceof ApiRequestError && cause.status === 401);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoading(false);
      });

    return () => ctrl.abort();
  }, [applied, page, pageSize, revision]);

  const companiesById = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies],
  );
  const companyOptions = useMemo<SelectOption[]>(
    () => companies.map((c) => ({ value: String(c.id), label: c.companyName })),
    [companies],
  );
  const departmentOptions = useMemo<SelectOption[]>(
    () => departments.map((d) => ({ value: String(d.id), label: d.name })),
    [departments],
  );
  const jobOptions = useMemo<SelectOption[]>(
    () => jobPositions.map((j) => ({ value: String(j.id), label: j.name })),
    [jobPositions],
  );
  const roleCatalog = useMemo(
    () =>
      roles.map((r) => ({
        ...r,
        label: ROLE_LABELS[r.name.toLowerCase()] ?? r.name,
      })),
    [roles],
  );
  const roleOptions = useMemo<SelectOption[]>(
    () => roleCatalog.map((r) => ({ value: r.id, label: r.label })),
    [roleCatalog],
  );

  const handleApplyFilters = () => {
    setApplied({ ...draft, keyword: draft.keyword.trim() });
    setAppliedDeptLabel(
      departments.find((d) => String(d.id) === draft.departmentId)?.name ?? "",
    );
    setPage(1);
    setRevision((v) => v + 1);
  };

  const handleResetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setAppliedDeptLabel("");
    setPage(1);
    setRevision((v) => v + 1);
  };

  const handleToggleSort = () => {
    const nextSort: EmployeeSortOrder =
      applied.sortOrder === "EmployeeAsc" ? "EmployeeDesc" : "EmployeeAsc";
    setDraft((prev) => ({ ...prev, sortOrder: nextSort }));
    setApplied((prev) => ({ ...prev, sortOrder: nextSort }));
    setPage(1);
  };

  const advancedActiveCount = useMemo(() => {
    let count = 0;
    if (applied.roleId) count++;
    if (applied.missingInfo !== "0") count++;
    if (applied.sortOrder !== "EmployeeAsc") count++;
    return count;
  }, [applied.missingInfo, applied.roleId, applied.sortOrder]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    const removeKey = (key: keyof EmployeeListFilters) => {
      const patch: Partial<EmployeeListFilters> =
        key === "companyId"
          ? { companyId: "", departmentId: "" }
          : key === "missingInfo"
            ? { missingInfo: "0" }
            : key === "sortOrder"
              ? { sortOrder: "EmployeeAsc" }
              : { [key]: "" };
      if (key === "companyId" || key === "departmentId") setAppliedDeptLabel("");
      setDraft((prev) => ({ ...prev, ...patch }));
      setApplied((prev) => ({ ...prev, ...patch }));
      setPage(1);
    };

    if (applied.keyword) {
      chips.push({
        key: "keyword",
        label: `Từ khóa: ${applied.keyword}`,
        onRemove: () => removeKey("keyword"),
      });
    }
    if (applied.companyId) {
      const label =
        companyOptions.find((c) => c.value === applied.companyId)?.label ?? `#${applied.companyId}`;
      chips.push({
        key: "companyId",
        label: `Công ty: ${label}`,
        onRemove: () => removeKey("companyId"),
      });
    }
    if (applied.departmentId) {
      const label =
        appliedDeptLabel ||
        departmentOptions.find((d) => d.value === applied.departmentId)?.label ||
        `#${applied.departmentId}`;
      chips.push({
        key: "departmentId",
        label: `Phòng ban: ${label}`,
        onRemove: () => removeKey("departmentId"),
      });
    }
    if (applied.jobId) {
      const label = jobOptions.find((j) => j.value === applied.jobId)?.label ?? `#${applied.jobId}`;
      chips.push({
        key: "jobId",
        label: `Chức vụ: ${label}`,
        onRemove: () => removeKey("jobId"),
      });
    }
    if (applied.roleId) {
      const label = roleOptions.find((r) => r.value === applied.roleId)?.label ?? applied.roleId;
      chips.push({
        key: "roleId",
        label: `Vai trò: ${label}`,
        onRemove: () => removeKey("roleId"),
      });
    }
    if (applied.missingInfo !== "0") {
      const label =
        MISSING_INFO_OPTIONS.find((m) => m.value === applied.missingInfo)?.label ??
        applied.missingInfo;
      chips.push({
        key: "missingInfo",
        label: `Tình trạng: ${label}`,
        onRemove: () => removeKey("missingInfo"),
      });
    }
    if (applied.sortOrder !== "EmployeeAsc") {
      chips.push({
        key: "sortOrder",
        label: "Sắp xếp: Tên Z → A",
        onRemove: () => removeKey("sortOrder"),
      });
    }
    return chips;
  }, [applied, appliedDeptLabel, companyOptions, departmentOptions, jobOptions, roleOptions]);

  const handleExportEmployees = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await employeeListApi.exportEmployees(applied);
      showToast("success", "Đã xuất danh sách nhân viên ra Excel.");
    } catch (cause) {
      showToast("error", getErrorMessage(cause, "Chưa xuất được file Excel. Vui lòng thử lại."));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (downloadingTemplate) return;
    setDownloadingTemplate(true);
    try {
      await employeeListApi.downloadTemplate();
      showToast("success", "Đã tải file mẫu nhân viên.");
    } catch (cause) {
      showToast("error", getErrorMessage(cause, "Chưa tải được file mẫu. Vui lòng thử lại."));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.userId || deleteTarget.id || "";
    const displayName = deleteTarget.fullName?.trim() || deleteTarget.userName?.trim() || targetId;
    if (!targetId) return;

    setIsDeleting(true);
    try {
      await userApi.remove(targetId);
      showToast("success", `Đã xóa nhân viên "${displayName}".`);
      setDeleteTarget(null);
      setRevision((v) => v + 1);
    } catch (cause) {
      showToast("error", getErrorMessage(cause, "Chưa xóa được nhân viên. Vui lòng thử lại."));
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditEmployee = (row: EmployeeListItemDto) => {
    setDialogEmployee(row);
    setDialogOpen(true);
  };

  const columns = useMemo<TableColumn<EmployeeListItemDto>[]>(
    () => [
      {
        key: "employee",
        header: "Họ tên",
        width: proportional(2.1, { minWidth: 220 }),
        renderCell: (row) => {
          const fullName = row.fullName?.trim() || row.userName?.trim() || "Chưa có tên";
          const rowId = row.userId || row.id;
          return (
            <button
              type="button"
              disabled={!rowId}
              onClick={() => openEditEmployee(row)}
              className="w-full text-left ds-interactive hover:opacity-85 disabled:cursor-default"
            >
              <UserIdentityCell
                name={fullName}
                subtitle={row.jobTitle?.trim() || undefined}
                size="sm"
              />
            </button>
          );
        },
      },
      {
        key: "jobPosition",
        header: "Nhóm chức vụ",
        width: pixel(158),
        renderCell: (row) => {
          const jobName = row.jobPosition?.name || row.jobPositionName || "";
          return jobName ? (
            <TagBadge label={jobName} tone="blue" />
          ) : (
            <span className="text-xs text-secondary">—</span>
          );
        },
      },
      {
        key: "department",
        header: "Phòng ban",
        width: proportional(1.4, { minWidth: 150 }),
        renderCell: (row) => {
          const deptName = row.department?.name || row.departmentName || "";
          return deptName ? (
            <span className="line-clamp-2 text-sm text-primary">{deptName}</span>
          ) : (
            <span className="text-xs text-secondary">—</span>
          );
        },
      },
      {
        key: "email",
        header: "Email",
        headerIcon: <Mail className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />,
        width: proportional(1.5, { minWidth: 175 }),
        renderCell: (row) => {
          const email = row.email?.trim() ?? "";
          return email ? (
            <span className="block truncate text-sm text-secondary" title={email}>
              {email}
            </span>
          ) : (
            <TagBadge label="Thiếu Email" tone="orange" />
          );
        },
      },
      {
        key: "employeeCode",
        header: "Mã HT",
        headerIcon: <IdCard className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />,
        width: pixel(136),
        renderCell: (row) => {
          const code = row.systemCode?.trim() ?? "";
          return code ? (
            <span className="ds-profile-code-pill">{code}</span>
          ) : (
            <TagBadge label="Thiếu Mã HT" tone="orange" />
          );
        },
      },
      {
        key: "company",
        header: "Công ty",
        width: proportional(1.4, { minWidth: 160 }),
        renderCell: (row) => {
          const matched = row.companyId != null ? companiesById.get(row.companyId) : undefined;
          const companyName = row.companyName || matched?.companyName || "";
          if (!companyName && !matched?.companyCode) {
            return <span className="text-xs text-secondary">—</span>;
          }
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <CompanyChip
                companyCode={matched?.companyCode ?? undefined}
                companyName={companyName}
              />
              {matched?.companyCode && companyName && matched.companyCode !== companyName ? (
                <span className="truncate text-xs text-secondary" title={companyName}>
                  {companyName}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Thao tác",
        width: pixel(120),
        align: "end",
        renderCell: (row) => {
          const rowId = row.userId || row.id;
          const fullName = row.fullName?.trim() || row.userName?.trim() || "";
          return (
            <div className="inline-flex items-center gap-1">
              <AppIconButton
                label={`Chỉnh sửa ${fullName}`}
                tooltip="Chỉnh sửa"
                icon={<Pencil className="h-4 w-4" />}
                isDisabled={!rowId}
                onClick={() => openEditEmployee(row)}
              />
              <AppIconButton
                label={`Xóa ${fullName}`}
                tooltip="Xóa nhân viên"
                icon={<Trash2 className="h-4 w-4 text-error" />}
                isDisabled={!rowId}
                onClick={() => setDeleteTarget(row)}
              />
            </div>
          );
        },
      },
    ],
    [companiesById],
  );

  return (
    <PageFrame>
      <PageHeader
        artwork="organization"
        icon={<Users className="h-5 w-5" />}
        eyebrow="Quản trị hệ thống · Nhân sự"
        title="Quản lý nhân viên"
        description="Tra cứu hồ sơ nhân sự, phân nhóm biểu mẫu, vai trò, HR phụ trách và tình trạng đồng bộ thông tin."
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              isDisabled={isLoading}
              onClick={() => setRevision((v) => v + 1)}
            />
            <AppButton
              label="Thêm nhân viên"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setDialogEmployee(null);
                setDialogOpen(true);
              }}
            />
          </>
        }
      />

      <FilterBar
        primaryControls={
          <>
            <div ref={searchWrapRef} className="w-full sm:min-w-[200px] sm:flex-1">
              <AppTextInput
                label="Tìm kiếm"
                value={draft.keyword}
                onChange={(keyword) => setDraft((p) => ({ ...p, keyword }))}
                placeholder="Tên nhân viên hoặc Mã HT (phím /)..."
                startIcon="search"
                hasClear
                onEnter={handleApplyFilters}
              />
            </div>
            <div className="w-full sm:w-[210px]">
              <AppSelect
                label="Công ty"
                value={draft.companyId}
                onChange={(companyId) =>
                  setDraft((p) => ({ ...p, companyId, departmentId: "" }))
                }
                options={companyOptions}
                placeholder="Tất cả công ty"
              />
            </div>
            <div className="w-full sm:w-[210px]">
              <AppSelect
                label="Phòng ban"
                value={draft.departmentId}
                onChange={(departmentId) => setDraft((p) => ({ ...p, departmentId }))}
                options={departmentOptions}
                placeholder={
                  !draft.companyId
                    ? "Chọn công ty trước"
                    : departmentsLoading
                      ? "Đang tải..."
                      : "Tất cả phòng ban"
                }
                isDisabled={!draft.companyId || departmentsLoading}
              />
            </div>
            <div className="w-full sm:w-[190px]">
              <AppSelect
                label="Nhóm chức vụ"
                value={draft.jobId}
                onChange={(jobId) => setDraft((p) => ({ ...p, jobId }))}
                options={jobOptions}
                placeholder="Tất cả chức vụ"
              />
            </div>
          </>
        }
        advancedControls={
          <>
            <AppSelect
              label="Nhóm vai trò"
              value={draft.roleId}
              onChange={(roleId) => setDraft((p) => ({ ...p, roleId }))}
              options={roleOptions}
              placeholder="Tất cả nhóm vai trò"
            />
            <AppSelect
              label="Tình trạng thông tin"
              value={draft.missingInfo}
              onChange={(val) =>
                setDraft((p) => ({
                  ...p,
                  missingInfo: (val || "0") as MissingInfoFilterValue,
                }))
              }
              options={MISSING_INFO_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
              placeholder="Không lọc"
              hasClear={false}
              hasSearch={false}
            />
            <AppSelect
              label="Sắp xếp họ tên"
              value={draft.sortOrder}
              onChange={(val) =>
                setDraft((p) => ({
                  ...p,
                  sortOrder: (val || "EmployeeAsc") as EmployeeSortOrder,
                }))
              }
              options={EMPLOYEE_SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              placeholder="Tên A → Z"
              hasClear={false}
              hasSearch={false}
            />
          </>
        }
        advancedActiveCount={advancedActiveCount}
        chips={activeChips}
        onApply={handleApplyFilters}
        onReset={activeChips.length > 0 ? handleResetFilters : undefined}
        isApplyDisabled={isLoading}
      />

      <DataTable
        data={items}
        columns={columns}
        idKey={(row) => String(row.userId || row.id)}
        isLoading={isLoading}
        error={error}
        isUnauthorized={isUnauthorized}
        loginNextPath="/admin/UserInfor"
        onRetry={() => setRevision((v) => v + 1)}
        emptyTitle={
          activeChips.length > 0 ? "Không tìm thấy nhân viên phù hợp" : "Chưa có dữ liệu nhân viên"
        }
        emptyDescription={
          activeChips.length > 0
            ? "Thử điều chỉnh từ khóa hoặc xóa bớt tiêu chí lọc để xem toàn bộ nhân sự."
            : "Nhấn Thêm nhân viên để bắt đầu tạo hồ sơ nhân sự."
        }
        emptyActions={
          activeChips.length > 0 ? (
            <AppButton
              label="Xóa bộ lọc"
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
            />
          ) : (
            <AppButton
              label="Thêm nhân viên"
              variant="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setDialogEmployee(null);
                setDialogOpen(true);
              }}
            />
          )
        }
        headerSlot={
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-primary">Danh sách nhân viên</span>
              <span className="ds-count-pill">
                {isLoading ? "…" : total.toLocaleString("vi-VN")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AppButton
                label={applied.sortOrder === "EmployeeDesc" ? "Tên: Z → A" : "Tên: A → Z"}
                variant="secondary"
                size="sm"
                icon={
                  applied.sortOrder === "EmployeeDesc" ? (
                    <ArrowUpZA className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                  )
                }
                onClick={handleToggleSort}
              />
              <AppButton
                label="Import Excel"
                variant="secondary"
                size="sm"
                icon={<Upload className="h-3.5 w-3.5" />}
                isDisabled
              />
              <AppButton
                label={exporting ? "Đang xuất..." : "Xuất Excel"}
                variant="secondary"
                size="sm"
                icon={<Download className="h-3.5 w-3.5" />}
                isLoading={exporting}
                isDisabled={isLoading || exporting}
                onClick={() => void handleExportEmployees()}
              />
              <AppButton
                label={downloadingTemplate ? "Đang tải..." : "File mẫu"}
                variant="secondary"
                size="sm"
                icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                isLoading={downloadingTemplate}
                isDisabled={downloadingTemplate}
                onClick={() => void handleDownloadTemplate()}
              />
            </div>
          </div>
        }
        pagination={{
          page,
          pageSize,
          totalItems: total,
          pageSizeOptions: [10, 20, 50],
          onPageChange: setPage,
          onPageSizeChange: (nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          },
          itemLabel: "nhân viên",
        }}
      />

      <EmployeeAdminDialog
        isOpen={dialogOpen}
        employee={dialogEmployee}
        companies={companies}
        jobs={jobPositions}
        roles={roleCatalog}
        onClose={() => setDialogOpen(false)}
        onSaved={() => setRevision((v) => v + 1)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa nhân viên?"
        description={
          deleteTarget
            ? `Bạn đang xóa nhân viên "${deleteTarget.fullName || deleteTarget.userName || deleteTarget.id}"${
                deleteTarget.systemCode ? ` (${deleteTarget.systemCode})` : ""
              }. Thao tác này không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xóa nhân viên"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </PageFrame>
  );
}
