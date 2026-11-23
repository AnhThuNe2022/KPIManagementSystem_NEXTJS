"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CheckCircledIcon,
  ChevronDownIcon,
  Cross2Icon,
  DashboardIcon,
  ExclamationTriangleIcon,
  GearIcon,
  GlobeIcon,
  LayersIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  Pencil2Icon,
  PersonIcon,
  PlusIcon,
  ReloadIcon,
  ResetIcon,
  RowsIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { Pagination } from "@/components/ui/Pagination";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import { useAuth } from "@/features/auth/AuthProvider";
import { UserRoleSystem } from "@/features/auth/types";
import { companyApi } from "@/features/company/services/companyApi";
import type { CompanyDto } from "@/features/company/types";
import { departmentApi } from "@/features/department/services/departmentApi";
import { requestMessage } from "@/features/evaluation/evaluationDisplay";
import type { PagedResult } from "@/lib/api/types";
import {
  conditionAssignmentApi,
  type ConditionAssigneeOption,
} from "../services/conditionAssignmentApi";
import {
  AssignmentScopeType,
  SCOPE_TYPE_OPTIONS,
  getConditionMeta,
  getConditionStatusOptions,
  inferScopeType,
  type ConditionAssignmentDto,
  type ConditionAssignmentFilters,
} from "../types";
import { ConditionAssignmentEditor } from "./ConditionAssignmentEditor";
import { CompanyScopeIcon, DepartmentScopeIcon } from "./ScopeIcons";
import "./ConditionAssignmentList.css";

type ViewMode = "table" | "cluster";
const VIEW_STORAGE_KEY = "condition-assignment-view-v2";

const EMPTY_FILTERS: ConditionAssignmentFilters = {
  keyword: "",
  userId: "",
  statusCondition: "",
  scopeType: "",
  companyId: "",
  departmentId: "",
  isActive: "",
};

const STATUS_FILTER_OPTIONS: Array<{ id: ConditionAssignmentFilters["isActive"]; name: string }> = [
  { id: "", name: "Tất cả" },
  { id: "true", name: "Đang hoạt động" },
  { id: "false", name: "Tạm ngưng" },
];

