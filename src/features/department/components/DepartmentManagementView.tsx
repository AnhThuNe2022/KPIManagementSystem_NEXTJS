"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  ActiveStatus,
  AppButton,
  AppForm,
  AppIconButton,
  AppSelect,
  AppSwitch,
  AppTextArea,
  AppTextInput,
  CompanyChip,
  ConfirmDialog,
  DataTable,
  FilterBar,
  FormDrawer,
  MetricStrip,
  PageFrame,
  PageHeader,
  StatusFilterTabs,
  ViewModeToggle,
  pixel,
  proportional,
  useAppToast,
  type ActiveFilterChip,
  type SelectOption,
  type TableColumn,
} from "@/components/ds";
import {
  ACTIVE_FILTER_OPTIONS,
  resolveDepartmentIcon,
} from "@/design-system/registries";
import { companyApi } from "@/features/company/services/companyApi";
import type { CompanyDto } from "@/features/company/types";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { departmentApi } from "../services/departmentApi";
import type { DepartmentDraft, DepartmentDto } from "../types";

const VIEW_STORAGE_KEY = "department-view";

function readSavedViewMode(): "table" | "grid" {
  try {
    if (typeof window !== "undefined" && typeof window.localStorage?.getItem === "function") {
      return window.localStorage.getItem(VIEW_STORAGE_KEY) === "grid" ? "grid" : "table";
    }
  } catch {
    // Ignore storage error
  }
  return "table";
}

const EMPTY_DRAFT: DepartmentDraft = {
  id: 0,
  name: "",
  description: "",
  companyId: 0,
  isActive: true,
};

