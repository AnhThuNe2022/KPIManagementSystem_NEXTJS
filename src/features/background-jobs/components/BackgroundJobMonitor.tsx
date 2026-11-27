"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronRightIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  ReloadIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { Pagination } from "@/components/ui/Pagination";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { backgroundJobsApi } from "../services/backgroundJobsApi";
import {
  formatJobDateTime,
  JOB_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  jobStatusInfo,
  jobTypeLabel,
  type BackgroundJobItem,
  type BackgroundJobListResponse,
  type BackgroundJobStatistics,
} from "../types";
import { BackgroundJobDetailDialog } from "./BackgroundJobDetailDialog";
import "./BackgroundJobMonitor.css";

interface AppliedFilters {
  keyword: string;
  status: string;
  jobType: string;
  fromDate: string;
  toDate: string;
}

const EMPTY_FILTERS: AppliedFilters = {
  keyword: "",
  status: "",
  jobType: "",
  fromDate: "",
  toDate: "",
};

const numberFormat = new Intl.NumberFormat("vi-VN");

function errorMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message === "UNAUTHORIZED") {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (cause instanceof Error && cause.message === "FORBIDDEN") {
    return "Bạn chưa có quyền xem màn hình Background Jobs.";
  }
  return cause instanceof Error && cause.message && !cause.message.startsWith("API_ERROR_")
    ? cause.message
    : fallback;
}

