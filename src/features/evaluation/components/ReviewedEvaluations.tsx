"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  CheckCircledIcon,
  CheckIcon,
  ClockIcon,
  ChevronDownIcon,
  Cross2Icon,
  EyeOpenIcon,
  FileTextIcon,
  InfoCircledIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PersonIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import { reviewedEvaluationApi } from "../services/reviewedEvaluationApi";
import {
  UserRoleSystem,
  type EvaluationFilterOption,
  type EvaluationTypeOption,
  type PagedResult,
  type ReviewedEvaluationDto,
  type ReviewedEvaluationFilters,
  type ReviewRole,
} from "@/types/evaluation";
import styles from "../evaluation-common.module.css";
import { Pagination } from "@/components/ui/pagination";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatEvaluationDate, requestMessage, companyOptions, periodOptions, evaluationTypeOptions } from "../evaluationDisplay";
import reviewed from "../reviewed-evaluations.module.css";

const emptyFilters: ReviewedEvaluationFilters = {
  keyword: "",
  companyId: "",
  departmentId: "",
  typeId: "",
  periodId: "",
  status: "",
  from: "",
  to: "",
  sortBy: "date_desc",
};
const scoreFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export function ReviewedEvaluations({ level }: { level: ReviewRole }) {
  const hr = level === UserRoleSystem.HR;
  const title = "Danh sách đã duyệt / từ chối";
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [revision, setRevision] = useState(0);
  const [lookupRevision, setLookupRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: PagedResult<ReviewedEvaluationDto>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [companies, setCompanies] = useState<EvaluationFilterOption[]>([]);
  const [departments, setDepartments] = useState<EvaluationFilterOption[]>([]);
  const [types, setTypes] = useState<EvaluationTypeOption[]>([]);
  const [lookupsBusy, setLookupsBusy] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [departmentBusy, setDepartmentBusy] = useState(false);
  const [departmentError, setDepartmentError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const requestKey = JSON.stringify({ level, page, pageSize, ...applied });
  const ready = snapshot?.key === requestKey;
  const data = ready ? snapshot.data : null;
  const activeFilters = Object.entries(applied).filter(
    ([key, value]) => key !== "sortBy" && value,
  ).length;
  const availablePeriods = [
    ...new Map(
      (filters.typeId ? types.filter((type) => type.id === filters.typeId) : types)
        .flatMap((type) => type.periods)
        .map((period) => [period.id, period]),
    ).values(),
  ];

  const advancedCount = [filters.typeId, filters.periodId, filters.from, filters.to].filter(Boolean).length;
  const appliedLabels = [
    applied.keyword && "Nhân viên: " + applied.keyword,
    applied.companyId && (companies.find((option) => option.id === applied.companyId)?.name || "Công ty đã chọn"),
    applied.departmentId && (departments.find((option) => option.id === applied.departmentId)?.name || "Phòng ban đã chọn"),
    applied.typeId && (types.find((option) => option.id === applied.typeId)?.name || "Loại đánh giá đã chọn"),
    applied.periodId && (types.flatMap((type) => type.periods).find((period) => period.id === applied.periodId)?.name || "Kỳ đánh giá đã chọn"),
    applied.from && "Từ " + applied.from,
    applied.to && "Đến " + applied.to,
  ].filter(Boolean);

  function selectStatus(status: ReviewedEvaluationFilters["status"]) {
    setFilters((value) => ({ ...value, status }));
    setApplied((value) => ({ ...value, status }));
    setPage(1);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    reviewedEvaluationApi
      .get({ level, page, pageSize, filters: applied, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setSnapshot({ key: requestKey, data: result });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(requestMessage(cause, "Không tải được danh sách. Vui lòng thử lại."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [level, page, pageSize, applied, requestKey, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setLookupsBusy(true);
    setLookupError("");
    Promise.allSettled([
      evaluationLookupApi.getCompanies(level, controller.signal),
      hr ? evaluationLookupApi.getTypes(controller.signal) : Promise.resolve([]),
    ]).then(([companyResult, typeResult]) => {
      if (controller.signal.aborted) return;
      setCompanies(companyResult.status === "fulfilled" ? companyOptions(companyResult.value) : []);
      setTypes(typeResult.status === "fulfilled" ? evaluationTypeOptions(typeResult.value) : []);
      const failed = [companyResult, typeResult].find(
        (result) => result.status === "rejected",
      );
      if (failed?.status === "rejected")
        setLookupError(requestMessage(failed.reason, "Chưa tải được một số lựa chọn bộ lọc."));
      setLookupsBusy(false);
    });
    return () => controller.abort();
  }, [level, hr, lookupRevision]);

  useEffect(() => {
    setDepartments([]);
    setDepartmentError("");
    if (!hr) return;

    const controller = new AbortController();
    setDepartmentBusy(true);
    evaluationLookupApi.getDepartments(filters.companyId, level, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setDepartments(periodOptions(result));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setDepartmentError(requestMessage(cause, "Chưa tải được danh sách phòng ban."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDepartmentBusy(false);
      });
    return () => controller.abort();
  }, [filters.companyId, level, hr, lookupRevision]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setAdvancedOpen(true);
      setFilterError("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
      return;
    }
    setFilterError("");
    setApplied({ ...filters, keyword: filters.keyword.trim() });
    setPage(1);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setFilterError("");
    setPage(1);
    setRevision((value) => value + 1);
  }

  return (
    <section className={styles.page + " " + reviewed.page} aria-labelledby="reviewed-title">
      <header className={reviewed.heading}>
        <div><div className={reviewed.titleLine}><h1 id="reviewed-title">{title}</h1><span className={reviewed.total}><strong>{data?.total.toLocaleString("vi-VN") ?? "—"}</strong> bản đánh giá</span></div><p className={reviewed.description}>Tra cứu kết quả, người duyệt và lý do từ chối.</p></div>
        <div className={reviewed.statusTabs} role="group" aria-label="Lọc theo trạng thái">
          <button type="button" aria-pressed={applied.status === ""} onClick={() => selectStatus("")}>
            <svg className={reviewed.statusRoad} viewBox="0 0 160 80" fill="none" aria-hidden="true" focusable="false">
              <path d="M6 82C62 69 135 60 109 45S76 28 155 14M40 84C91 67 149 57 125 44S99 29 160 19" stroke="currentColor" strokeWidth="2" />
              <path d="M23 83C79 68 141 58 117 44S87 29 158 16" stroke="currentColor" strokeDasharray="7 8" />
            </svg>
            <span className={reviewed.statusIcon} aria-hidden="true">
              <svg viewBox="0 0 32 32" focusable="false">
                <path d="m3 23 13-6 13 6-13 6Z" fill="#d42020" />
                <path d="m3 17 13-6 13 6-13 6Z" fill="currentColor" />
                <path d="m3 10 13-6 13 6-13 6Z" fill="currentColor" />
              </svg>
            </span>
            <span>Tất cả</span>
          </button>
          <button type="button" data-status="Approved" aria-pressed={applied.status === "Approved"} onClick={() => selectStatus("Approved")}>
            <span className={reviewed.statusIcon} aria-hidden="true"><CheckIcon /></span><span>Đã duyệt</span>
          </button>
          <button type="button" data-status="Rejected" aria-pressed={applied.status === "Rejected"} onClick={() => selectStatus("Rejected")}>
            <span className={reviewed.statusIcon} aria-hidden="true"><Cross2Icon /></span><span>Từ chối</span>
          </button>
        </div>
      </header>

      <form
        className={styles.filters + " " + reviewed.filters}
        onSubmit={applyFilters}
        onInvalid={(event) => {
          event.preventDefault();
          setAdvancedOpen(true);
          setFilterError("Ngày không hợp lệ. Vui lòng kiểm tra khoảng ngày.");
        }}
        aria-label="Lọc danh sách đã duyệt / từ chối"
      >
        <div className={reviewed.primaryFilters} data-hr={hr}>
          <label>
            <span className={styles.srOnly}>Nhân viên</span>
            <div className={styles.control + " " + reviewed.searchControl}>
              <MagnifyingGlassIcon aria-hidden="true" />
              <input
                type="search"
                value={filters.keyword}
                maxLength={200}
                placeholder="Tìm theo tên / mã NV"
                onChange={(event) =>
                  setFilters((value) => ({ ...value, keyword: event.target.value }))
                }
              />
            </div>
          </label>
          <div className={reviewed.selectField}>
            <SearchableSelect id="reviewed-company-filter" label="Công ty" value={filters.companyId} options={companies} placeholder={lookupsBusy ? "Đang tải…" : "Tất cả công ty"} disabled={lookupsBusy || !companies.length} onChange={(companyId) => setFilters((value) => ({ ...value, companyId, departmentId: "" }))} />
          </div>
          {hr && <div className={reviewed.selectField}>
            <SearchableSelect id="reviewed-department-filter" label="Phòng ban" value={filters.departmentId} options={departments} placeholder={lookupsBusy || departmentBusy ? "Đang tải…" : "Tất cả phòng ban"} disabled={lookupsBusy || departmentBusy || !departments.length} onChange={(departmentId) => setFilters((value) => ({ ...value, departmentId }))} />
          </div>}
          <div className={reviewed.filterButtons}>
            <button type="button" className={styles.button + " " + reviewed.moreFilters} aria-expanded={advancedOpen} aria-controls="reviewed-extra-filters" onClick={() => setAdvancedOpen(!advancedOpen)}><MixerHorizontalIcon aria-hidden="true" />Lọc thêm{advancedCount > 0 && <b>{advancedCount}</b>}<ChevronDownIcon aria-hidden="true" /></button>
            <button className={styles.button + " " + reviewed.clearButton} type="button" onClick={clearFilters} aria-label="Xóa tất cả bộ lọc" title="Xóa tất cả bộ lọc"><ReloadIcon aria-hidden="true" /></button>
            <button className={styles.button + " " + styles.primary} type="submit" disabled={loading}><MagnifyingGlassIcon aria-hidden="true" />{loading ? "Đang tải…" : "Áp dụng"}</button>
          </div>
        </div>
        <div className={reviewed.advancedFilters} id="reviewed-extra-filters" hidden={!advancedOpen}>
          {hr && <>
            <div className={reviewed.selectField}>
              <span>Loại đánh giá</span>
              <SearchableSelect id="reviewed-type-filter" label="Loại đánh giá" value={filters.typeId} options={types} placeholder={lookupsBusy ? "Đang tải…" : "Tất cả loại đánh giá"} disabled={lookupsBusy || !types.length} onChange={(typeId) => setFilters((value) => ({ ...value, typeId, periodId: "" }))} />
            </div>
            <div className={reviewed.selectField}>
              <span>Kỳ đánh giá</span>
              <SearchableSelect id="reviewed-period-filter" label="Kỳ đánh giá" value={filters.periodId} options={availablePeriods} placeholder={lookupsBusy ? "Đang tải…" : !availablePeriods.length ? "Chưa có kỳ đánh giá" : "Tất cả kỳ đánh giá"} disabled={lookupsBusy || !availablePeriods.length} onChange={(periodId) => setFilters((value) => ({ ...value, periodId }))} />
            </div>
          </>}
          <label>
            <span>Từ ngày</span>
            <div className={`${styles.control} ${reviewed.dateControl}`}>
              <input
                type="date"
                value={filters.from}
                max={filters.to || "9999-12-31"}
                aria-invalid={Boolean(filterError)}
                aria-describedby={filterError ? "reviewed-filter-error" : undefined}
                onChange={(event) => {
                  setFilterError("");
                  setFilters((value) => ({ ...value, from: event.target.value }));
                }}
              />
            </div>
          </label>
          <label>
            <span>Đến ngày</span>
            <div className={`${styles.control} ${reviewed.dateControl}`}>
              <input
                type="date"
                value={filters.to}
                min={filters.from || "0001-01-01"}
                max="9999-12-31"
                aria-invalid={Boolean(filterError)}
                aria-describedby={filterError ? "reviewed-filter-error" : undefined}
                onChange={(event) => {
                  setFilterError("");
                  setFilters((value) => ({ ...value, to: event.target.value }));
                }}
              />
            </div>
          </label>
        </div>
        {appliedLabels.length > 0 && <div className={reviewed.appliedFilters}><span>Đang lọc</span>{appliedLabels.map((label, index) => <span key={index} className={reviewed.filterChip}>{label}</span>)}<button type="button" onClick={clearFilters}><Cross2Icon aria-hidden="true" />Xóa lọc</button></div>}
        {filterError && (
          <p className={styles.error} id="reviewed-filter-error" role="alert">
            <InfoCircledIcon aria-hidden="true" />
            {filterError}
          </p>
        )}
        {(lookupError || departmentError) && (
          <div className={styles.error} role="alert">
            <InfoCircledIcon aria-hidden="true" />
            <span>{lookupError || departmentError}</span>
            <button type="button" onClick={() => setLookupRevision((value) => value + 1)}>
              Thử lại
            </button>
          </div>
        )}

      </form>

      <div className={styles.inbox} aria-busy={loading}>
        <div className={styles.listHeading + " " + reviewed.listHeading}>
          <div>
            <span className={styles.listIcon + " " + reviewed.listIcon}>
              <FileTextIcon aria-hidden="true" />
            </span>
            <h2>Bản đánh giá đã xử lý</h2>
            <span className={styles.count}>{data?.total ?? "—"}</span>
          </div>
          <div className={reviewed.listTools}>
            <label>
              <span className={styles.srOnly}>Sắp xếp</span>
              <div className={styles.control}>
                <select value={applied.sortBy} onChange={(event) => {
                  const sortBy = event.target.value;
                  setFilters((value) => ({ ...value, sortBy }));
                  setApplied((value) => ({ ...value, sortBy }));
                  setPage(1);
                }}>
                  <option value="date_desc">Mới nhất</option>
                  <option value="date_asc">Cũ nhất</option>
                  <option value="employee_asc">Tên A→Z</option>
                  <option value="employee_desc">Tên Z→A</option>
                </select>
                <ChevronDownIcon aria-hidden="true" />
              </div>
            </label>
            <button className={styles.refresh} type="button" title="Tải lại danh sách" aria-label="Tải lại danh sách" disabled={loading} onClick={() => setRevision((value) => value + 1)}><ReloadIcon aria-hidden="true" /></button>
          </div>
        </div>
        {error ? (
          <div className={styles.empty} role="alert">
            <span className={styles.emptyIcon}>
              <InfoCircledIcon aria-hidden="true" />
            </span>
            <h3>Chưa tải được danh sách</h3>
            <p>{error}</p>
            <button
              className={styles.button}
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Thử lại
            </button>
            {error.includes("đăng nhập") && (
              <Link
                className={styles.loginLink}
                href={`/login?next=${hr ? "/hr/reviewed" : "/manager/reviewed"}`}
              >
                Đăng nhập lại
              </Link>
            )}
          </div>
        ) : loading || !ready ? (
          <div className={styles.loading} role="status">
            <span className={styles.srOnly}>Đang tải danh sách</span>
            {[0, 1, 2].map((row) => (
              <div key={row} className={styles.skeleton} aria-hidden="true">
                <i />
                <div>
                  <i />
                  <i />
                </div>
                <i />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <CheckCircledIcon aria-hidden="true" />
            </span>
            <h3>{activeFilters ? "Chưa có kết quả phù hợp" : "Chưa có bản đánh giá đã xử lý"}</h3>
            <p>
              {activeFilters
                ? "Thử thay đổi từ khóa hoặc bớt điều kiện lọc."
                : "Các bản đánh giá đã duyệt hoặc từ chối sẽ xuất hiện tại đây."}
            </p>
            {activeFilters > 0 && (
              <button className={styles.button} type="button" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${reviewed.table}`}>
              <caption className={styles.srOnly}>{title}</caption>
              <thead><tr>
                <th scope="col" className={reviewed.employeeColumn}>Nhân viên</th>
                <th scope="col" className={reviewed.periodColumn}>Kỳ đánh giá</th>
                <th scope="col" className={reviewed.statusColumn}>Trạng thái</th>
                <th scope="col" className={reviewed.reviewerColumn}>Người duyệt</th>
                <th scope="col" className={reviewed.scoresColumn}>Điểm đánh giá</th>
                <th scope="col" className={reviewed.resultColumn}>Kết quả</th>
                <th scope="col" className={reviewed.actionsColumn}><span className={styles.srOnly}>Thao tác</span></th>
              </tr></thead>
              <tbody>{data.items.map((item) => <tr key={item.id + ":" + item.evalid} data-status={item.status}>
                <td data-label="Nhân viên" className={reviewed.employeeCell}><div className={styles.employee}><span className={styles.avatar} aria-hidden="true"><PersonIcon aria-hidden="true" /></span><div><strong>{item.employeeName || "Chưa có tên"}</strong><span>{item.employeeCode || "—"}</span><span className={reviewed.department}>{item.departmentName || "—"}</span></div></div></td>
                <td data-label="Kỳ đánh giá" className={reviewed.periodCell}><div className={reviewed.periodIdentity}><span className={reviewed.periodIcon}><CalendarIcon aria-hidden="true" /></span><span className={reviewed.period}>{item.periodLabel || "—"}</span></div></td>
                <td data-label="Trạng thái" className={reviewed.statusCell}><span className={reviewed.status} data-status={item.status}><i aria-hidden="true" />{item.status === "Rejected" ? "Từ chối" : item.status === "Approved" ? "Đã duyệt" : item.status}</span>{item.rejectedReason && <p className={reviewed.reason}>{item.rejectedReason}</p>}</td>
                <td data-label="Người duyệt" className={reviewed.reviewerCell}><strong>{item.approverName || "—"}</strong><span className={reviewed.reviewDate}><ClockIcon aria-hidden="true" /><time dateTime={formatEvaluationDate(item.approvedDate) !== "—" ? item.approvedDate! : undefined}>{formatEvaluationDate(item.approvedDate)}</time></span></td>
                <td data-label="Điểm đánh giá" className={reviewed.scoreCell}><dl className={reviewed.scores}><div><dt>Tổng điểm</dt><dd>{item.totalScore == null ? "—" : scoreFormatter.format(item.totalScore)}</dd></div><div><dt>Quản lý</dt><dd>{item.managerSocre == null ? "—" : scoreFormatter.format(item.managerSocre)}</dd></div></dl></td>
                <td data-label="Kết quả" className={reviewed.resultCell}><span className={reviewed.result} data-empty={!item.band}>{item.band || "—"}</span></td>
                <td data-label="Thao tác" className={reviewed.actionsCell}><button className={styles.button + " " + styles.viewButton} type="button" aria-label={"Xem bản đánh giá của " + (item.employeeName || item.employeeCode || "nhân viên")} disabled><EyeOpenIcon aria-hidden="true" />Xem</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        <Pagination
          itemLabel="bản đánh giá"
          page={page}
          pageSize={pageSize}
          total={data?.total ?? null}
          loading={loading}
          error={Boolean(error)}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </section>
  );
}
