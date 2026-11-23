"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  ArrowDownIcon,
  BackpackIcon,
  ChevronDownIcon,
  Cross2Icon,
  DownloadIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  FileTextIcon,
  HomeIcon,
  IdCardIcon,
  LayersIcon,
  MagnifyingGlassIcon,
  Pencil2Icon,
  PersonIcon,
  PlusIcon,
  ReloadIcon,
  ResetIcon,
  TrashIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { Pagination } from "@/components/ui/Pagination";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import { companyLogos } from "@/features/company/companyLogos";
import type { CompanyDto } from "@/features/company/types";
import type { DepartmentDto } from "@/features/department/types";
import { requestMessage } from "@/features/evaluation/evaluationDisplay";
import type { PagedResult } from "@/lib/api/types";
import { employeeErrorMessage, employeeListApi } from "../services/employeeListApi";
import { userApi } from "../services/userApi";
import { EmployeeAdminDialog } from "./EmployeeAdminDialog";
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
import "./EmployeeInformationList.css";

const DEFAULT_FILTERS: EmployeeListFilters = {
  keyword: "",
  companyId: "",
  departmentId: "",
  jobId: "",
  roleId: "",
  sortOrder: "EmployeeAsc",
  missingInfo: "0",
};

function getInitials(name?: string | null): string {
  const clean = (name ?? "").trim();
  if (!clean) return "?";
  const parts = clean.split(/[\s,._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function EmployeeInformationList() {
  const [dialogEmployee, setDialogEmployee] = useState<EmployeeListItemDto | null>();
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeListItemDto | null>(null);
  const [filters, setFilters] = useState<EmployeeListFilters>(DEFAULT_FILTERS);
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
  const [exporting, setExporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<{
    key: string;
    data?: PagedResult<EmployeeListItemDto>;
    error?: string;
  }>();

  const searchRef = useRef<HTMLInputElement>(null);
  const requestKey = JSON.stringify({ page, pageSize, applied, revision });
  const current = result?.key === requestKey ? result : undefined;
  const loading = !current;
  const pageData = current?.data ?? result?.data;
  const error = current?.error ?? "";
  const showSkeleton = loading && !pageData;

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
        setDialogEmployee(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      employeeListApi.getCompanies(controller.signal),
      employeeListApi.getJobPositions(controller.signal),
      employeeListApi.getRoles(controller.signal),
    ]).then(
      ([companyRows, jobRows, roleRows]) => {
        if (controller.signal.aborted) return;
        setCompanies(companyRows);
        setJobPositions(jobRows);
        setRoles(roleRows);
      },
      (cause) => {
        if (!controller.signal.aborted) {
          notify("error", requestMessage(cause, "Chưa tải được danh mục bộ lọc."));
        }
      },
    );
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDepartments([]);
    if (!filters.companyId) {
      setDepartmentsLoading(false);
      return;
    }
    const controller = new AbortController();
    setDepartmentsLoading(true);
    employeeListApi
      .getDepartments(filters.companyId, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setDepartments(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDepartments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDepartmentsLoading(false);
      });
    return () => controller.abort();
  }, [filters.companyId]);

  useEffect(() => {
    const controller = new AbortController();
    employeeListApi
      .getPaged(page, pageSize, applied, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(response.total / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult({ key: requestKey, data: response });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setResult((prev) => ({
            key: requestKey,
            data: prev?.data,
            error: requestMessage(cause, "Chưa tải được danh sách nhân viên. Vui lòng thử lại."),
          }));
        }
      });
    return () => controller.abort();
  }, [applied, page, pageSize, requestKey]);

  const companiesById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const companyOptions = useMemo<SearchableSelectOption[]>(
    () => companies.map((company) => ({ id: String(company.id), name: company.companyName })),
    [companies],
  );
  const departmentOptions = useMemo<SearchableSelectOption[]>(
    () => departments.map((department) => ({ id: String(department.id), name: department.name })),
    [departments],
  );
  const jobOptions = useMemo<SearchableSelectOption[]>(
    () => jobPositions.map((job) => ({ id: String(job.id), name: job.name })),
    [jobPositions],
  );
  const roleCatalog = useMemo(
    () => roles.map((role) => ({ ...role, label: ROLE_LABELS[role.name.toLowerCase()] ?? role.name })),
    [roles],
  );
  const roleOptions = useMemo<SearchableSelectOption[]>(
    () => roleCatalog.map((role) => ({ id: role.id, name: role.label })),
    [roleCatalog],
  );

  const items = pageData?.items ?? [];
  const totalAll = pageData?.total ?? 0;
  const isDirty =
    JSON.stringify({ ...filters, keyword: filters.keyword.trim() }) !==
    JSON.stringify({ ...applied, keyword: applied.keyword.trim() });
  const hasAppliedFilters = Boolean(
    applied.keyword ||
      applied.companyId ||
      applied.departmentId ||
      applied.jobId ||
      applied.roleId ||
      applied.missingInfo !== "0" ||
      applied.sortOrder !== "EmployeeAsc",
  );

  function applyFilters(event?: FormEvent) {
    event?.preventDefault();
    setApplied({ ...filters, keyword: filters.keyword.trim() });
    setAppliedDeptLabel(
      departments.find((department) => String(department.id) === filters.departmentId)?.name ?? "",
    );
    setPage(1);
    setRevision((value) => value + 1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setAppliedDeptLabel("");
    setPage(1);
    setRevision((value) => value + 1);
  }

  function toggleNameSort() {
    const nextSort: EmployeeSortOrder = applied.sortOrder === "EmployeeAsc" ? "EmployeeDesc" : "EmployeeAsc";
    setFilters((prev) => ({ ...prev, sortOrder: nextSort }));
    setApplied((prev) => ({ ...prev, sortOrder: nextSort }));
    setPage(1);
  }

  function removeFilterChip(key: keyof EmployeeListFilters) {
    const patch: Partial<EmployeeListFilters> =
      key === "companyId"
        ? { companyId: "", departmentId: "" }
        : key === "missingInfo"
          ? { missingInfo: "0" }
          : key === "sortOrder"
            ? { sortOrder: "EmployeeAsc" }
            : { [key]: "" };
    if (key === "companyId" || key === "departmentId") setAppliedDeptLabel("");
    setFilters((prev) => ({ ...prev, ...patch }));
    setApplied((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  const activeChips: Array<{ key: keyof EmployeeListFilters; label: string }> = [];
  if (applied.companyId) {
    const label = companyOptions.find((c) => c.id === applied.companyId)?.name ?? `#${applied.companyId}`;
    activeChips.push({ key: "companyId", label: `Công ty: ${label}` });
  }
  if (applied.departmentId) {
    const label =
      appliedDeptLabel ||
      departmentOptions.find((d) => d.id === applied.departmentId)?.name ||
      `#${applied.departmentId}`;
    activeChips.push({ key: "departmentId", label: `Phòng ban: ${label}` });
  }
  if (applied.jobId) {
    const label = jobOptions.find((j) => j.id === applied.jobId)?.name ?? `#${applied.jobId}`;
    activeChips.push({ key: "jobId", label: `Chức vụ: ${label}` });
  }
  if (applied.roleId) {
    const label = roleOptions.find((r) => r.id === applied.roleId)?.name ?? applied.roleId;
    activeChips.push({ key: "roleId", label: `Vai trò: ${label}` });
  }
  if (applied.missingInfo !== "0") {
    const label = MISSING_INFO_OPTIONS.find((item) => item.value === applied.missingInfo)?.label ?? applied.missingInfo;
    activeChips.push({ key: "missingInfo", label: `Tình trạng: ${label}` });
  }
  if (applied.sortOrder !== "EmployeeAsc") {
    activeChips.push({ key: "sortOrder", label: "Sắp xếp: Tên Z → A" });
  }
  if (applied.keyword) {
    activeChips.push({ key: "keyword", label: `Từ khóa: “${applied.keyword}”` });
  }

  async function handleExportEmployees() {
    if (exporting) return;
    setExporting(true);
    try {
      await employeeListApi.exportEmployees(applied);
      notify("success", "Đã xuất danh sách nhân viên ra Excel.");
    } catch (cause) {
      notify("error", requestMessage(cause, "Chưa xuất được file Excel. Vui lòng thử lại."));
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadTemplate() {
    if (downloadingTemplate) return;
    setDownloadingTemplate(true);
    try {
      await employeeListApi.downloadTemplate();
      notify("success", "Đã tải file mẫu nhân viên.");
    } catch (cause) {
      notify("error", requestMessage(cause, "Chưa tải được file mẫu. Vui lòng thử lại."));
    } finally {
      setDownloadingTemplate(false);
    }
  }

  return (
    <div className="emp-page">
      <header className="emp-header">
        <div className="emp-glassCard" aria-hidden="true">
          <span className="emp-glassBadge"><PersonIcon /></span>
          <div className="emp-glassLines">
            <span className="is-accent" />
            <span />
          </div>
        </div>

        <div className="emp-header-copy">
          <h1>Quản lý nhân viên</h1>
          <p>Tra cứu hồ sơ nhân sự, chức vụ, phòng ban và tình trạng thông tin hệ thống.</p>
        </div>

        <div className="emp-header-actions">
          <button
            type="button"
            className="emp-btn emp-btn--primary"
            onClick={() => setDialogEmployee(null)}
          >
            <PlusIcon aria-hidden="true" />
            <span>Thêm</span>
            <kbd aria-hidden="true">N</kbd>
          </button>

          <button
            type="button"
            className="emp-btn emp-btn--icon"
            title="Làm mới dữ liệu"
            aria-label="Làm mới dữ liệu"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <ReloadIcon className={loading ? "emp-spin" : undefined} aria-hidden="true" />
          </button>
        </div>
      </header>

      <form className="emp-filters-panel" onSubmit={applyFilters} aria-label="Bộ lọc danh sách nhân viên">
        <div className="emp-filters-grid">
          <div className="emp-filter-field">
            <label htmlFor="emp-filter-company">Công ty</label>
            <SearchableSelect
              id="emp-filter-company"
              label="Công ty"
              placeholder="Tất cả công ty"
              value={filters.companyId}
              options={companyOptions}
              onChange={(companyId) => setFilters((prev) => ({ ...prev, companyId, departmentId: "" }))}
            />
          </div>

          <div className="emp-filter-field">
            <label htmlFor="emp-filter-department">Phòng ban</label>
            <SearchableSelect
              id="emp-filter-department"
              label="Phòng ban"
              placeholder={filters.companyId ? "Tất cả phòng ban" : "Chọn công ty trước"}
              value={filters.departmentId}
              options={departmentOptions}
              loading={departmentsLoading}
              disabled={!filters.companyId || (!departmentOptions.length && !departmentsLoading)}
              emptyMessage="Công ty chưa có phòng ban"
              onChange={(departmentId) => setFilters((prev) => ({ ...prev, departmentId }))}
            />
          </div>

          <div className="emp-filter-field">
            <label htmlFor="emp-filter-sort">Sắp xếp</label>
            <div className="emp-select-wrap">
              <select
                id="emp-filter-sort"
                className="emp-select"
                value={filters.sortOrder}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, sortOrder: event.target.value as EmployeeSortOrder }))
                }
              >
                {EMPLOYEE_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="emp-select-chevron" aria-hidden="true" />
            </div>
          </div>

          <div className="emp-filter-field">
            <label htmlFor="emp-filter-job">Nhóm chức vụ</label>
            <SearchableSelect
              id="emp-filter-job"
              label="Nhóm chức vụ"
              placeholder="Tất cả chức vụ"
              value={filters.jobId}
              options={jobOptions}
              onChange={(jobId) => setFilters((prev) => ({ ...prev, jobId }))}
            />
          </div>

          <div className="emp-filter-field">
            <label htmlFor="emp-filter-keyword">Từ khóa</label>
            <div className="emp-search-box" role="search">
              <MagnifyingGlassIcon className="emp-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                id="emp-filter-keyword"
                type="search"
                autoComplete="off"
                className="emp-search-input"
                placeholder="Tên NV hoặc Mã HT (/)"
                value={filters.keyword}
                onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
              />
              {filters.keyword && (
                <button
                  type="button"
                  className="emp-search-clear"
                  aria-label="Xóa từ khóa"
                  onClick={() => setFilters((prev) => ({ ...prev, keyword: "" }))}
                >
                  <Cross2Icon aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="emp-filter-field">
            <label htmlFor="emp-filter-role">Nhóm vai trò</label>
            <SearchableSelect
              id="emp-filter-role"
              label="Nhóm vai trò"
              placeholder="Tất cả nhóm vai trò"
              value={filters.roleId}
              options={roleOptions}
              onChange={(roleId) => setFilters((prev) => ({ ...prev, roleId }))}
            />
          </div>

          <div className="emp-filter-field">
            <label htmlFor="emp-filter-missing">Tình trạng thông tin</label>
            <div className="emp-select-wrap">
              <select
                id="emp-filter-missing"
                className="emp-select"
                value={filters.missingInfo}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, missingInfo: event.target.value as MissingInfoFilterValue }))
                }
              >
                {MISSING_INFO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="emp-select-chevron" aria-hidden="true" />
            </div>
          </div>

          <div className="emp-filter-actions">
            <button type="submit" className="emp-btn emp-btn--brand" disabled={loading}>
              <MagnifyingGlassIcon aria-hidden="true" />
              <span>Lọc</span>
              {isDirty && <span className="emp-dirty-dot" aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="emp-btn"
              disabled={loading || (!hasAppliedFilters && !isDirty)}
              onClick={resetFilters}
            >
              <ResetIcon aria-hidden="true" />
              <span>Xóa lọc</span>
            </button>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="emp-chips" aria-label="Bộ lọc đang áp dụng">
            <span>Đang lọc:</span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="emp-chip"
                title={`Bỏ lọc ${chip.label}`}
                onClick={() => removeFilterChip(chip.key)}
              >
                <span>{chip.label}</span>
                <Cross2Icon aria-hidden="true" />
              </button>
            ))}
            <button type="button" className="emp-chip-clear" onClick={resetFilters}>
              Xóa tất cả
            </button>
          </div>
        )}
      </form>

      <section className="emp-results" aria-labelledby="emp-results-heading">
        <header className="emp-results-header">
          <h2 id="emp-results-heading">
            <FileTextIcon aria-hidden="true" />
            <span>Danh sách nhân viên</span>
            <span className="emp-results-count">{showSkeleton ? "—" : totalAll.toLocaleString("vi-VN")}</span>
          </h2>

          <div className="emp-results-actions">
            <button type="button" className="emp-btn emp-btn--sm" disabled title="Chưa có API Import Excel">
              <UploadIcon aria-hidden="true" />
              <span>Import Excel</span>
            </button>
            <button
              type="button"
              className="emp-btn emp-btn--emerald emp-btn--sm"
              disabled={loading || exporting}
              onClick={() => void handleExportEmployees()}
            >
              <DownloadIcon aria-hidden="true" />
              <span>{exporting ? "Đang xuất…" : "Xuất Excel"}</span>
            </button>
            <button
              type="button"
              className="emp-btn emp-btn--emerald emp-btn--sm"
              disabled={downloadingTemplate}
              onClick={() => void handleDownloadTemplate()}
            >
              <FileTextIcon aria-hidden="true" />
              <span>{downloadingTemplate ? "Đang tải…" : "File mẫu"}</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="emp-alert" role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => setRevision((value) => value + 1)}>
              Thử lại
            </button>
          </div>
        )}

        {showSkeleton ? (
          <div className="emp-table-wrap" role="status" aria-label="Đang tải danh sách nhân viên" aria-busy="true">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Nhóm chức vụ</th>
                  <th>Phòng ban</th>
                  <th>Email</th>
                  <th>Mã HT</th>
                  <th>Công ty</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }, (_, index) => (
                  <tr key={index}>
                    <td><span className="emp-skeleton-bar" /></td>
                    <td><span className="emp-skeleton-bar emp-skeleton-bar--sm" /></td>
                    <td><span className="emp-skeleton-bar" /></td>
                    <td><span className="emp-skeleton-bar" /></td>
                    <td><span className="emp-skeleton-bar emp-skeleton-bar--sm" /></td>
                    <td><span className="emp-skeleton-bar" /></td>
                    <td><span className="emp-skeleton-bar emp-skeleton-bar--sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !items.length ? (
          <div className="emp-empty">
            <span className="emp-empty-icon" aria-hidden="true">
              {hasAppliedFilters ? <MagnifyingGlassIcon /> : <PersonIcon />}
            </span>
            <h2>{hasAppliedFilters ? "Không tìm thấy nhân viên phù hợp" : "Chưa có dữ liệu nhân viên"}</h2>
            <p>
              {hasAppliedFilters
                ? "Thử điều chỉnh từ khóa hoặc xóa bớt tiêu chí lọc để xem toàn bộ nhân sự."
                : "Nhấn Thêm hoặc đồng bộ dữ liệu nhân sự để bắt đầu quản lý."}
            </p>
            {hasAppliedFilters ? (
              <button type="button" className="emp-btn" onClick={resetFilters}>
                <ResetIcon aria-hidden="true" />
                <span>Xóa bộ lọc</span>
              </button>
            ) : (
              <button type="button" className="emp-btn emp-btn--primary" onClick={() => setDialogEmployee(null)}>
                <PlusIcon aria-hidden="true" />
                <span>Thêm nhân viên</span>
              </button>
            )}
          </div>
        ) : (
          <div className="emp-table-wrap" data-loading={loading}>
            <table className="emp-table">
              <thead>
                <tr>
                  <th aria-sort={applied.sortOrder === "EmployeeDesc" ? "descending" : "ascending"}>
                    <button type="button" className="emp-sort-btn" onClick={toggleNameSort}>
                      <PersonIcon className="emp-th-icon" aria-hidden="true" />
                      <span>Họ tên</span>
                      <ArrowDownIcon
                        style={{
                          transform: applied.sortOrder === "EmployeeDesc" ? "none" : "rotate(180deg)",
                          transition: "transform 160ms",
                        }}
                        aria-hidden="true"
                      />
                    </button>
                  </th>
                  <th><span className="emp-th-label"><BackpackIcon className="emp-th-icon" aria-hidden="true" /><span>Nhóm chức vụ</span></span></th>
                  <th><span className="emp-th-label"><LayersIcon className="emp-th-icon" aria-hidden="true" /><span>Phòng ban</span></span></th>
                  <th><span className="emp-th-label"><EnvelopeClosedIcon className="emp-th-icon" aria-hidden="true" /><span>Email</span></span></th>
                  <th><span className="emp-th-label"><IdCardIcon className="emp-th-icon" aria-hidden="true" /><span>Mã HT</span></span></th>
                  <th><span className="emp-th-label"><HomeIcon className="emp-th-icon" aria-hidden="true" /><span>Công ty</span></span></th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => {
                  const rowId = row.userId || row.id;
                  const fullName = row.fullName?.trim() || row.userName?.trim() || "Chưa có tên";
                  const jobName = row.jobPosition?.name || row.jobPositionName || "";
                  const departmentName = row.department?.name || row.departmentName || "";
                  const matchedCompany = row.companyId != null ? companiesById.get(row.companyId) : undefined;
                  const companyName = row.companyName || matchedCompany?.companyName || "";
                  const companyLogo = matchedCompany?.companyCode ? companyLogos[matchedCompany.companyCode] : undefined;
                  const email = row.email?.trim() ?? "";
                  const systemCode = row.systemCode?.trim() ?? "";

                  return (
                    <tr key={rowId ?? `emp-${index}`}>
                      <td className="emp-cell-full emp-cell-name" data-label="Họ tên">
                        <div className="emp-person-cell">
                          <span className="emp-avatar" aria-hidden="true">
                            {getInitials(fullName)}
                          </span>
                          <div className="emp-person-meta">
                            <button
                              type="button"
                              className="emp-person-btn"
                              disabled={!rowId}
                              onClick={() => setDialogEmployee(row)}
                            >
                              {fullName}
                            </button>
                            {row.jobTitle?.trim() && <span className="emp-person-sub">{row.jobTitle.trim()}</span>}
                          </div>
                        </div>
                      </td>

                      <td data-label="Nhóm chức vụ">
                        {jobName ? <span className="emp-role-pill">{jobName}</span> : <span className="emp-muted">—</span>}
                      </td>

                      <td data-label="Phòng ban">
                        {departmentName || <span className="emp-muted">—</span>}
                      </td>

                      <td data-label="Email">
                        {email ? <span className="emp-email">{email}</span> : <span className="emp-missing-pill">Thiếu Email</span>}
                      </td>

                      <td data-label="Mã HT">
                        {systemCode ? <span className="emp-code">{systemCode}</span> : <span className="emp-missing-pill">Thiếu Mã HT</span>}
                      </td>

                      <td className="emp-cell-full" data-label="Công ty">
                        {companyName ? (
                          <span className="emp-company-cell">
                            {companyLogo && (
                              <Image src={companyLogo} alt="" width={18} height={18} className="emp-company-logo" />
                            )}
                            <span>{companyName}</span>
                          </span>
                        ) : (
                          <span className="emp-muted">—</span>
                        )}
                      </td>

                      <td className="emp-cell-actions" data-label="Thao tác">
                        <div className="emp-row-actions">
                          <button
                            type="button"
                            className="emp-action-btn"
                            title={`Chỉnh sửa ${fullName}`}
                            aria-label={`Chỉnh sửa ${fullName}`}
                            disabled={!rowId}
                            onClick={() => setDialogEmployee(row)}
                          >
                            <Pencil2Icon aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="emp-action-btn emp-action-btn--danger"
                            title={`Xóa ${fullName}`}
                            aria-label={`Xóa ${fullName}`}
                            disabled={!rowId}
                            onClick={() => setDeletingEmployee(row)}
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
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={showSkeleton ? null : totalAll}
          loading={loading}
          error={Boolean(error)}
          itemLabel="nhân viên"
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
        />
      </section>

      {dialogEmployee !== undefined && (
        <EmployeeAdminDialog
          key={dialogEmployee ? (dialogEmployee.userId || dialogEmployee.id) : "new"}
          employee={dialogEmployee}
          companies={companies}
          jobs={jobPositions}
          roles={roleCatalog}
          onClose={() => setDialogEmployee(undefined)}
          onSaved={() => setRevision((value) => value + 1)}
        />
      )}

      {deletingEmployee && (
        <DeleteEmployeeDialog
          employee={deletingEmployee}
          onClose={() => setDeletingEmployee(null)}
          onDeleted={() => setRevision((value) => value + 1)}
        />
      )}
    </div>
  );
}

function DeleteEmployeeDialog({
  employee,
  onClose,
  onDeleted,
}: {
  employee: EmployeeListItemDto;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const targetId = employee.userId || employee.id || "";
  const displayName = employee.fullName?.trim() || employee.userName?.trim() || targetId;

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

  async function remove() {
    if (busy || !targetId) return;
    setBusy(true);
    setError("");
    try {
      await userApi.remove(targetId);
      notify("success", `Đã xóa nhân viên “${displayName}”.`);
      onDeleted();
      onClose();
    } catch (cause) {
      setError(employeeErrorMessage(cause, "Chưa xóa được nhân viên. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="emp-modal emp-modal--sm"
      aria-labelledby="emp-delete-title"
      aria-describedby="emp-delete-description"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="emp-delete-body">
        <h2 id="emp-delete-title">Xóa nhân viên?</h2>
        <p id="emp-delete-description">
          Bạn đang xóa nhân viên <strong>{displayName}</strong>
          {employee.systemCode ? ` (${employee.systemCode})` : ""}. Thao tác này không thể hoàn tác.
        </p>
        {error && (
          <div className="emp-form-error" role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <footer className="emp-modal-foot">
        <button autoFocus type="button" className="emp-btn" disabled={busy} onClick={onClose}>
          Hủy
        </button>
        <button type="button" className="emp-btn emp-btn--danger" disabled={busy} onClick={() => void remove()}>
          {busy ? <ReloadIcon className="emp-spin" aria-hidden="true" /> : <TrashIcon aria-hidden="true" />}
          <span>{busy ? "Đang xóa…" : "Xóa nhân viên"}</span>
        </button>
      </footer>
    </dialog>
  );
}