export function BackgroundJobMonitor() {
  const [stats, setStats] = useState<BackgroundJobStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [draft, setDraft] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);

  const [result, setResult] = useState<BackgroundJobListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedJob, setSelectedJob] = useState<BackgroundJobItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatsLoading(true);
    backgroundJobsApi
      .getStatistics(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setStats(data);
      })
      .catch(() => {
        // List request handles surfacing auth/network errors cleanly
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatsLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    setListLoading(true);
    setListError("");
    backgroundJobsApi
      .getList(
        {
          page,
          pageSize,
          status: applied.status || undefined,
          jobType: applied.jobType || undefined,
          keyword: applied.keyword || undefined,
          fromDate: applied.fromDate || undefined,
          toDate: applied.toDate || undefined,
        },
        controller.signal,
      )
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setListError(errorMessage(cause, "Không tải được danh sách Background Jobs."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setListLoading(false);
      });
    return () => controller.abort();
  }, [applied, page, pageSize, revision]);

  const items = result?.items ?? [];
  const total = result?.total ?? null;
  const refreshing = statsLoading || listLoading;

  const hasFilters = Boolean(
    draft.keyword.trim() ||
      draft.status ||
      draft.jobType ||
      draft.fromDate ||
      draft.toDate ||
      applied.keyword.trim() ||
      applied.status ||
      applied.jobType ||
      applied.fromDate ||
      applied.toDate,
  );

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setApplied({ ...draft, keyword: draft.keyword.trim() });
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  function handleQuickStatus(statusId: string) {
    const nextStatus = applied.status === statusId ? "" : statusId;
    setDraft((prev) => ({ ...prev, status: nextStatus }));
    setApplied((prev) => ({ ...prev, status: nextStatus }));
    setPage(1);
  }

  const statTiles = [
    { key: "total", label: "Tổng số Job", value: stats?.total ?? 0, tone: "neutral", statusId: "" },
    { key: "pending", label: "Chờ xử lý", value: stats?.pending ?? 0, tone: "pending", statusId: "0" },
    { key: "processing", label: "Đang xử lý", value: stats?.processing ?? 0, tone: "processing", statusId: "1" },
    { key: "success", label: "Thành công", value: stats?.success ?? 0, tone: "success", statusId: "2" },
    { key: "failed", label: "Thất bại", value: stats?.failed ?? 0, tone: "failed", statusId: "3" },
    { key: "retryWaiting", label: "Chờ thử lại", value: stats?.retryWaiting ?? 0, tone: "retry", statusId: "5" },
  ] as const;

  return (
    <div className="bg-jobs__page">
      <section className="bg-jobs__hero">
        <div className="bg-jobs__heroCopy">
          <h1>
            Background Job <span>Monitor</span>
          </h1>
          <p>Theo dõi trạng thái, tiến độ xử lý và lịch sử thực thi các tác vụ chạy nền.</p>
        </div>

        <button
          type="button"
          className="bg-jobs__refreshBtn"
          disabled={refreshing}
          onClick={() => setRevision((v) => v + 1)}
        >
          <ReloadIcon data-spinning={refreshing ? "true" : undefined} aria-hidden="true" />
          <span>Làm mới</span>
        </button>
      </section>

      <section className="bg-jobs__stats" aria-label="Thống kê Background Jobs">
        {statTiles.map((tile) => {
          const active = tile.statusId === "" ? applied.status === "" : applied.status === tile.statusId;
          return (
            <button
              key={tile.key}
              type="button"
              className="bg-jobs__statTile"
              data-tone={tile.tone}
              data-active={active ? "true" : undefined}
              aria-pressed={active}
              onClick={() => handleQuickStatus(tile.statusId)}
            >
              <span className="bg-jobs__statLabel">
                <i aria-hidden="true" />
                {tile.label}
              </span>
              <strong className="bg-jobs__statValue">
                {stats ? numberFormat.format(tile.value) : "—"}
              </strong>
            </button>
          );
        })}
      </section>

      <section className="bg-jobs__card bg-jobs__filterCard" aria-label="Bộ lọc Background Jobs">
        <div className="bg-jobs__filterHead">
          <MixerHorizontalIcon aria-hidden="true" />
          <h2>Bộ lọc</h2>
        </div>

        <form className="bg-jobs__filterForm" onSubmit={handleApply}>
          <div className="bg-jobs__field bg-jobs__field--search">
            <label htmlFor="bg-jobs-keyword">Tìm kiếm Job</label>
            <div className="bg-jobs__inputWrap">
              <MagnifyingGlassIcon className="bg-jobs__inputIcon" aria-hidden="true" />
              <input
                id="bg-jobs-keyword"
                type="text"
                value={draft.keyword}
                placeholder="Tên Job…"
                onChange={(event) => setDraft((prev) => ({ ...prev, keyword: event.target.value }))}
              />
              {draft.keyword && (
                <button
                  type="button"
                  className="bg-jobs__clearBtn"
                  aria-label="Xóa từ khóa"
                  onClick={() => setDraft((prev) => ({ ...prev, keyword: "" }))}
                >
                  <Cross2Icon aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-jobs__field">
            <label htmlFor="bg-jobs-status">Trạng thái</label>
            <SearchableSelect
              id="bg-jobs-status"
              label="Trạng thái"
              placeholder="Tất cả trạng thái"
              value={draft.status}
              options={JOB_STATUS_OPTIONS}
              onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))}
            />
          </div>

          <div className="bg-jobs__field">
            <label htmlFor="bg-jobs-type">Loại Job</label>
            <SearchableSelect
              id="bg-jobs-type"
              label="Loại Job"
              placeholder="Tất cả loại Job"
              value={draft.jobType}
              options={JOB_TYPE_OPTIONS}
              onChange={(value) => setDraft((prev) => ({ ...prev, jobType: value }))}
            />
          </div>

          <div className="bg-jobs__field">
            <label htmlFor="bg-jobs-from">Từ ngày</label>
            <input
              id="bg-jobs-from"
              type="date"
              className="bg-jobs__dateInput"
              value={draft.fromDate}
              max={draft.toDate || undefined}
              onChange={(event) => setDraft((prev) => ({ ...prev, fromDate: event.target.value }))}
            />
          </div>

          <div className="bg-jobs__field">
            <label htmlFor="bg-jobs-to">Đến ngày</label>
            <input
              id="bg-jobs-to"
              type="date"
              className="bg-jobs__dateInput"
              value={draft.toDate}
              min={draft.fromDate || undefined}
              onChange={(event) => setDraft((prev) => ({ ...prev, toDate: event.target.value }))}
            />
          </div>

          <div className="bg-jobs__filterActions">
            <button type="submit" className="bg-jobs__primaryBtn">
              Lọc
            </button>
            {hasFilters && (
              <button type="button" className="bg-jobs__ghostBtn" onClick={handleReset}>
                <ResetIcon aria-hidden="true" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-jobs__card bg-jobs__tableCard" aria-label="Danh sách Background Jobs">
        <div className="bg-jobs__tableHead">
          <h2>Danh sách Background Jobs</h2>
          <span className="bg-jobs__countPill">
            {total !== null ? `${numberFormat.format(total)} Jobs` : "…"}
          </span>
        </div>

        {listError ? (
          <div className="bg-jobs__emptyState" role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            <p>{listError}</p>
            <button type="button" className="bg-jobs__ghostBtn" onClick={() => setRevision((v) => v + 1)}>
              <ReloadIcon aria-hidden="true" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : listLoading && items.length === 0 ? (
          <div className="bg-jobs__skeletonList" role="status" aria-busy="true" aria-label="Đang tải danh sách">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-jobs__skeletonRow" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-jobs__emptyState">
            <p>Không tìm thấy Background Job nào phù hợp với bộ lọc hiện tại.</p>
            {hasFilters && (
              <button type="button" className="bg-jobs__ghostBtn" onClick={handleReset}>
                <ResetIcon aria-hidden="true" />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-jobs__tableScroll" data-loading={listLoading ? "true" : undefined}>
              <table className="bg-jobs__table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên Job</th>
                    <th>Loại Job</th>
                    <th>Trạng thái</th>
                    <th>Số lần thử</th>
                    <th>Thời gian chạy lần đầu</th>
                    <th>Lần thử tiếp theo</th>
                    <th>Ngày tạo</th>
                    <th aria-label="Xem chi tiết" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((job) => {
                    const statusInfo = jobStatusInfo(job.status);
                    return (
                      <tr
                        key={job.id}
                        tabIndex={0}
                        className="bg-jobs__row"
                        onClick={() => setSelectedJob(job)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedJob(job);
                          }
                        }}
                      >
                        <td className="bg-jobs__idCell">#{job.id}</td>
                        <td className="bg-jobs__nameCell">{job.jobName}</td>
                        <td>{jobTypeLabel(job.jobType)}</td>
                        <td>
                          <span className="bg-jobs__badge" data-tone={statusInfo.tone}>
                            <i aria-hidden="true" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="bg-jobs__nums" data-warn={job.retryCount > 0 ? "true" : undefined}>
                          {job.retryCount} / {job.maxRetryCount}
                        </td>
                        <td className="bg-jobs__nums">{formatJobDateTime(job.scheduledAt)}</td>
                        <td className="bg-jobs__nums">{formatJobDateTime(job.nextRetryAt)}</td>
                        <td className="bg-jobs__nums">{formatJobDateTime(job.createdAt)}</td>
                        <td className="bg-jobs__chevronCell">
                          <ChevronRightIcon aria-hidden="true" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-jobs__mobileList" data-loading={listLoading ? "true" : undefined}>
              {items.map((job) => {
                const statusInfo = jobStatusInfo(job.status);
                return (
                  <button
                    key={job.id}
                    type="button"
                    className="bg-jobs__mobileItem"
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="bg-jobs__mobileTop">
                      <span className="bg-jobs__idCell">#{job.id}</span>
                      <span className="bg-jobs__badge" data-tone={statusInfo.tone}>
                        <i aria-hidden="true" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <strong className="bg-jobs__mobileTitle">{job.jobName}</strong>
                    <div className="bg-jobs__mobileMeta">
                      <span>{jobTypeLabel(job.jobType)}</span>
                      <span className="bg-jobs__nums">
                        Thử: {job.retryCount} / {job.maxRetryCount}
                      </span>
                      <span className="bg-jobs__nums">{formatJobDateTime(job.scheduledAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          loading={listLoading}
          error={Boolean(listError)}
          itemLabel="job"
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      <BackgroundJobDetailDialog job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