function getInitials(name?: string | null): string {
  const clean = (name ?? "").trim();
  if (!clean) return "?";
  const parts = clean.split(/[\s,._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rowKeyOf(item: ConditionAssignmentDto, index: number): string {
  return [
    item.id ?? "",
    item.statusCondition ?? "",
    item.idValue ?? "",
    item.userId ?? "",
    index,
  ].join(":");
}

function getScopeTarget(item: ConditionAssignmentDto) {
  const isDepartment = inferScopeType(item) === AssignmentScopeType.Department;
  const id = item.idValue ?? (isDepartment ? item.departmentId : item.companyId);
  const name = isDepartment ? item.departmentName : item.companyName;
  return { isDepartment, id: String(id ?? "").trim(), name: name?.trim() || item.scopeValue?.trim() };
}

export function ConditionAssignmentList() {
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.roles?.some(
      (role) =>
        role.trim().toLowerCase() === "admin" ||
        role.trim() === String(UserRoleSystem.Admin),
    ),
  );

  const [filters, setFilters] = useState<ConditionAssignmentFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<ConditionAssignmentFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [revision, setRevision] = useState(0);
  const [descending, setDescending] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [view, setView] = useState<ViewMode>("table");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "table" || saved === "cluster") {
        setView(saved);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  function switchView(next: ViewMode) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Ignore storage access errors
    }
  }

  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [scopeDepartmentNames, setScopeDepartmentNames] = useState<Map<string, string> | null>(null);
  const [filterDepartments, setFilterDepartments] = useState<SearchableSelectOption[]>([]);
  const [deptFilterLoading, setDeptFilterLoading] = useState(false);
  const [filterUsers, setFilterUsers] = useState<ConditionAssigneeOption[]>([]);
  const [result, setResult] = useState<{
    key: string;
    pageResult?: PagedResult<ConditionAssignmentDto>;
    error?: string;
  }>();
  const [editor, setEditor] = useState<ConditionAssignmentDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<ConditionAssignmentDto | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const requestKey = JSON.stringify({ page, pageSize, applied, revision });
  const current = result?.key === requestKey ? result : undefined;
  const loading = !current;
  const pageData = current?.pageResult ?? result?.pageResult;
  const error = current?.error ?? "";
  const showSkeleton = loading && !pageData;

  useEffect(() => {
    const nextKeyword = filters.keyword.trim();
    if (nextKeyword === applied.keyword) return;
    const timer = window.setTimeout(() => {
      setApplied((prev) => (prev.keyword === nextKeyword ? prev : { ...prev, keyword: nextKeyword }));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.keyword, applied.keyword]);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setEditor("new");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      companyApi.getForHrCompile(controller.signal),
      conditionAssignmentApi.getUsers(true, controller.signal),
    ]).then(([companyResult, userResult]) => {
      if (controller.signal.aborted) return;
      if (companyResult.status === "fulfilled") setCompanies(companyResult.value ?? []);
      if (userResult.status === "fulfilled") setFilterUsers(userResult.value ?? []);
    });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (filters.scopeType !== String(AssignmentScopeType.Department) || !filters.companyId) {
      setFilterDepartments([]);
      setDeptFilterLoading(false);
      return;
    }
    const controller = new AbortController();
    setDeptFilterLoading(true);
    departmentApi
      .list(filters.companyId, "", controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setFilterDepartments(rows.map((row) => ({ id: String(row.id), name: row.name })));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFilterDepartments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDeptFilterLoading(false);
      });
    return () => controller.abort();
  }, [filters.scopeType, filters.companyId]);

  useEffect(() => {
    const controller = new AbortController();
    conditionAssignmentApi
      .getPage(page, pageSize, applied, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(response.total / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult({ key: requestKey, pageResult: response });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            pageResult: result?.pageResult,
            error: requestMessage(cause, "Chưa tải được danh sách phân công xử lý điều kiện."),
          });
        }
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const companyOptions = useMemo<SearchableSelectOption[]>(
    () => companies.map((company) => ({ id: String(company.id), name: company.companyName })),
    [companies],
  );

  const conditionOptions = useMemo<SearchableSelectOption[]>(
    () =>
      getConditionStatusOptions(isAdmin).map((option) => ({
        id: option.id,
        name: option.name,
      })),
    [isAdmin],
  );

  const userOptions = useMemo<SearchableSelectOption[]>(() => {
    const map = new Map<string, string>();
    for (const userOption of filterUsers) {
      if (!userOption.id || map.has(userOption.id)) continue;
      map.set(
        userOption.id,
        userOption.systemCode
          ? `${userOption.fullName} · ${userOption.systemCode}`
          : userOption.fullName,
      );
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [filterUsers]);

  const pageItems = useMemo(() => pageData?.items ?? [], [pageData?.items]);
  const needsDepartmentNames = pageItems.some((item) => {
    const { isDepartment, id, name } = getScopeTarget(item);
    return isDepartment && Boolean(id) && !name;
  });

  useEffect(() => {
    if (!needsDepartmentNames || scopeDepartmentNames !== null) return;
    const controller = new AbortController();
    departmentApi
      .list("", "", controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setScopeDepartmentNames(new Map(rows.map(({ id, name }) => [String(id), name])));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [needsDepartmentNames, scopeDepartmentNames, revision]);

  function getScopeName(item: ConditionAssignmentDto) {
    const { isDepartment, id, name } = getScopeTarget(item);
    const lookupName = isDepartment
      ? scopeDepartmentNames?.get(id)
      : companyOptions.find((company) => company.id === id)?.name;
    return name || lookupName || (id ? `#${id}` : "");
  }

  const visible = useMemo(() => {
    if (!descending) return pageItems;
    return [...pageItems].sort((a, b) => {
      const labelA = getConditionMeta(a.conditionName ?? a.statusCondition).label;
      const labelB = getConditionMeta(b.conditionName ?? b.statusCondition).label;
      return labelB.localeCompare(labelA, "vi");
    });
  }, [pageItems, descending]);

  const groupedClusters = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; tone: ReturnType<typeof getConditionMeta>["tone"]; rows: ConditionAssignmentDto[] }
    >();
    for (const item of visible) {
      const meta = getConditionMeta(item.conditionName ?? item.statusCondition);
      const existing = groups.get(meta.label);
      if (existing) {
        existing.rows.push(item);
      } else {
        groups.set(meta.label, { label: meta.label, tone: meta.tone, rows: [item] });
      }
    }
    return Array.from(groups.values());
  }, [visible]);

  const totalAll = pageData?.total ?? 0;
  const advancedFilterCount = [
    applied.userId,
    applied.statusCondition,
    applied.scopeType,
    applied.companyId,
    applied.departmentId,
  ].filter(Boolean).length;
  const hasFilters = Boolean(applied.keyword || advancedFilterCount > 0 || applied.isActive);
  const showDepartmentFilter = filters.scopeType === String(AssignmentScopeType.Department);

  function updateAndApply(patch: Partial<ConditionAssignmentFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setApplied((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function changeScope(scopeType: string) {
    updateAndApply({ scopeType, companyId: scopeType ? filters.companyId : "", departmentId: "" });
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setApplied({ ...filters, keyword: filters.keyword.trim() });
    setPage(1);
    setRevision((v) => v + 1);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  function removeFilterChip(key: keyof ConditionAssignmentFilters) {
    if (key === "scopeType") {
      changeScope("");
    } else if (key === "companyId") {
      updateAndApply({ companyId: "", departmentId: "" });
    } else {
      updateAndApply({ [key]: "" });
    }
  }

  return (
    <div className="ca-page">
      <header className="ca-header">
        <div className="ca-header-copy">
          <div className="ca-title-row">
            <h1>Phân công xử lý điều kiện</h1>
            <span className="ca-total-badge" title="Số phân công phù hợp bộ lọc">
              {showSkeleton ? "—" : totalAll.toLocaleString("vi-VN")}
            </span>
          </div>
          <p>Quản lý người phụ trách theo điều kiện và phạm vi áp dụng</p>
        </div>

        <div className="ca-header-actions">
          <button
            type="button"
            className="ca-btn ca-btn--icon"
            title="Làm mới dữ liệu"
            aria-label="Làm mới dữ liệu"
            disabled={loading}
            onClick={() => setRevision((v) => v + 1)}
          >
            <ReloadIcon className={loading ? "ca-spin" : undefined} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ca-btn ca-btn--primary"
            aria-haspopup="dialog"
            aria-keyshortcuts="n"
            onClick={() => setEditor("new")}
          >
            <PlusIcon aria-hidden="true" />
            <span>Thêm phân công</span>
            <kbd>N</kbd>
          </button>
        </div>
      </header>

      <div className="ca-workspace">
      <section className="ca-table-card" aria-labelledby="ca-list-title">
        <header className="ca-list-head">
          <div className="ca-list-head-main">
            <div className="ca-list-title">
              <h2 id="ca-list-title">Danh sách phân công</h2>
              <span className="ca-list-count" aria-live="polite">
                {loading ? "Đang cập nhật…" : totalAll.toLocaleString("vi-VN") + " phân công"}
              </span>
            </div>
            <div className="ca-status-tabs" role="group" aria-label="Lọc phân công theo trạng thái">
              {STATUS_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id || "all"}
                  type="button"
                  data-status={option.id}
                  aria-pressed={applied.isActive === option.id}
                  aria-controls="ca-assignment-results"
                  onClick={() => updateAndApply({ isActive: option.id })}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>

          <div className="ca-toolbar-controls">
            <form className="ca-search-box ca-toolbar-search" onSubmit={applyFilters} role="search">
              <MagnifyingGlassIcon className="ca-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                id="ca-keyword"
                name="keyword"
                type="search"
                autoComplete="off"
                className="ca-search-input"
                aria-label="Tìm kiếm phân công"
                placeholder="Tìm tên hoặc mã… (/)"
                value={filters.keyword}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, keyword: event.target.value }))
                }
              />
              {filters.keyword && (
                <button
                  type="button"
                  className="ca-search-clear"
                  aria-label="Xóa từ khóa"
                  onClick={() => updateAndApply({ keyword: "" })}
                >
                  <Cross2Icon aria-hidden="true" />
                </button>
              )}
            </form>

            <button
              type="button"
              className="ca-filter-toggle ca-btn"
              data-expanded={filtersExpanded}
              aria-expanded={filtersExpanded}
              aria-controls="ca-filter-panel"
              onClick={() => setFiltersExpanded((value) => !value)}
            >
              <MixerHorizontalIcon aria-hidden="true" />
              <span>Bộ lọc</span>
              {advancedFilterCount > 0 && (
                <span className="ca-filter-badge" aria-label={`${advancedFilterCount} bộ lọc đang bật`}>
                  {advancedFilterCount}
                </span>
              )}
              <ChevronDownIcon className="ca-filter-chevron" aria-hidden="true" />
            </button>

            <div className="ca-view-toggle" data-view={view} role="group" aria-label="Kiểu hiển thị">
              <button
                type="button"
                className="ca-view-btn"
                aria-pressed={view === "table"}
                onClick={() => switchView("table")}
              >
                <RowsIcon aria-hidden="true" />
                <span>Bảng</span>
              </button>
              <button
                type="button"
                className="ca-view-btn"
                aria-pressed={view === "cluster"}
                onClick={() => switchView("cluster")}
              >
                <DashboardIcon aria-hidden="true" />
                <span>Nhóm</span>
              </button>
            </div>
          </div>
        </header>

        <div className="ca-filters-collapse" data-expanded={filtersExpanded} aria-hidden={!filtersExpanded}>
          <div className="ca-filters-collapse-inner">
            <form
              id="ca-filter-panel"
              className="ca-filters-panel"
              onSubmit={applyFilters}
              aria-label="Bộ lọc phân công"
            >
              <div className="ca-filters-grid">
                <div className="ca-filter-field">
                  <label htmlFor="ca-filter-user">Người phụ trách</label>
                  <SearchableSelect
                    id="ca-filter-user"
                    label="Người phụ trách"
                    placeholder="Người phụ trách"
                    value={filters.userId}
                    options={userOptions}
                    onChange={(userId) => updateAndApply({ userId })}
                  />
                </div>

                <div className="ca-filter-field">
                  <label htmlFor="ca-filter-condition">Điều kiện xử lý</label>
                  <SearchableSelect
                    id="ca-filter-condition"
                    label="Điều kiện"
                    placeholder="Điều kiện"
                    value={filters.statusCondition}
                    options={conditionOptions}
                    onChange={(statusCondition) => updateAndApply({ statusCondition })}
                  />
                </div>

                <div className="ca-filter-field">
                  <label htmlFor="ca-filter-scope">Loại phạm vi</label>
                  <SearchableSelect
                    id="ca-filter-scope"
                    label="Phạm vi"
                    placeholder="Phạm vi"
                    value={filters.scopeType}
                    options={SCOPE_TYPE_OPTIONS}
                    onChange={changeScope}
                  />
                </div>

                <div className="ca-filter-field">
                  <label htmlFor="ca-filter-company">Công ty</label>
                  <SearchableSelect
                    id="ca-filter-company"
                    label="Công ty"
                    placeholder={filters.scopeType ? "Công ty" : "Chọn loại phạm vi trước"}
                    value={filters.companyId}
                    options={companyOptions}
                    disabled={!filters.scopeType}
                    onChange={(companyId) => updateAndApply({ companyId, departmentId: "" })}
                  />
                </div>

                {showDepartmentFilter && (
                  <div className="ca-filter-field">
                    <label htmlFor="ca-filter-department">Phòng ban</label>
                    <SearchableSelect
                      id="ca-filter-department"
                      label="Phòng ban"
                      placeholder={filters.companyId ? "Phòng ban" : "Chọn công ty trước"}
                      value={filters.departmentId}
                      options={filterDepartments}
                      disabled={!filters.companyId}
                      loading={deptFilterLoading}
                      onChange={(departmentId) => updateAndApply({ departmentId })}
                    />
                  </div>
                )}

                <div className="ca-filter-actions">
                  <button type="submit" className="ca-btn ca-btn--primary">
                    <MagnifyingGlassIcon aria-hidden="true" />
                    <span>Lọc</span>
                  </button>
                  <button
                    type="button"
                    className="ca-btn"
                    onClick={resetFilters}
                    disabled={!hasFilters && !filters.keyword}
                  >
                    <ResetIcon aria-hidden="true" />
                    <span>Đặt lại</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {hasFilters && (
          <div className="ca-chips" aria-label="Bộ lọc đang áp dụng">
            <span>Đang lọc:</span>
            {applied.keyword && (
              <button type="button" className="ca-chip" onClick={() => removeFilterChip("keyword")}>
                “{applied.keyword}”
                <Cross2Icon aria-hidden="true" />
              </button>
            )}
            {applied.userId && (
              <button type="button" className="ca-chip" onClick={() => removeFilterChip("userId")}>
                {userOptions.find((u) => u.id === applied.userId)?.name || applied.userId}
                <Cross2Icon aria-hidden="true" />
              </button>
            )}
            {applied.statusCondition && (
              <button
                type="button"
                className="ca-chip"
                onClick={() => removeFilterChip("statusCondition")}
              >
                {conditionOptions.find((c) => c.id === applied.statusCondition)?.name ||
                  getConditionMeta(applied.statusCondition).label}
                <Cross2Icon aria-hidden="true" />
              </button>
            )}
            {applied.scopeType && (
              <button type="button" className="ca-chip" onClick={() => removeFilterChip("scopeType")}>
                {SCOPE_TYPE_OPTIONS.find((s) => s.id === applied.scopeType)?.name || applied.scopeType}
                <Cross2Icon aria-hidden="true" />
              </button>
            )}
            {applied.companyId && (
              <button type="button" className="ca-chip" onClick={() => removeFilterChip("companyId")}>
                {companyOptions.find((c) => c.id === applied.companyId)?.name || "Công ty"}
                <Cross2Icon aria-hidden="true" />
              </button>
            )}
            {applied.departmentId && (
              <button
                type="button"
                className="ca-chip"
                onClick={() => removeFilterChip("departmentId")}
              >
                {filterDepartments.find((d) => d.id === applied.departmentId)?.name ||
                  `Phòng ban #${applied.departmentId}`}
                <Cross2Icon aria-hidden="true" />
              </button>
            )}
            {applied.isActive && (
              <button type="button" className="ca-chip" onClick={() => removeFilterChip("isActive")}>
                {applied.isActive === "true" ? "Đang hoạt động" : "Tạm ngưng"}
                <Cross2Icon aria-hidden="true" />
              </button>
            )}
            <button type="button" className="ca-chip-clear" onClick={resetFilters}>
              Xóa tất cả
            </button>
          </div>
        )}
        {error && (
          <div className="ca-alert" role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => setRevision((v) => v + 1)}>
              Thử lại
            </button>
          </div>
        )}

        <div className="ca-table-wrap" id="ca-assignment-results" data-loading={loading && !!pageData} aria-busy={loading}>
          {!showSkeleton && !visible.length ? (
            <div className="ca-empty">
              <span className="ca-empty-icon" aria-hidden="true">
                <MixerHorizontalIcon />
              </span>
              <h2>
                {error
                  ? "Chưa thể tải danh sách phân công"
                  : hasFilters
                    ? "Không tìm thấy phân công phù hợp"
                    : "Chưa có phân công nào"}
              </h2>
              <p>
                {error
                  ? "Kiểm tra kết nối hoặc tải lại để đồng bộ danh sách."
                  : hasFilters
                    ? "Thử điều chỉnh bộ lọc hoặc đặt lại về mặc định."
                    : "Thêm phân công đầu tiên để cấu hình người phụ trách xử lý."}
              </p>
              <button
                type="button"
                className="ca-btn"
                onClick={
                  error
                    ? () => setRevision((v) => v + 1)
                    : hasFilters
                      ? resetFilters
                      : () => setEditor("new")
                }
              >
                {error ? "Tải lại" : hasFilters ? "Đặt lại bộ lọc" : "Thêm phân công"}
              </button>
            </div>
          ) : view === "cluster" ? (
            <div className="ca-clusters">
              {showSkeleton
                ? Array.from({ length: 4 }, (_, index) => (
                    <article key={index} className="ca-cluster-card ca-cluster-card--skeleton" aria-hidden="true">
                      <header className="ca-cluster-head">
                        <span className="ca-skeleton-bar ca-skeleton-bar--sm" />
                      </header>
                      <div className="ca-cluster-list">
                        <div className="ca-cluster-row"><span className="ca-skeleton-bar" /></div>
                        <div className="ca-cluster-row"><span className="ca-skeleton-bar" /></div>
                      </div>
                    </article>
                  ))
                : groupedClusters.map((group) => (
                    <article key={group.label} className="ca-cluster-card">
                      <header className="ca-cluster-head">
                        <span className="ca-condition-tag" data-tone={group.tone}>
                          {group.label}
                        </span>
                        <span className="ca-cluster-count">{group.rows.length}</span>
                      </header>
                      <div className="ca-cluster-list" data-scrollable={group.rows.length > 4}>
                        {group.rows.map((item, index) => {
                          const isDepartment = inferScopeType(item) === AssignmentScopeType.Department;
                          const scopeName = getScopeName(item) || "—";
                          const assigneeName = item.fullName?.trim() || item.userId || "Chưa gán";
                          return (
                            <div
                              key={rowKeyOf(item, index)}
                              className="ca-cluster-row"
                              data-inactive={item.isActive === false}
                            >
                              <div className="ca-cluster-main">
                                <div className="ca-scope-cell">
                                  <span
                                    className="ca-scope-icon"
                                    data-scope={isDepartment ? "department" : "company"}
                                    aria-hidden="true"
                                  >
                                    {isDepartment ? <DepartmentScopeIcon /> : <CompanyScopeIcon />}
                                  </span>
                                  <div className="ca-scope-text">
                                    <span className="ca-scope-type">
                                      {isDepartment ? "Phòng ban" : "Công ty"}
                                    </span>
                                    <span className="ca-scope-name" title={scopeName}>
                                      {scopeName}
                                    </span>
                                    {isDepartment && (item.companyName || item.companyCode) && (
                                      <span className="ca-scope-parent">
                                        {item.companyName || item.companyCode}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="ca-person-cell">
                                  <span className="ca-avatar" aria-hidden="true">
                                    {getInitials(assigneeName)}
                                  </span>
                                  <div className="ca-person-meta">
                                    <button
                                      type="button"
                                      className="ca-person-btn"
                                      title={assigneeName}
                                      onClick={() => setEditor(item)}
                                    >
                                      {assigneeName}
                                    </button>
                                    {item.systemCodeUser && (
                                      <span className="ca-person-code">{item.systemCodeUser}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="ca-cluster-side">
                                {item.isActive != null && (
                                  <span
                                    className="ca-status"
                                    data-active={item.isActive}
                                    role="img"
                                    aria-label={item.isActive ? "Hoạt động" : "Tạm ngưng"}
                                    title={item.isActive ? "Hoạt động" : "Tạm ngưng"}
                                  />
                                )}
                                <div className="ca-row-actions">
                                <button
                                  type="button"
                                  className="ca-action-btn"
                                  title="Chỉnh sửa"
                                  aria-label={`Chỉnh sửa phân công của ${assigneeName}`}
                                  onClick={() => setEditor(item)}
                                >
                                  <Pencil2Icon aria-hidden="true" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  className="ca-action-btn ca-action-btn--danger"
                                  disabled={item.id == null}
                                  title="Xóa"
                                  aria-label={`Xóa phân công của ${assigneeName}`}
                                  onClick={() => setDeleting(item)}
                                >
                                  <TrashIcon aria-hidden="true" />
                                </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
            </div>
          ) : (
            <table className="ca-table">
              <thead>
                <tr>
                  <th scope="col">
                    <button
                      type="button"
                      className="ca-sort-btn"
                      onClick={() => setDescending((v) => !v)}
                    >
                      <LayersIcon className="ca-th-icon" aria-hidden="true" />
                      <span>Điều kiện</span>
                      <span aria-hidden="true">{descending ? "↓" : "↑"}</span>
                    </button>
                  </th>
                  <th scope="col">
                    <span className="ca-th-label">
                      <GlobeIcon className="ca-th-icon" aria-hidden="true" />
                      <span>Phạm vi</span>
                    </span>
                  </th>
                  <th scope="col">
                    <span className="ca-th-label">
                      <PersonIcon className="ca-th-icon" aria-hidden="true" />
                      <span>Người phụ trách</span>
                    </span>
                  </th>
                  <th scope="col">
                    <span className="ca-th-label">
                      <CheckCircledIcon className="ca-th-icon" aria-hidden="true" />
                      <span>Trạng thái</span>
                    </span>
                  </th>
                  <th scope="col">
                    <span className="ca-th-label">
                      <GearIcon className="ca-th-icon" aria-hidden="true" />
                      <span>Thao tác</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {showSkeleton
                  ? Array.from({ length: 8 }, (_, index) => (
                      <tr key={index} aria-hidden="true">
                        <td><span className="ca-skeleton-bar ca-skeleton-bar--sm" /></td>
                        <td><span className="ca-skeleton-bar" /></td>
                        <td><span className="ca-skeleton-bar ca-skeleton-bar--sm" /></td>
                        <td><span className="ca-skeleton-dot" /></td>
                        <td><span className="ca-skeleton-bar ca-skeleton-bar--sm" /></td>
                      </tr>
                    ))
                  : visible.map((item, index) => {
                      const meta = getConditionMeta(item.conditionName ?? item.statusCondition);
                      const isDepartment = inferScopeType(item) === AssignmentScopeType.Department;
                      const scopeName = getScopeName(item) || "—";
                      const assigneeName = item.fullName?.trim() || item.userId || "Chưa gán";
                      return (
                        <tr key={rowKeyOf(item, index)} data-inactive={item.isActive === false}>
                          <td className="ca-condition-cell" data-label="Điều kiện">
                            <span className="ca-condition-tag" data-tone={meta.tone} title={meta.label}>
                              {meta.label}
                            </span>
                            {item.description && <p className="ca-condition-description">{item.description}</p>}
                          </td>
                          <td className="ca-scope-column" data-label="Phạm vi">
                            <div className="ca-scope-cell">
                              <span
                                className="ca-scope-icon"
                                data-scope={isDepartment ? "department" : "company"}
                                aria-hidden="true"
                              >
                                {isDepartment ? <DepartmentScopeIcon /> : <CompanyScopeIcon />}
                              </span>
                              <div className="ca-scope-text">
                                <span className="ca-scope-type">{isDepartment ? "Phòng ban" : "Công ty"}</span>
                                <span className="ca-scope-name" title={scopeName}>
                                  {scopeName}
                                </span>
                                {isDepartment && (item.companyName || item.companyCode) && (
                                  <span className="ca-scope-parent">
                                    {item.companyName || item.companyCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="ca-person-column" data-label="Người phụ trách">
                            <div className="ca-person-cell">
                              <span className="ca-avatar" aria-hidden="true">
                                {getInitials(assigneeName)}
                              </span>
                              <div className="ca-person-meta">
                                <button
                                  type="button"
                                  className="ca-person-btn"
                                  title={assigneeName}
                                  onClick={() => setEditor(item)}
                                >
                                  {assigneeName}
                                </button>
                                {item.systemCodeUser && (
                                  <span className="ca-person-code">{item.systemCodeUser}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="ca-status-column" data-label="Trạng thái">
                            {item.isActive != null ? (
                              <span
                                className="ca-status"
                                data-active={item.isActive}
                                role="img"
                                aria-label={item.isActive ? "Hoạt động" : "Tạm ngưng"}
                                title={item.isActive ? "Hoạt động" : "Tạm ngưng"}
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="ca-actions-cell" data-label="Thao tác">
                            <div className="ca-row-actions">
                              <button
                                type="button"
                                className="ca-action-btn"
                                title="Chỉnh sửa"
                                aria-label={`Chỉnh sửa phân công của ${assigneeName}`}
                                onClick={() => setEditor(item)}
                              >
                                <Pencil2Icon aria-hidden="true" /><span>Sửa</span>
                              </button>
                              <button
                                type="button"
                                className="ca-action-btn ca-action-btn--danger"
                                disabled={item.id == null}
                                title="Xóa"
                                aria-label={`Xóa phân công của ${assigneeName}`}
                                onClick={() => setDeleting(item)}
                              >
                                <TrashIcon aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          itemLabel="phân công"
          page={page}
          pageSize={pageSize}
          total={pageData?.total ?? null}
          loading={loading}
          error={Boolean(error)}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>
      </div>

      {editor && (
        <ConditionAssignmentEditor
          key={editor === "new" ? "new" : rowKeyOf(editor, 0)}
          item={editor === "new" ? undefined : editor}
          conditionOptions={conditionOptions}
          companyOptions={companyOptions}
          fallbackUsers={filterUsers}
          onClose={() => setEditor(null)}
          onSaved={() => setRevision((v) => v + 1)}
        />
      )}

      {deleting && (
        <DeleteAssignmentDialog
          item={deleting}
          scopeName={getScopeName(deleting)}
          onClose={() => setDeleting(null)}
          onDeleted={() => setRevision((v) => v + 1)}
        />
      )}
    </div>
  );
}

function DeleteAssignmentDialog({
  item,
  scopeName,
  onClose,
  onDeleted,
}: {
  item: ConditionAssignmentDto;
  scopeName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const conditionLabel = getConditionMeta(item.conditionName ?? item.statusCondition).label;
  const targetLabel = [item.fullName, conditionLabel, scopeName].filter(Boolean).join(" · ");

  async function remove() {
    if (busy || item.id == null) return;
    setBusy(true);
    setError("");
    try {
      await conditionAssignmentApi.remove(item.id);
      notify("success", "Đã xóa phân công xử lý điều kiện.");
      onDeleted();
      onClose();
    } catch (cause) {
      setError(requestMessage(cause, "Không thể xóa phân công. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="ca-modal ca-modal--sm"
      aria-labelledby="ca-delete-title"
      aria-describedby="ca-delete-description"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ca-delete-body">
        <h2 id="ca-delete-title">Xóa phân công xử lý điều kiện?</h2>
        <p id="ca-delete-description">
          Bạn đang xóa phân công <strong>{targetLabel || "này"}</strong>. Thao tác này không thể
          hoàn tác.
        </p>
        {error && (
          <div className="ca-form-error mt-3" role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <footer className="ca-modal-foot">
        <button autoFocus type="button" className="ca-btn" onClick={onClose} disabled={busy}>
          Hủy
        </button>
        <button type="button" className="ca-btn ca-btn--danger" onClick={remove} disabled={busy}>
          {busy ? <ReloadIcon className="ca-spin" aria-hidden="true" /> : <TrashIcon aria-hidden="true" />}
          <span>{busy ? "Đang xóa…" : "Xóa"}</span>
        </button>
      </footer>
    </dialog>
  );
}
