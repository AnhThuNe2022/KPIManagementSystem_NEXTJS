"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowRightIcon,
  CheckCircledIcon,
  Cross2Icon,
  DashboardIcon,
  ExclamationTriangleIcon,
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
  type ConditionTone,
} from "../types";
import { ConditionAssignmentEditor } from "./ConditionAssignmentEditor";
import { CompanyScopeIcon, DepartmentScopeIcon } from "./ScopeIcons";
import "./ConditionAssignmentList.css";

type StatusTab = "all" | "active" | "inactive";
type ViewMode = "flow" | "cluster";

const EMPTY_FILTERS: ConditionAssignmentFilters = {
  keyword: "",
  userId: "",
  statusCondition: "",
  scopeType: "",
  companyId: "",
  departmentId: "",
  isActive: "",
};

const GAUGE_RADIUS = 32;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const [view, setView] = useState<ViewMode>("flow");
  const [editor, setEditor] = useState<ConditionAssignmentDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<ConditionAssignmentDto | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  const statusTab: StatusTab =
    applied.isActive === "true" ? "active" : applied.isActive === "false" ? "inactive" : "all";

  const requestKey = JSON.stringify({ page, pageSize, applied, revision });
  const current = result?.key === requestKey ? result : undefined;
  const loading = !current;
  const pageData = current?.pageResult ?? result?.pageResult;
  const error = current?.error ?? "";
  const showSkeleton = loading && !pageData;

  useEffect(() => {
    const saved = window.localStorage.getItem("condition-assignment-view-v2");
    if (saved === "flow" || saved === "cluster") setView(saved);
  }, []);

  useEffect(() => {
    const nextKeyword = filters.keyword.trim();
    if (nextKeyword === applied.keyword) return;
    const timer = window.setTimeout(() => {
      setApplied((prev) => (prev.keyword === nextKeyword ? prev : { ...prev, keyword: nextKeyword }));
      setPage(1);
    }, 350);
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
        setResult({
          key: requestKey,
          pageResult: response,
        });
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

  useLayoutEffect(() => {
    const container = segmentRef.current;
    const activeButton = container?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!container || !activeButton) return;
    const update = () => {
      const left = activeButton.offsetLeft;
      const width = activeButton.offsetWidth;
      setThumb((prev) => (prev?.left === left && prev.width === width ? prev : { left, width }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(activeButton);
    return () => observer.disconnect();
  }, [statusTab, pageData?.total]);

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

  const statusFilterOptions: SearchableSelectOption[] = [
    { id: "true", name: "Đang hoạt động" },
    { id: "false", name: "Tạm ngưng" },
  ];

  const pageItems = useMemo(() => pageData?.items ?? [], [pageData?.items]);
  const needsDepartmentNames = pageItems.some((item) => {
    const { isDepartment, id, name } = getScopeTarget(item);
    return isDepartment && Boolean(id) && !name;
  });

  useEffect(() => {
    if (!needsDepartmentNames || scopeDepartmentNames !== null) return;
    const controller = new AbortController();
    departmentApi.list("", "", controller.signal)
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
    const map = new Map<string, { label: string; tone: ConditionTone; rows: ConditionAssignmentDto[] }>();
    for (const item of visible) {
      const meta = getConditionMeta(item.conditionName ?? item.statusCondition);
      const bucket = map.get(meta.label) ?? { label: meta.label, tone: meta.tone, rows: [] };
      bucket.rows.push(item);
      map.set(meta.label, bucket);
    }
    return Array.from(map.values()).sort((a, b) => b.rows.length - a.rows.length);
  }, [visible]);

  const totalAll = pageData?.total ?? 0;
  const activeOnPage = pageItems.filter((item) => item.isActive === true).length;
  const inactiveOnPage = pageItems.filter((item) => item.isActive === false).length;
  const companyScopeOnPage = pageItems.filter(
    (item) => inferScopeType(item) === AssignmentScopeType.Company,
  ).length;
  const deptScopeOnPage = Math.max(0, pageItems.length - companyScopeOnPage);
  const activeRate = pageItems.length ? Math.round((activeOnPage / pageItems.length) * 100) : 0;
  const gaugeOffset = GAUGE_CIRCUMFERENCE * (1 - activeRate / 100);

  const advancedFilterCount = [
    applied.userId,
    applied.statusCondition,
    applied.scopeType,
    applied.companyId,
    applied.departmentId,
    applied.isActive,
  ].filter(Boolean).length;

  const hasFilters = Boolean(applied.keyword || advancedFilterCount > 0);
  const num = (value: number) => (showSkeleton ? "—" : value.toLocaleString("vi-VN"));

  function changeView(next: ViewMode) {
    setView(next);
    window.localStorage.setItem("condition-assignment-view-v2", next);
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setApplied({ ...filters, keyword: filters.keyword.trim() });
    setPage(1);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  function selectStatusTab(next: StatusTab) {
    const nextIsActive = next === "active" ? "true" : next === "inactive" ? "false" : "";
    setFilters((prev) => ({ ...prev, isActive: nextIsActive }));
    setApplied((prev) => ({ ...prev, isActive: nextIsActive }));
    setPage(1);
  }

  function navigateSegment(event: KeyboardEvent<HTMLDivElement>) {
    const keys: StatusTab[] = ["all", "active", "inactive"];
    let index = keys.indexOf(statusTab);
    if (event.key === "ArrowRight") index = (index + 1) % keys.length;
    else if (event.key === "ArrowLeft") index = (index + keys.length - 1) % keys.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = keys.length - 1;
    else return;
    event.preventDefault();
    selectStatusTab(keys[index]);
    document.getElementById("ca-seg-" + keys[index])?.focus();
  }

  function removeFilterChip(key: keyof ConditionAssignmentFilters) {
    if (key === "scopeType") {
      setFilters((prev) => ({ ...prev, scopeType: "", departmentId: "" }));
      setApplied((prev) => ({ ...prev, scopeType: "", departmentId: "" }));
    } else if (key === "companyId") {
      setFilters((prev) => ({ ...prev, companyId: "", departmentId: "" }));
      setApplied((prev) => ({ ...prev, companyId: "", departmentId: "" }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: "" }));
      setApplied((prev) => ({ ...prev, [key]: "" }));
    }
    setPage(1);
  }

  const showDepartmentFilter = filters.scopeType === String(AssignmentScopeType.Department);

  return (
    <div className="ca-studio">
      {/* Editorial Split Header */}
      <section className="ca-stage" aria-label="Tổng quan phân công điều kiện">
        <div className="ca-bezel">
          <div className="ca-bezel-core ca-stage-editorial">
            <div className="ca-headline-group">
              <span className="ca-eyebrow">
                <span className="ca-eyebrow-pulse" aria-hidden="true" />
                Quản lý phân công điều kiện
              </span>
              <h1>Phân công xử lý điều kiện</h1>
              <p>Quản lý người phụ trách theo điều kiện và phạm vi áp dụng</p>
            </div>

            <div className="ca-hero-ornament" aria-hidden="true">
              <div className="ca-orn-row">
                <span className="ca-orn-dot" />
                <span className="ca-orn-bar is-brand" style={{ width: "74%" }} />
              </div>
              <div className="ca-orn-split">
                <span className="ca-orn-bar" />
                <span className="ca-orn-bar is-accent" />
              </div>
              <div className="ca-orn-row">
                <span className="ca-orn-dot is-blue" />
                <span className="ca-orn-bar" style={{ width: "42%" }} />
                <span className="ca-orn-dot is-green" style={{ marginLeft: "auto" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="ca-bezel">
          <div className="ca-bezel-core ca-stage-pod">
            <div className="ca-pod-top">
              <div className="ca-gauge" aria-label={`Tỷ lệ hoạt động trên trang ${activeRate}%`}>
                <svg viewBox="0 0 80 80" aria-hidden="true">
                  <defs>
                    <linearGradient id="ca-gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" className="ca-gauge-stop-start" />
                      <stop offset="100%" className="ca-gauge-stop-end" />
                    </linearGradient>
                  </defs>
                  <circle cx="40" cy="40" r={GAUGE_RADIUS} className="ca-gauge-track" />
                  <circle
                    cx="40"
                    cy="40"
                    r={GAUGE_RADIUS}
                    className="ca-gauge-arc"
                    strokeDasharray={GAUGE_CIRCUMFERENCE}
                    strokeDashoffset={showSkeleton ? GAUGE_CIRCUMFERENCE : gaugeOffset}
                  />
                </svg>
                <div className="ca-gauge-center">
                  <strong>{showSkeleton ? "—" : `${activeRate}%`}</strong>
                  <small>Hiệu lực</small>
                </div>
              </div>

              <div className="ca-pod-metrics">
                <div className="ca-mini-metric">
                  <strong>{num(totalAll)}</strong>
                  <span>Tổng bản ghi</span>
                </div>
                <div className="ca-mini-metric">
                  <strong>{num(companyScopeOnPage)}</strong>
                  <span>Công ty (trang)</span>
                </div>
                <div className="ca-mini-metric">
                  <strong>{num(deptScopeOnPage)}</strong>
                  <span>Phòng ban (trang)</span>
                </div>
              </div>
            </div>

            <div className="ca-pod-foot">
              <div className="ca-pod-ratio">
                <span>Trên trang hiện tại</span>
                <strong>
                  {num(activeOnPage)} hoạt động · {num(inactiveOnPage)} tạm ngưng
                </strong>
              </div>

              <button
                type="button"
                className="ca-cta-pill"
                aria-haspopup="dialog"
                onClick={() => setEditor("new")}
              >
                <span>Thêm phân công</span>
                <kbd>N</kbd>
                <span className="ca-cta-orb" aria-hidden="true">
                  <PlusIcon />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Command & Filter Dock */}
      <section className="ca-bezel ca-dock" aria-label="Tìm kiếm và lọc phân công">
        <form className="ca-bezel-core" onSubmit={applyFilters}>
          <div className="ca-dock-bar">
            <div className="ca-search-wrap">
              <MagnifyingGlassIcon className="ca-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                autoComplete="off"
                className="ca-search-input"
                aria-label="Tìm kiếm phân công"
                placeholder="Nhập từ khóa tìm kiếm…"
                value={filters.keyword}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, keyword: event.target.value }))
                }
              />
              <kbd className="ca-search-kbd" aria-hidden="true">
                /
              </kbd>
            </div>

            <div
              ref={segmentRef}
              className="ca-segment"
              role="tablist"
              aria-label="Lọc nhanh trạng thái"
              onKeyDown={navigateSegment}
            >
              {thumb && (
                <span
                  className="ca-segment-thumb"
                  aria-hidden="true"
                  style={{
                    width: thumb.width,
                    transform: `translateX(${thumb.left}px)`,
                  }}
                />
              )}
              {([
                ["all", "Tất cả", statusTab === "all" ? totalAll : null],
                ["active", "Hoạt động", statusTab === "active" ? totalAll : null],
                ["inactive", "Tạm ngưng", statusTab === "inactive" ? totalAll : null],
              ] as const).map(([key, label, count]) => (
                <button
                  key={key}
                  id={"ca-seg-" + key}
                  type="button"
                  role="tab"
                  tabIndex={statusTab === key ? 0 : -1}
                  aria-selected={statusTab === key}
                  aria-controls="ca-stage-panel"
                  onClick={() => selectStatusTab(key)}
                >
                  <span>{label}</span>
                  {count !== null && (
                    <span className="ca-segment-count">{num(count)}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="ca-dock-tools">
              <div className="ca-segment" role="group" aria-label="Chế độ hiển thị">
                <button
                  type="button"
                  aria-pressed={view === "flow"}
                  title="Dạng luồng phân công"
                  onClick={() => changeView("flow")}
                >
                  <RowsIcon aria-hidden="true" />
                  <span>Luồng</span>
                </button>
                <button
                  type="button"
                  aria-pressed={view === "cluster"}
                  title="Nhóm theo điều kiện"
                  onClick={() => changeView("cluster")}
                >
                  <DashboardIcon aria-hidden="true" />
                  <span>Nhóm</span>
                </button>
              </div>

              <button
                type="button"
                className="ca-tool-pill"
                data-active={filtersOpen || advancedFilterCount > 0}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <MixerHorizontalIcon aria-hidden="true" />
                <span>Bộ lọc</span>
                {advancedFilterCount > 0 && (
                  <span className="ca-tool-badge">{advancedFilterCount}</span>
                )}
              </button>

              <button
                type="button"
                className="ca-icon-btn"
                title="Làm mới dữ liệu"
                aria-label="Làm mới dữ liệu"
                disabled={loading}
                onClick={() => setRevision((value) => value + 1)}
              >
                <ReloadIcon className={loading ? "ca-spin" : undefined} aria-hidden="true" />
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="ca-filter-tray">
              <div className="ca-field">
                <label htmlFor="ca-filter-user">
                  <PersonIcon aria-hidden="true" />
                  Người phụ trách
                </label>
                <SearchableSelect
                  id="ca-filter-user"
                  label="Người phụ trách"
                  placeholder="Tất cả người phụ trách"
                  value={filters.userId}
                  options={userOptions}
                  onChange={(userId) => setFilters((current) => ({ ...current, userId }))}
                />
              </div>

              <div className="ca-field">
                <label htmlFor="ca-filter-condition">
                  <MixerHorizontalIcon aria-hidden="true" />
                  Điều kiện
                </label>
                <SearchableSelect
                  id="ca-filter-condition"
                  label="Điều kiện"
                  placeholder="Tất cả điều kiện"
                  value={filters.statusCondition}
                  options={conditionOptions}
                  onChange={(statusCondition) =>
                    setFilters((current) => ({ ...current, statusCondition }))
                  }
                />
              </div>

              <div className="ca-field">
                <label htmlFor="ca-filter-scope">
                  <LayersIcon aria-hidden="true" />
                  Phạm vi
                </label>
                <SearchableSelect
                  id="ca-filter-scope"
                  label="Phạm vi"
                  placeholder="Tất cả phạm vi"
                  value={filters.scopeType}
                  options={SCOPE_TYPE_OPTIONS}
                  onChange={(scopeType) =>
                    setFilters((current) => ({
                      ...current,
                      scopeType,
                      departmentId:
                        scopeType === String(AssignmentScopeType.Department)
                          ? current.departmentId
                          : "",
                    }))
                  }
                />
              </div>

              <div className="ca-field">
                <label htmlFor="ca-filter-company">
                  <CompanyScopeIcon aria-hidden="true" />
                  Công ty
                </label>
                <SearchableSelect
                  id="ca-filter-company"
                  label="Công ty"
                  placeholder="Tất cả công ty"
                  value={filters.companyId}
                  options={companyOptions}
                  onChange={(companyId) =>
                    setFilters((current) => ({ ...current, companyId, departmentId: "" }))
                  }
                />
              </div>

              {showDepartmentFilter && (
                <div className="ca-field ca-cascade">
                  <label htmlFor="ca-filter-department">
                    <DepartmentScopeIcon aria-hidden="true" />
                    Phòng ban
                  </label>
                  <SearchableSelect
                    id="ca-filter-department"
                    label="Phòng ban"
                    placeholder={filters.companyId ? "Tất cả phòng ban" : "Chọn công ty trước"}
                    value={filters.departmentId}
                    options={filterDepartments}
                    disabled={!filters.companyId}
                    loading={deptFilterLoading}
                    onChange={(departmentId) =>
                      setFilters((current) => ({ ...current, departmentId }))
                    }
                  />
                </div>
              )}

              <div className="ca-field">
                <label htmlFor="ca-filter-status">
                  <CheckCircledIcon aria-hidden="true" />
                  Trạng thái
                </label>
                <SearchableSelect
                  id="ca-filter-status"
                  label="Trạng thái"
                  placeholder="Tất cả trạng thái"
                  value={filters.isActive}
                  options={statusFilterOptions}
                  onChange={(isActive) =>
                    setFilters((current) => ({
                      ...current,
                      isActive: (isActive === "true" || isActive === "false" ? isActive : "") as
                        | ""
                        | "true"
                        | "false",
                    }))
                  }
                />
              </div>

              <div className="ca-filter-btns">
                <button type="submit" className="ca-btn-apply">
                  <MagnifyingGlassIcon aria-hidden="true" />
                  Lọc
                </button>
                <button type="button" className="ca-btn-ghost" onClick={resetFilters}>
                  <ResetIcon aria-hidden="true" />
                  Đặt lại
                </button>
              </div>
            </div>
          )}

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
        </form>
      </section>

      {/* Main Content Stage */}
      <section className="ca-bezel ca-stage-list" aria-label="Danh sách quy tắc phân công">
        <div className="ca-bezel-core">
          {error && (
            <div className="ca-alert-banner mt-3.5" role="alert">
              <ExclamationTriangleIcon aria-hidden="true" />
              <span>{error}</span>
              <button type="button" onClick={() => setRevision((value) => value + 1)}>
                Thử lại
              </button>
            </div>
          )}

          <div
            id="ca-stage-panel"
            role="tabpanel"
            aria-labelledby={"ca-seg-" + statusTab}
            aria-busy={loading}
            className="ca-stage-body"
            data-loading={loading && !!pageData}
          >
            {showSkeleton ? (
              <div className="ca-flow-list" aria-hidden="true">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className="ca-skeleton-row" />
                ))}
              </div>
            ) : !visible.length ? (
              <div className="ca-empty">
                <span className="ca-empty-orb">
                  <MixerHorizontalIcon className="size-6" aria-hidden="true" />
                </span>
                <h2>
                  {error
                    ? "Chưa thể tải danh sách phân công"
                    : hasFilters
                      ? "Không có phân công khớp bộ lọc"
                      : "Chưa có phân công nào"}
                </h2>
                <p>
                  {error
                    ? "Kiểm tra kết nối hoặc tải lại để đồng bộ danh sách từ hệ thống."
                    : hasFilters
                      ? "Thử điều chỉnh điều kiện, công ty hoặc xóa bộ lọc đang áp dụng."
                      : "Bắt đầu bằng cách thêm quy tắc phân công xử lý điều kiện đầu tiên."}
                </p>
                <button
                  type="button"
                  className="ca-btn-ghost"
                  onClick={
                    error
                      ? () => setRevision((value) => value + 1)
                      : hasFilters
                        ? resetFilters
                        : () => setEditor("new")
                  }
                >
                  {error ? "Tải lại" : hasFilters ? "Đặt lại bộ lọc" : "Thêm phân công"}
                </button>
              </div>
            ) : view === "flow" ? (
              <>
                <div className="ca-flow-header">
                  <button
                    type="button"
                    className="ca-sort-btn"
                    onClick={() => setDescending((v) => !v)}
                  >
                    <span>Điều kiện</span>
                    <span>{descending ? "↓" : "↑"}</span>
                  </button>
                  <span aria-hidden="true" />
                  <span>Phạm vi áp dụng</span>
                  <span>Người phụ trách</span>
                  <span>Trạng thái</span>
                  <span className="text-right">Thao tác</span>
                </div>
                <ul className="ca-flow-list">
                  {visible.map((item, index) => {
                    const meta = getConditionMeta(item.conditionName ?? item.statusCondition);
                    const scope = inferScopeType(item);
                    const isDepartment = scope === AssignmentScopeType.Department;
                    const scopeName = getScopeName(item) || "—";
                    const assigneeName = item.fullName?.trim() || item.userId || "Chưa gán";
                    return (
                      <li
                        key={rowKeyOf(item, index)}
                        className="ca-flow-row"
                        data-tone={meta.tone}
                        data-inactive={item.isActive === false}
                        style={{ "--i": Math.min(index, 10) } as CSSProperties}
                      >
                        <span className="ca-badge" data-tone={meta.tone}>
                          <span className="ca-badge-dot" aria-hidden="true" />
                          {meta.label}
                        </span>

                        <span className="ca-flow-arrow" aria-hidden="true">
                          <ArrowRightIcon />
                        </span>

                        <div className="ca-scope">
                          <span
                            className="ca-scope-glyph"
                            data-scope={isDepartment ? "department" : "company"}
                          >
                            {isDepartment ? (
                              <DepartmentScopeIcon aria-hidden="true" />
                            ) : (
                              <CompanyScopeIcon aria-hidden="true" />
                            )}
                          </span>
                          <div className="ca-scope-text">
                            <strong title={scopeName}>{scopeName}</strong>
                            <small>{isDepartment ? "Phòng ban" : "Công ty"}</small>
                          </div>
                        </div>

                        <div className="ca-person">
                          <span className="ca-avatar" aria-hidden="true">
                            {getInitials(assigneeName)}
                          </span>
                          <div className="ca-person-copy">
                            <button
                              type="button"
                              className="ca-person-btn"
                              title={assigneeName}
                              onClick={() => setEditor(item)}
                            >
                              {assigneeName}
                            </button>
                            {item.systemCodeUser && <small>{item.systemCodeUser}</small>}
                          </div>
                        </div>

                        <div>
                          {item.isActive != null ? (
                            <span className="ca-status" data-active={item.isActive}>
                              <span className="ca-status-dot" aria-hidden="true" />
                              {item.isActive ? "Hoạt động" : "Tạm ngưng"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </div>

                        <div className="ca-row-actions">
                          <button
                            type="button"
                            className="ca-icon-btn"
                            title="Chỉnh sửa"
                            aria-label={`Chỉnh sửa phân công của ${assigneeName}`}
                            onClick={() => setEditor(item)}
                          >
                            <Pencil2Icon aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ca-icon-btn"
                            data-danger="true"
                            disabled={item.id == null}
                            title="Xóa phân công"
                            aria-label={`Xóa phân công của ${assigneeName}`}
                            onClick={() => setDeleting(item)}
                          >
                            <TrashIcon aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <div className="ca-clusters">
                {groupedClusters.map((cluster, clusterIndex) => (
                  <article
                    key={cluster.label}
                    className="ca-cluster"
                    style={{ "--i": Math.min(clusterIndex, 8) } as CSSProperties}
                  >
                    <div className="ca-cluster-core">
                      <header className="ca-cluster-head">
                        <span className="ca-badge" data-tone={cluster.tone}>
                          <span className="ca-badge-dot" aria-hidden="true" />
                          {cluster.label}
                        </span>
                        <span className="ca-cluster-count">{cluster.rows.length}</span>
                      </header>
                      <div className="ca-cluster-items">
                        {cluster.rows.map((item, rowIndex) => {
                          const isDepartment = inferScopeType(item) === AssignmentScopeType.Department;
                          const scopeName = getScopeName(item) || "—";
                          const assigneeName = item.fullName?.trim() || item.userId || "Chưa gán";
                          return (
                            <div key={rowKeyOf(item, rowIndex)} className="ca-cluster-row">
                              <span className="ca-avatar" aria-hidden="true">
                                {getInitials(assigneeName)}
                              </span>
                              <div className="ca-cluster-meta">
                                <button
                                  type="button"
                                  className="ca-person-btn"
                                  title={assigneeName}
                                  onClick={() => setEditor(item)}
                                >
                                  {assigneeName}
                                </button>
                                <span className="ca-cluster-scope" title={scopeName}>
                                  {isDepartment ? (
                                    <DepartmentScopeIcon aria-hidden="true" />
                                  ) : (
                                    <CompanyScopeIcon aria-hidden="true" />
                                  )}
                                  {scopeName}
                                </span>
                              </div>
                              <div className="ca-row-actions">
                                <button
                                  type="button"
                                  className="ca-icon-btn"
                                  title="Chỉnh sửa"
                                  aria-label={`Chỉnh sửa phân công của ${assigneeName}`}
                                  onClick={() => setEditor(item)}
                                >
                                  <Pencil2Icon aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="ca-icon-btn"
                                  data-danger="true"
                                  disabled={item.id == null}
                                  title="Xóa"
                                  aria-label={`Xóa phân công của ${assigneeName}`}
                                  onClick={() => setDeleting(item)}
                                >
                                  <TrashIcon aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <Pagination
            itemLabel="bản ghi"
            page={page}
            pageSize={pageSize}
            total={pageData?.total ?? null}
            loading={loading}
            error={!!error}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </section>

      {editor && (
        <ConditionAssignmentEditor
          key={editor === "new" ? "new" : rowKeyOf(editor, 0)}
          item={editor === "new" ? undefined : editor}
          conditionOptions={conditionOptions}
          companyOptions={companyOptions}
          fallbackUsers={filterUsers}
          onClose={() => setEditor(null)}
          onSaved={() => {
            const isNew = editor === "new";
            setEditor(null);
            if (isNew) setPage(1);
            setRevision((value) => value + 1);
          }}
        />
      )}

      {deleting && (
        <DeleteAssignmentDialog
          key={rowKeyOf(deleting, 0)}
          item={deleting}
          scopeName={getScopeName(deleting)}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setRevision((value) => value + 1);
          }}
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

  const meta = getConditionMeta(item.conditionName ?? item.statusCondition);
  const targetLabel = [item.fullName || item.userId, meta.label, scopeName]
    .filter(Boolean)
    .join(" — ");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function remove() {
    if (busy) return;
    if (item.id == null || String(item.id).trim() === "") {
      setError("Bản ghi chưa có mã ID để xóa.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await conditionAssignmentApi.remove(item.id);
      notify("success", `Đã xóa phân công ${item.fullName || item.userId || ""}.`.trim());
      onDeleted();
    } catch (cause) {
      setError(requestMessage(cause, "Không thể xóa phân công. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="ca-dialog"
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
      <div className="ca-dialog-core">
        <span className="ca-dialog-orb">
          <TrashIcon className="size-5" aria-hidden="true" />
        </span>
        <h2 id="ca-delete-title">Xóa phân công xử lý điều kiện?</h2>
        <p id="ca-delete-description">
          Bạn đang xóa phân công <strong>{targetLabel || "này"}</strong>. Thao tác này không thể
          hoàn tác.
        </p>

        {error && (
          <div className="ca-notice" data-kind="error" role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <footer className="ca-dialog-foot">
          <button autoFocus type="button" className="ca-btn-ghost" onClick={onClose} disabled={busy}>
            Giữ lại
          </button>
          <button type="button" className="ca-btn-danger" onClick={remove} disabled={busy}>
            {busy ? <ReloadIcon className="ca-spin" aria-hidden="true" /> : <TrashIcon aria-hidden="true" />}
            <span>{busy ? "Đang xóa…" : "Xóa phân công"}</span>
          </button>
        </footer>
      </div>
    </dialog>
  );
}
