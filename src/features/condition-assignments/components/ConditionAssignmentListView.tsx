"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Pencil, Plus, RefreshCw, SlidersHorizontal, Trash2 } from "lucide-react";
import {
  ActiveStatus,
  AppButton,
  AppIconButton,
  AppPagination,
  AppSelect,
  AppTextInput,
  CompanyChip,
  ConditionStatusTag,
  ConfirmDialog,
  DataTable,
  FilterBar,
  PageFrame,
  PageHeader,
  ScopeTypeBadge,
  StatusFilterTabs,
  UserIdentityCell,
  ViewModeToggle,
  pixel,
  proportional,
  useAppToast,
  type ActiveFilterChip,
  type TableColumn,
} from "@/components/ds";
import {
  ACTIVE_STATUS_REGISTRY,
  ADMIN_CONDITION_OPTIONS,
  AssignmentScopeType,
  CONDITION_STATUS_REGISTRY,
  STANDARD_CONDITION_OPTIONS,
  type ConditionStatus,
} from "@/design-system/registries";
import { useAuth } from "@/features/auth/AuthProvider";
import { isAdminRole } from "@/features/auth/types";
import { companyApi } from "@/features/company/services/companyApi";
import type { CompanyDto } from "@/features/company/types";
import { departmentApi } from "@/features/department/services/departmentApi";
import type { DepartmentDto } from "@/features/department/types";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { conditionAssignmentApi } from "../services/conditionAssignmentApi";
import type {
  ConditionAssignmentDto,
  ConditionAssignmentFilterState,
  ConditionAssignmentUserOption,
} from "../types";
import { ConditionAssignmentEditorDialog } from "./ConditionAssignmentEditorDialog";

const VIEW_STORAGE_KEY = "condition-assignment-view-v2";

const INITIAL_FILTERS: ConditionAssignmentFilterState = {
  keyword: "",
  isActive: "",
  userId: "",
  statusCondition: "",
  scopeType: "",
  companyId: "",
  departmentId: "",
};

const SCOPE_OPTIONS = [
  { value: String(AssignmentScopeType.Company), label: "Công ty" },
  { value: String(AssignmentScopeType.Department), label: "Phòng ban" },
];

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "true", label: ACTIVE_STATUS_REGISTRY.active.label },
  { value: "false", label: ACTIVE_STATUS_REGISTRY.inactive.label },
];

function readSavedViewMode(): "table" | "grid" {
  try {
    if (typeof window !== "undefined" && typeof window.localStorage?.getItem === "function") {
      return window.localStorage.getItem(VIEW_STORAGE_KEY) === "grid" ? "grid" : "table";
    }
  } catch {
    // Ignore
  }
  return "table";
}