export function DepartmentManagementView() {
  const showToast = useAppToast();

  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [keywordInput, setKeywordInput] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [reloadTick, setReloadTick] = useState(0);

  // Slide-over FormDrawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentDto | null>(null);
  const [draft, setDraft] = useState<DepartmentDraft>(EMPTY_DRAFT);
  const [initialDraft, setInitialDraft] = useState<DepartmentDraft>(EMPTY_DRAFT);
  const [formErrors, setFormErrors] = useState<{ name?: string; companyId?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<DepartmentDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setViewMode(readSavedViewMode());
  }, []);

  const handleViewModeChange = (next: "table" | "grid") => {
    setViewMode(next);
    try {
      if (typeof window !== "undefined" && typeof window.localStorage?.setItem === "function") {
        window.localStorage.setItem(VIEW_STORAGE_KEY, next);
      }
    } catch {
      // Ignore storage error
    }
  };

  // Debounce keyword 300ms
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keywordInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  // Load companies (HR compile scope)
  useEffect(() => {
    const ctrl = new AbortController();
    companyApi
      .getForHrCompile(ctrl.signal)
      .then((list) => {
        if (!ctrl.signal.aborted) setCompanies(list);
      })
      .catch(() => {
        // Fallback silently; list will still load
      });
    return () => ctrl.abort();
  }, []);

  // Load departments
  const loadDepartments = useCallback(async () => {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const list = await departmentApi.list(companyId, debouncedKeyword, {
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setDepartments(list);
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Không thể tải danh sách phòng ban."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [companyId, debouncedKeyword]);

  useEffect(() => {
    void loadDepartments();
    return () => fetchCtrlRef.current?.abort();
  }, [loadDepartments, reloadTick]);

  const companyMap = useMemo(() => {
    const map = new Map<number, CompanyDto>();
    for (const c of companies) map.set(c.id, c);
    return map;
  }, [companies]);

  const stats = useMemo(() => {
    let activeCount = 0;
    const companyIds = new Set<number>();
    for (const d of departments) {
      if (d.isActive) activeCount += 1;
      if (d.companyId) companyIds.add(d.companyId);
    }
    return {
      total: departments.length,
      active: activeCount,
      inactive: departments.length - activeCount,
      companies: companyIds.size,
    };
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    if (statusFilter === "active") return departments.filter((d) => d.isActive);
    if (statusFilter === "inactive") return departments.filter((d) => !d.isActive);
    return departments;
  }, [departments, statusFilter]);

  const pagedDepartments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDepartments.slice(start, start + pageSize);
  }, [filteredDepartments, page, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredDepartments.length / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [filteredDepartments.length, page, pageSize]);

  const isDrawerDirty = useMemo(
    () =>
      draft.name !== initialDraft.name ||
      draft.description !== initialDraft.description ||
      draft.companyId !== initialDraft.companyId ||
      draft.isActive !== initialDraft.isActive,
    [draft, initialDraft],
  );

  // Preserve existing company option on edit even if not present in getForHrCompile list
  const drawerCompanyOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = companies.map((c) => ({
      value: String(c.id),
      label: c.companyCode ? `${c.companyName} (${c.companyCode})` : c.companyName,
    }));
    if (
      editingDept &&
      editingDept.companyId &&
      !companies.some((c) => c.id === editingDept.companyId)
    ) {
      opts.unshift({
        value: String(editingDept.companyId),
        label: editingDept.companyName || `Công ty #${editingDept.companyId}`,
      });
    }
    return opts;
  }, [companies, editingDept]);

  const openCreate = () => {
    const next: DepartmentDraft = {
      ...EMPTY_DRAFT,
      companyId: companyId ? Number(companyId) : companies[0]?.id ?? 0,
    };
    setEditingDept(null);
    setDraft(next);
    setInitialDraft(next);
    setFormErrors({});
    setDrawerOpen(true);
  };

  const openEdit = (dept: DepartmentDto) => {
    const next: DepartmentDraft = {
      id: dept.id,
      name: dept.name,
      description: dept.description ?? "",
      companyId: dept.companyId,
      isActive: Boolean(dept.isActive),
    };
    setEditingDept(dept);
    setDraft(next);
    setInitialDraft(next);
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleCopyName = async (name: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(name);
        showToast("info", `Đã sao chép "${name}".`);
      }
    } catch {
      showToast("warning", "Trình duyệt không hỗ trợ sao chép nhanh.");
    }
  };

  const handleSave = async () => {
    const nextErrors: { name?: string; companyId?: string } = {};
    if (!draft.name.trim()) nextErrors.name = "Vui lòng nhập tên phòng ban.";
    if (!draft.companyId || draft.companyId <= 0) {
      nextErrors.companyId = "Vui lòng chọn công ty trực thuộc.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      await departmentApi.save(draft);
      showToast(
        "success",
        draft.id > 0 ? "Đã cập nhật phòng ban thành công." : "Đã tạo phòng ban mới thành công.",
      );
      setDrawerOpen(false);
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể lưu thông tin phòng ban."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await departmentApi.remove(deleteTarget.id);
      showToast("success", `Đã xóa phòng ban "${deleteTarget.name}".`);
      setDeleteTarget(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể xóa phòng ban."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setKeywordInput("");
    setDebouncedKeyword("");
    setCompanyId("");
    setStatusFilter("all");
    setPage(1);
  };

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (debouncedKeyword) {
      chips.push({
        key: "keyword",
        label: `Tên: ${debouncedKeyword}`,
        onRemove: () => {
          setKeywordInput("");
          setDebouncedKeyword("");
        },
      });
    }
    if (companyId) {
      const name = companies.find((c) => String(c.id) === companyId)?.companyName ?? companyId;
      chips.push({
        key: "companyId",
        label: `Công ty: ${name}`,
        onRemove: () => {
          setCompanyId("");
          setPage(1);
        },
      });
    }
    return chips;
  }, [companies, companyId, debouncedKeyword]);

  const columns = useMemo<TableColumn<DepartmentDto>[]>(
    () => [
      {
        key: "name",
        header: "Phòng ban",
        width: proportional(2),
        renderCell: (row) => {
          const DeptIcon = resolveDepartmentIcon(row.name);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-subtle text-blue-vivid">
                <DeptIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="block max-w-full truncate text-left text-sm font-medium text-primary hover:text-accent hover:underline"
                  title={row.name}
                >
                  {row.name}
                </button>
                {row.description ? (
                  <div className="truncate text-xs text-secondary" title={row.description}>
                    {row.description}
                  </div>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        key: "company",
        header: "Công ty trực thuộc",
        width: proportional(1.5),
        renderCell: (row) => {
          const company = companyMap.get(row.companyId);
          return (
            <CompanyChip
              companyCode={company?.companyCode}
              companyName={row.companyName || company?.companyName}
            />
          );
        },
      },
      {
        key: "status",
        header: "Trạng thái",
        width: pixel(165),
        renderCell: (row) => <ActiveStatus isActive={row.isActive} />,
      },
      {
        key: "actions",
        header: "Thao tác",
        width: pixel(156),
        align: "end",
        renderCell: (row) => (
          <div className="inline-flex items-center gap-1">
            <AppIconButton
              label={`Sao chép tên ${row.name}`}
              icon={<Copy className="h-4 w-4" />}
              onClick={() => void handleCopyName(row.name)}
            />
            <AppIconButton
              label={`Chỉnh sửa ${row.name}`}
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => openEdit(row)}
            />
            <AppIconButton
              label={`Xóa ${row.name}`}
              icon={<Trash2 className="h-4 w-4 text-error" />}
              onClick={() => setDeleteTarget(row)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyMap],
  );

  return (
    <PageFrame>
      <PageHeader
        artwork="organization"
        icon={<Building2 className="h-5 w-5" />}
        eyebrow="Cơ cấu tổ chức"
        title="Quản lý phòng ban"
        description="Thiết lập danh mục phòng ban trực thuộc các đơn vị thành viên Tập đoàn Đèo Cả."
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setReloadTick((t) => t + 1)}
            />
            <AppButton
              label="Thêm phòng ban"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            />
          </>
        }
      />

      <MetricStrip
        items={[
          {
            id: "total",
            label: "Tổng phòng ban",
            value: stats.total,
            tone: "blue",
            icon: <Layers className="h-5 w-5" />,
          },
          {
            id: "active",
            label: "Đang hoạt động",
            value: stats.active,
            tone: "green",
            icon: <CheckCircle2 className="h-5 w-5" />,
          },
          {
            id: "inactive",
            label: "Tạm ngưng",
            value: stats.inactive,
            tone: "orange",
            icon: <PauseCircle className="h-5 w-5" />,
          },
          {
            id: "companies",
            label: "Đơn vị có phòng ban",
            value: stats.companies,
            tone: "neutral",
            icon: <Building2 className="h-5 w-5" />,
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilterTabs
          label="Lọc theo trạng thái hoạt động"
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val as "all" | "active" | "inactive");
            setPage(1);
          }}
          items={ACTIVE_FILTER_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            count:
              opt.value === "all"
                ? stats.total
                : opt.value === "active"
                  ? stats.active
                  : stats.inactive,
          }))}
        />
        <ViewModeToggle value={viewMode} onChange={handleViewModeChange} gridLabel="Lưới" />
      </div>

      <FilterBar
        primaryControls={
          <>
            <div className="min-w-[220px] flex-1">
              <AppTextInput
                label="Tìm kiếm phòng ban"
                value={keywordInput}
                onChange={setKeywordInput}
                placeholder="Nhập tên phòng ban..."
                startIcon="search"
                hasClear
              />
            </div>
            <div className="w-full sm:w-[260px]">
              <AppSelect
                label="Công ty"
                value={companyId}
                onChange={(val) => {
                  setCompanyId(val);
                  setPage(1);
                }}
                options={companies.map((c) => ({
                  value: String(c.id),
                  label: c.companyName,
                }))}
                placeholder="Tất cả công ty"
              />
            </div>
          </>
        }
        chips={activeChips}
        onReset={activeChips.length > 0 || statusFilter !== "all" ? handleResetFilters : undefined}
      />

      <DataTable
        data={pagedDepartments}
        columns={columns}
        idKey={(row) => String(row.id)}
        viewMode={viewMode}
        isLoading={isLoading}
        error={error}
        isUnauthorized={isUnauthorized}
        loginNextPath="/departments"
        onRetry={() => setReloadTick((t) => t + 1)}
        emptyTitle="Chưa có phòng ban nào"
        emptyDescription="Thử thay đổi bộ lọc hoặc nhấn Thêm phòng ban để khởi tạo."
        emptyActions={
          <AppButton
            label="Thêm phòng ban"
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          />
        }
        renderCard={(dept) => {
          const DeptIcon = resolveDepartmentIcon(dept.name);
          const company = companyMap.get(dept.companyId);
          return (
            <Card padding={4} elevation="low">
              <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-subtle text-blue-vivid">
                      <DeptIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-primary" title={dept.name}>
                        {dept.name}
                      </div>
                      <div className="mt-0.5">
                        <CompanyChip
                          companyCode={company?.companyCode}
                          companyName={dept.companyName || company?.companyName}
                        />
                      </div>
                    </div>
                  </div>
                  <ActiveStatus isActive={dept.isActive} compact />
                </div>

                <p className="line-clamp-2 min-h-[36px] text-xs text-secondary">
                  {dept.description?.trim() || "Chưa có mô tả chi tiết cho phòng ban này."}
                </p>

                <div className="flex items-center justify-end gap-1 border-t border-border pt-2.5">
                  <AppIconButton
                    label={`Sao chép tên ${dept.name}`}
                    icon={<Copy className="h-4 w-4" />}
                    onClick={() => void handleCopyName(dept.name)}
                  />
                  <AppIconButton
                    label={`Chỉnh sửa ${dept.name}`}
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => openEdit(dept)}
                  />
                  <AppIconButton
                    label={`Xóa ${dept.name}`}
                    icon={<Trash2 className="h-4 w-4 text-error" />}
                    onClick={() => setDeleteTarget(dept)}
                  />
                </div>
              </div>
            </Card>
          );
        }}
        pagination={{
          page,
          pageSize,
          totalItems: filteredDepartments.length,
          pageSizeOptions: [12, 24, 48],
          onPageChange: setPage,
          onPageSizeChange: (nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          },
          itemLabel: "phòng ban",
        }}
      />

      <FormDrawer
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        width={500}
        headerIcon={(() => {
          const DrawerIcon =
            draft.id > 0 ? resolveDepartmentIcon(draft.name || editingDept?.name || "") : Building2;
          return <DrawerIcon className="h-5 w-5" />;
        })()}
        title={draft.id > 0 ? "Chỉnh sửa phòng ban" : "Thêm phòng ban mới"}
        subtitle={
          draft.id > 0
            ? editingDept?.name || "Cập nhật thông tin phòng ban"
            : "Thiết lập thông tin đơn vị trong hệ thống KPI"
        }
        isDirty={isDrawerDirty}
        isSubmitting={isSaving}
        submitLabel={draft.id > 0 ? "Lưu thay đổi" : "Thêm phòng ban"}
        submitIcon={<Check className="h-4 w-4" />}
        submitDisabled={draft.id > 0 && !isDrawerDirty}
        onSubmit={handleSave}
      >
        <AppForm>
          <div className="flex flex-col gap-5">
            <AppTextInput
              label="Tên phòng ban"
              value={draft.name}
              onChange={(name) => {
                setDraft((p) => ({ ...p, name }));
                setFormErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder="Ví dụ: Ban Công nghệ Thông tin & Chuyển đổi số"
              isRequired
              error={formErrors.name}
            />

            <AppSelect
              label="Công ty trực thuộc"
              value={draft.companyId > 0 ? String(draft.companyId) : ""}
              onChange={(val) => {
                setDraft((p) => ({ ...p, companyId: val ? Number(val) : 0 }));
                setFormErrors((e) => ({ ...e, companyId: undefined }));
              }}
              options={drawerCompanyOptions}
              placeholder="Chọn công ty..."
              isRequired
              hasClear={false}
              error={formErrors.companyId}
            />

            <div className="relative">
              <span className="ds-field-optional">Không bắt buộc</span>
              <AppTextArea
                label="Mô tả"
                value={draft.description}
                onChange={(description) => setDraft((p) => ({ ...p, description }))}
                placeholder="Chức năng hoặc ghi chú về phòng ban..."
                rows={4}
              />
            </div>

            <div className="mt-1 border-y border-border py-4">
              <AppSwitch
                label="Trạng thái hoạt động"
                labelPosition="start"
                labelSpacing="spread"
                description={
                  draft.isActive
                    ? "Phòng ban đang được sử dụng trong hệ thống."
                    : "Phòng ban được đánh dấu tạm ngưng hoạt động."
                }
                value={draft.isActive}
                onChange={(isActive) => setDraft((p) => ({ ...p, isActive }))}
              />
            </div>
          </div>
        </AppForm>
      </FormDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa phòng ban?"
        description={
          deleteTarget ? (
            <div className="flex flex-col gap-3">
              <p>
                Bạn đang xóa <strong className="font-semibold text-primary">{deleteTarget.name}</strong>.
                Thao tác này không thể hoàn tác.
              </p>
              <div className="ds-form-section flex items-center justify-between gap-2 p-3">
                <CompanyChip
                  companyCode={companyMap.get(deleteTarget.companyId)?.companyCode}
                  companyName={
                    deleteTarget.companyName || companyMap.get(deleteTarget.companyId)?.companyName
                  }
                />
                <ActiveStatus isActive={deleteTarget.isActive} compact />
              </div>
            </div>
          ) : (
            ""
          )
        }
        cancelLabel="Giữ lại"
        confirmLabel="Xóa phòng ban"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </PageFrame>
  );
}