export function ConditionAssignmentListView() {
  const { user } = useAuth();
  const showToast = useAppToast();

  const isAdmin = isAdminRole(user?.roles);
  const allowedConditions: ConditionStatus[] = isAdmin
    ? ADMIN_CONDITION_OPTIONS
    : STANDARD_CONDITION_OPTIONS;

  const [keywordInput, setKeywordInput] = useState("");
  const [filters, setFilters] = useState<ConditionAssignmentFilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [reloadTick, setReloadTick] = useState(0);

  const [items, setItems] = useState<ConditionAssignmentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Lookups
  const [filterUsers, setFilterUsers] = useState<ConditionAssignmentUserOption[]>([]);
  const [allUsers, setAllUsers] = useState<ConditionAssignmentUserOption[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [filterDepartments, setFilterDepartments] = useState<DepartmentDto[]>([]);
  const [deptNameCache, setDeptNameCache] = useState<Record<string, string>>({});

  // Dialog states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConditionAssignmentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConditionAssignmentDto | null>(null);
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
      // Ignore
    }
  };

  // Debounce keyword 300ms
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) =>
        prev.keyword === keywordInput.trim() ? prev : { ...prev, keyword: keywordInput.trim() },
      );
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  // Initial lookups
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      companyApi.getAll(ctrl.signal).catch(() => []),
      conditionAssignmentApi.getUsers(true, ctrl.signal).catch(() => []),
      conditionAssignmentApi.getUsers(false, ctrl.signal).catch(() => []),
    ]).then(([companyList, screenUsers, fullUsers]) => {
      if (ctrl.signal.aborted) return;
      setCompanies(companyList);
      setFilterUsers(screenUsers);
      setAllUsers(fullUsers);
    });
    return () => ctrl.abort();
  }, []);

  // Conditional department lookup for filter bar
  useEffect(() => {
    if (filters.scopeType !== String(AssignmentScopeType.Department) || !filters.companyId) {
      setFilterDepartments([]);
      return;
    }
    const ctrl = new AbortController();
    departmentApi
      .getAll(filters.companyId, { signal: ctrl.signal })
      .then((list) => {
        if (!ctrl.signal.aborted) setFilterDepartments(list);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setFilterDepartments([]);
      });
    return () => ctrl.abort();
  }, [filters.companyId, filters.scopeType]);

  // Load main page
  const loadPage = useCallback(async () => {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await conditionAssignmentApi.getPage({
        page,
        pageSize,
        filters,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Không thể tải danh sách phân quyền điều kiện."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void loadPage();
    return () => fetchCtrlRef.current?.abort();
  }, [loadPage, reloadTick]);

  // Lazy lookup missing department names for department-scoped rows
  useEffect(() => {
    const missingDeptIds = items.some(
      (item) =>
        Number(item.scopeType) === AssignmentScopeType.Department &&
        !item.departmentName &&
        !item.scopeValue &&
        item.idValue &&
        !deptNameCache[item.idValue],
    );
    if (!missingDeptIds) return;
    const ctrl = new AbortController();
    departmentApi
      .list("", "", { byUnitHrCompile: false, signal: ctrl.signal })
      .then((list) => {
        if (ctrl.signal.aborted) return;
        const map: Record<string, string> = {};
        for (const dept of list) map[String(dept.id)] = dept.name;
        setDeptNameCache((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [deptNameCache, items]);

  const companyById = useMemo(() => {
    const map = new Map<string, CompanyDto>();
    for (const c of companies) map.set(String(c.id), c);
    return map;
  }, [companies]);

  const resolveScopeDisplay = useCallback(
    (row: ConditionAssignmentDto) => {
      const isDept = Number(row.scopeType) === AssignmentScopeType.Department;
      if (isDept) {
        return {
          title:
            row.departmentName ||
            row.scopeValue ||
            (row.idValue ? deptNameCache[row.idValue] : undefined) ||
            `Phòng ban #${row.departmentId ?? row.idValue ?? "—"}`,
          companyCode: row.companyCode,
          companyName: row.companyName,
        };
      }
      const company = row.companyId
        ? companyById.get(String(row.companyId))
        : row.idValue
          ? companyById.get(String(row.idValue))
          : undefined;
      return {
        title: row.companyName || row.scopeValue || company?.companyName || `Công ty #${row.idValue ?? "—"}`,
        companyCode: row.companyCode || company?.companyCode,
        companyName: row.companyName || company?.companyName,
      };
    },
    [companyById, deptNameCache],
  );

  // Grouped view (cluster by user + condition)
  const groupedClusters = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        userId: string;
        fullName: string | null;
        systemCodeUser: string | null;
        statusCondition: string;
        conditionName: string | null;
        rows: ConditionAssignmentDto[];
      }
    >();
    for (const row of items) {
      const key = `${row.userId}::${row.statusCondition}`;
      const existing = map.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(key, {
          key,
          userId: row.userId,
          fullName: row.fullName,
          systemCodeUser: row.systemCodeUser,
          statusCondition: String(row.statusCondition ?? ""),
          conditionName: row.conditionName,
          rows: [row],
        });
      }
    }
    return Array.from(map.values());
  }, [items]);

  const changeScope = useCallback((scopeType: string) => {
    setFilters((p) => ({
      ...p,
      scopeType,
      companyId: scopeType ? p.companyId : "",
      departmentId: "",
    }));
    setPage(1);
  }, []);

  const handleReset = () => {
    setKeywordInput("");
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await conditionAssignmentApi.remove(deleteTarget.id);
      showToast("success", "Đã xóa phân quyền điều kiện thành công.");
      setDeleteTarget(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể xóa phân quyền điều kiện."));
    } finally {
      setIsDeleting(false);
    }
  };

  const advancedActiveCount = useMemo(() => {
    let count = 0;
    if (filters.userId) count++;
    if (filters.companyId) count++;
    if (filters.departmentId) count++;
    return count;
  }, [filters]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.keyword) {
      chips.push({
        key: "keyword",
        label: `Từ khóa: ${filters.keyword}`,
        onRemove: () => {
          setKeywordInput("");
          setFilters((p) => ({ ...p, keyword: "" }));
        },
      });
    }
    if (filters.statusCondition) {
      const label =
        CONDITION_STATUS_REGISTRY[filters.statusCondition as ConditionStatus]?.label ??
        filters.statusCondition;
      chips.push({
        key: "condition",
        label: `Điều kiện: ${label}`,
        onRemove: () => setFilters((p) => ({ ...p, statusCondition: "" })),
      });
    }
    if (filters.scopeType) {
      chips.push({
        key: "scopeType",
        label: `Phạm vi: ${filters.scopeType === "2" ? "Phòng ban" : "Công ty"}`,
        onRemove: () => changeScope(""),
      });
    }
    if (filters.userId) {
      const name = filterUsers.find((u) => u.id === filters.userId)?.fullName ?? filters.userId;
      chips.push({
        key: "userId",
        label: `Nhân sự: ${name}`,
        onRemove: () => setFilters((p) => ({ ...p, userId: "" })),
      });
    }
    if (filters.companyId) {
      const name = companyById.get(filters.companyId)?.companyName ?? filters.companyId;
      chips.push({
        key: "companyId",
        label: `Công ty: ${name}`,
        onRemove: () => setFilters((p) => ({ ...p, companyId: "", departmentId: "" })),
      });
    }
    if (filters.departmentId) {
      const name =
        filterDepartments.find((d) => String(d.id) === filters.departmentId)?.name ??
        filters.departmentId;
      chips.push({
        key: "departmentId",
        label: `Phòng ban: ${name}`,
        onRemove: () => setFilters((p) => ({ ...p, departmentId: "" })),
      });
    }
    return chips;
  }, [changeScope, companyById, filterDepartments, filterUsers, filters]);

  const columns = useMemo<TableColumn<ConditionAssignmentDto>[]>(
    () => [
      {
        key: "user",
        header: "Nhân sự",
        width: proportional(1.8),
        renderCell: (row) => (
          <UserIdentityCell name={row.fullName} subtitle={row.systemCodeUser ?? undefined} />
        ),
      },
      {
        key: "condition",
        header: "Điều kiện nghiệp vụ",
        width: proportional(1.5),
        renderCell: (row) => (
          <ConditionStatusTag
            statusCondition={String(row.statusCondition ?? "")}
            fallbackName={row.conditionName}
          />
        ),
      },
      {
        key: "scopeType",
        header: "Phạm vi",
        width: pixel(124),
        renderCell: (row) => <ScopeTypeBadge scopeType={row.scopeType} />,
      },
      {
        key: "scopeTarget",
        header: "Đơn vị áp dụng",
        width: proportional(1.8),
        renderCell: (row) => {
          const scope = resolveScopeDisplay(row);
          return Number(row.scopeType) === AssignmentScopeType.Department ? (
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-medium text-primary">{scope.title}</span>
              {scope.companyName ? (
                <span className="truncate text-xs text-secondary">{scope.companyName}</span>
              ) : null}
            </div>
          ) : (
            <CompanyChip companyCode={scope.companyCode} companyName={scope.title} />
          );
        },
      },
      {
        key: "description",
        header: "Mô tả",
        width: proportional(1.2),
        renderCell: (row) => (
          <span className="line-clamp-2 text-xs text-secondary">{row.description || "—"}</span>
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        width: pixel(178),
        renderCell: (row) => <ActiveStatus isActive={row.isActive} />,
      },
      {
        key: "actions",
        header: "Thao tác",
        width: pixel(120),
        align: "end",
        renderCell: (row) => (
          <div className="inline-flex items-center gap-1">
            <AppIconButton
              label="Chỉnh sửa phân quyền"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => {
                setEditingItem(row);
                setEditorOpen(true);
              }}
            />
            <AppIconButton
              label="Xóa phân quyền"
              icon={<Trash2 className="h-4 w-4 text-error" />}
              onClick={() => setDeleteTarget(row)}
            />
          </div>
        ),
      },
    ],
    [resolveScopeDisplay],
  );

  return (
    <PageFrame>
      <PageHeader
        artwork="organization"
        icon={<SlidersHorizontal className="h-5 w-5" />}
        eyebrow="Phân quyền quy trình"
        title="Phân quyền theo điều kiện"
        description="Thiết lập phạm vi phụ trách phê duyệt, chấm điểm và tổng hợp KPI theo công ty hoặc phòng ban."
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setReloadTick((t) => t + 1)}
            />
            <AppButton
              label="Thêm phân quyền"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingItem(null);
                setEditorOpen(true);
              }}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilterTabs
          label="Trạng thái kích hoạt"
          items={STATUS_TABS}
          value={filters.isActive}
          onChange={(isActive) => {
            setFilters((p) => ({ ...p, isActive }));
            setPage(1);
          }}
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-secondary">
            Tổng <strong className="font-semibold text-primary">{total}</strong> bản ghi
          </span>
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} gridLabel="Nhóm" />
        </div>
      </div>

      <FilterBar
        primaryControls={
          <>
            <div className="min-w-[200px] flex-1">
              <AppTextInput
                label="Tìm kiếm"
                value={keywordInput}
                onChange={setKeywordInput}
                placeholder="Tên nhân sự, mã nhân sự, phạm vi..."
                startIcon="search"
                hasClear
              />
            </div>
            <div className="w-full sm:w-[220px]">
              <AppSelect
                label="Điều kiện nghiệp vụ"
                value={filters.statusCondition}
                onChange={(statusCondition) => {
                  setFilters((p) => ({ ...p, statusCondition }));
                  setPage(1);
                }}
                options={allowedConditions.map((key) => ({
                  value: key,
                  label: CONDITION_STATUS_REGISTRY[key].label,
                }))}
                placeholder="Tất cả điều kiện"
              />
            </div>
            <div className="w-full sm:w-[170px]">
              <AppSelect
                label="Loại phạm vi"
                value={filters.scopeType}
                onChange={changeScope}
                options={SCOPE_OPTIONS}
                placeholder="Tất cả phạm vi"
                hasSearch={false}
              />
            </div>
          </>
        }
        advancedControls={
          <>
            <AppSelect
              label="Nhân sự"
              value={filters.userId}
              onChange={(userId) => {
                setFilters((p) => ({ ...p, userId }));
                setPage(1);
              }}
              options={filterUsers.map((u) => ({
                value: u.id,
                label: u.systemCode ? `${u.fullName} (${u.systemCode})` : u.fullName,
              }))}
              placeholder="Tất cả nhân sự"
            />
            <AppSelect
              label="Công ty"
              value={filters.companyId}
              onChange={(companyId) => {
                setFilters((p) => ({ ...p, companyId, departmentId: "" }));
                setPage(1);
              }}
              options={companies.map((c) => ({ value: String(c.id), label: c.companyName }))}
              placeholder={filters.scopeType ? "Tất cả công ty" : "Chọn loại phạm vi trước"}
              isDisabled={!filters.scopeType}
              disabledMessage="Chọn loại phạm vi trước để lọc theo công ty"
            />
            <AppSelect
              label="Phòng ban"
              value={filters.departmentId}
              onChange={(departmentId) => {
                setFilters((p) => ({ ...p, departmentId }));
                setPage(1);
              }}
              options={filterDepartments.map((d) => ({ value: String(d.id), label: d.name }))}
              placeholder={
                filters.scopeType !== String(AssignmentScopeType.Department)
                  ? "Chọn phạm vi Phòng ban trước"
                  : !filters.companyId
                    ? "Chọn công ty trước"
                    : "Tất cả phòng ban"
              }
              isDisabled={
                filters.scopeType !== String(AssignmentScopeType.Department) || !filters.companyId
              }
            />
          </>
        }
        advancedActiveCount={advancedActiveCount}
        chips={activeChips}
        onReset={activeChips.length > 0 || filters.isActive ? handleReset : undefined}
      />

      {viewMode === "grid" && !isLoading && !error && groupedClusters.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ds-fade-in">
            {groupedClusters.map((cluster) => (
              <Card key={cluster.key} padding={4} elevation="low">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                    <UserIdentityCell
                      name={cluster.fullName}
                      subtitle={cluster.systemCodeUser ?? undefined}
                    />
                    <ConditionStatusTag
                      statusCondition={cluster.statusCondition}
                      fallbackName={cluster.conditionName}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    {cluster.rows.map((row) => {
                      const scope = resolveScopeDisplay(row);
                      return (
                        <div
                          key={row.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2"
                        >
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <ScopeTypeBadge scopeType={row.scopeType} />
                              <span className="truncate text-xs font-medium text-primary">
                                {scope.title}
                              </span>
                            </div>
                            <ActiveStatus isActive={row.isActive} compact />
                          </div>
                          <div className="inline-flex shrink-0 items-center gap-0.5">
                            <AppIconButton
                              label="Chỉnh sửa"
                              icon={<Pencil className="h-3.5 w-3.5" />}
                              onClick={() => {
                                setEditingItem(row);
                                setEditorOpen(true);
                              }}
                            />
                            <AppIconButton
                              label="Xóa"
                              icon={<Trash2 className="h-3.5 w-3.5 text-error" />}
                              onClick={() => setDeleteTarget(row)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <AppPagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
            itemLabel="phân quyền"
          />
        </div>
      ) : (
        <DataTable
          data={items}
          columns={columns}
          idKey={(row) => String(row.id)}
          isLoading={isLoading}
          error={error}
          isUnauthorized={isUnauthorized}
          loginNextPath="/condition-assignments"
          onRetry={() => setReloadTick((t) => t + 1)}
          emptyTitle="Chưa có phân quyền điều kiện nào"
          emptyDescription="Nhấn Thêm phân quyền để gán phạm vi xử lý cho nhân sự."
          emptyActions={
            <AppButton
              label="Thêm phân quyền"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingItem(null);
                setEditorOpen(true);
              }}
            />
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
            itemLabel: "phân quyền",
          }}
        />
      )}

      <ConditionAssignmentEditorDialog
        isOpen={editorOpen}
        onOpenChange={setEditorOpen}
        editingItem={editingItem}
        users={allUsers}
        companies={companies}
        allowedConditions={allowedConditions}
        onSaved={() => setReloadTick((t) => t + 1)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa phân quyền điều kiện?"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xóa phân quyền của ${deleteTarget.fullName ?? deleteTarget.userId}? Thao tác này không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xóa"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </PageFrame>
  );
}
