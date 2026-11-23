"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  ArrowDownIcon,
  CalendarIcon,
  CaretSortIcon,
  CheckCircledIcon,
  ClockIcon,
  DashboardIcon,
  ExclamationTriangleIcon,
  FileTextIcon,
  IdCardIcon,
  LayersIcon,
  MixerHorizontalIcon,
  Pencil2Icon,
  PlusIcon,
  ReloadIcon,
  RowsIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { Pagination } from "@/components/ui/Pagination";
import { notify } from "@/components/ui/Toaster";
import type { PagedResult } from "@/lib/api/types";
import "@/features/department/components/DepartmentManagement.css";
import { requestMessage } from "../evaluationDisplay";
import {
  evaluationPeriodApi,
  getPeriodTypeMeta,
  normalizePeriodType,
  type EvaluationPeriod,
} from "../services/evaluationPeriodApi";
import { EvaluationPeriodEditor } from "./EvaluationPeriodEditor";
import "./EvaluationPeriodList.css";

type Status = "all" | "active" | "inactive";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatPeriodDate(value: string | null): string {
  const parsed = value ? new Date(value) : null;
  if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.getFullYear() < 1900) {
    return "—";
  }
  return dateFormatter.format(parsed);
}

function templateInfoOf(period: EvaluationPeriod): { count: number | null; tooltip?: string } {
  if (Array.isArray(period.templatePeriodDtos)) {
    const names = period.templatePeriodDtos
      .map((entry) => entry.templateName?.trim())
      .filter((name): name is string => Boolean(name));
    return {
      count: period.templatePeriodDtos.length,
      tooltip: names.length ? `Biểu mẫu áp dụng: ${names.join(", ")}` : undefined,
    };
  }
  if (Array.isArray(period.listTemplateId)) {
    return { count: period.listTemplateId.length };
  }
  if (period.templateId != null) {
    return { count: 1 };
  }
  return { count: null };
}

function getScheduleHint(
  period: EvaluationPeriod,
  nowMs: number | null,
): { tone: "ongoing" | "upcoming" | "ended"; label: string } | null {
  if (!period.isActive || nowMs == null) return null;
  const startMs = period.startDate ? new Date(period.startDate).getTime() : NaN;
  const endMs = period.endDate ? new Date(period.endDate).getTime() : NaN;
  if (Number.isFinite(startMs) && new Date(startMs).getFullYear() >= 1900 && nowMs < startMs) {
    return { tone: "upcoming", label: "Sắp bắt đầu" };
  }
  if (Number.isFinite(endMs) && new Date(endMs).getFullYear() >= 1900) {
    if (nowMs > endMs) return { tone: "ended", label: "Đã qua hạn kết thúc" };
    return { tone: "ongoing", label: "Đang trong thời gian đánh giá" };
  }
  return null;
}

export function EvaluationPeriodList() {
  const [query, setQuery] = useState({ page: 1, pageSize: 10, revision: 0 });
  const [result, setResult] = useState<{
    query: typeof query;
    data?: PagedResult<EvaluationPeriod>;
    error?: string;
  }>();
  const [introPhase, setIntroPhase] = useState<"pending" | "playing" | "done">("pending");
  const [status, setStatus] = useState<Status>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [descending, setDescending] = useState(false);
  const [editor, setEditor] = useState<EvaluationPeriod | "new" | null>(null);
  const [deleting, setDeleting] = useState<EvaluationPeriod | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");
  const [nowMs, setNowMs] = useState<number | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number } | null>(null);

  const current = result?.query === query ? result : undefined;
  const loading = !current;
  const { data, error } = current ?? {};
  const items = useMemo(() => data?.items ?? [], [data]);
  const showSkeleton = loading && !data;

  useEffect(() => {
    setNowMs(Date.now());
    const saved = window.localStorage.getItem("evaluation-period-view");
    if (saved === "grid" || saved === "table") setView(saved);
  }, []);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setEditor("new");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    evaluationPeriodApi
      .getPage(query.page, query.pageSize, controller.signal)
      .then((pageData) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(pageData.total / query.pageSize));
        if (query.page > lastPage) {
          setQuery((prev) => ({ ...prev, page: lastPage }));
          return;
        }
        setResult({ query, data: pageData });
        setIntroPhase((prev) => (prev === "pending" ? "playing" : prev));
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setResult({
            query,
            error: requestMessage(cause, "Chưa tải được danh sách kỳ đánh giá."),
          });
        }
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (introPhase !== "playing") return;
    const timer = window.setTimeout(() => setIntroPhase("done"), 1000);
    return () => window.clearTimeout(timer);
  }, [introPhase]);

  useLayoutEffect(() => {
    const tabs = tabsRef.current;
    const selected = tabs?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!tabs || !selected) return;
    const measure = () => {
      const left = selected.offsetLeft;
      const width = selected.offsetWidth;
      setTabIndicator((prev) => (prev?.left === left && prev.width === width ? prev : { left, width }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    observer.observe(selected);
    return () => observer.disconnect();
  }, [status, showSkeleton]);

  function changeView(next: "table" | "grid") {
    setView(next);
    window.localStorage.setItem("evaluation-period-view", next);
  }

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Status[] = ["all", "active", "inactive"];
    let index = keys.indexOf(status);
    if (event.key === "ArrowRight") index = (index + 1) % keys.length;
    else if (event.key === "ArrowLeft") index = (index + keys.length - 1) % keys.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = keys.length - 1;
    else return;
    event.preventDefault();
    setStatus(keys[index]);
    document.getElementById("period-tab-" + keys[index])?.focus();
  }

  const visible = useMemo(() => {
    const filtered = items.filter((item) => {
      if (status !== "all" && item.isActive !== (status === "active")) return false;
      const normalizedType = normalizePeriodType(item.periodType);
      if (typeFilter !== "all" && normalizedType !== typeFilter) return false;
      return true;
    });
    if (!descending) return filtered;
    return [...filtered].sort((a, b) => (b.name ?? "").localeCompare(a.name ?? "", "vi"));
  }, [items, status, typeFilter, descending]);

  const activeCount = items.filter((item) => item.isActive === true).length;
  const inactiveCount = items.filter((item) => item.isActive === false).length;
  const activeRate = items.length ? Math.round((activeCount / items.length) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / query.pageSize));

  const byType = useMemo(
    () =>
      Object.values(
        items.reduce<Record<string, { id: string; label: string; n: number; tone: string }>>((acc, item) => {
          const id = normalizePeriodType(item.periodType) ?? "None";
          const meta = getPeriodTypeMeta(item.periodType);
          const label = meta?.label ?? "Khác";
          const tone = meta?.tone ?? "neutral";
          (acc[id] ??= { id, label, n: 0, tone }).n += 1;
          return acc;
        }, {}),
      ).sort((a, b) => b.n - a.n),
    [items],
  );

  const hasFilters = status !== "all" || typeFilter !== "all";

  function clearFilters() {
    setStatus("all");
    setTypeFilter("all");
  }

  return (
    <div
      className="department-page period-page"
      data-intro={introPhase}
      onPointerDown={() => setIntroPhase("done")}
      onKeyDownCapture={() => setIntroPhase("done")}
    >
      <header className="period-hero">
        <div className="period-hero-copy">
          <span className="period-eyebrow">Danh mục kỳ KPI</span>
          <h1>Quản lý kỳ đánh giá KPI</h1>
          <p>Quản lý chu kỳ, thời gian hiệu lực và bộ biểu mẫu áp dụng cho từng kỳ đánh giá.</p>
        </div>

        <div className="period-hero-aside">
          <div className="period-glass-dock" aria-label="Tổng quan nhanh trang hiện tại">
            <div className="period-dock-metric" title={data ? `Trang ${query.page} / ${totalPages}` : undefined}>
              <span className="period-dock-icon" data-tone="brand">
                <CalendarIcon aria-hidden="true" />
              </span>
              <span className="period-dock-copy">
                <strong>{data ? data.total.toLocaleString("vi-VN") : "—"}</strong>
                <small>{data ? `Trang ${query.page}/${totalPages}` : "Đang tải"}</small>
              </span>
            </div>

            <span className="period-dock-divider" aria-hidden="true" />

            <div className="period-dock-metric" title="Tỉ lệ kỳ đang hoạt động trên trang hiện tại">
              <span className="period-dock-icon" data-tone="green">
                <CheckCircledIcon aria-hidden="true" />
              </span>
              <span className="period-dock-copy">
                <strong>{showSkeleton ? "—" : `${activeCount}/${items.length}`}</strong>
                <small>{showSkeleton ? "Hiệu lực" : `${activeRate}% hoạt động`}</small>
              </span>
            </div>

            {byType.length > 0 && (
              <>
                <span className="period-dock-divider period-dock-hide-sm" aria-hidden="true" />
                <div className="period-dock-types period-dock-hide-sm" role="group" aria-label="Lọc nhanh theo loại kỳ">
                  {byType.slice(0, 3).map((entry) => {
                    const selected = typeFilter === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className="period-dock-chip"
                        data-seg={entry.tone}
                        aria-pressed={selected}
                        onClick={() => setTypeFilter((prev) => (prev === entry.id ? "all" : entry.id))}
                        title={`Lọc loại ${entry.label}`}
                      >
                        <i aria-hidden="true" />
                        <span>{entry.label}</span>
                        <b>{entry.n}</b>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            aria-haspopup="dialog"
            className="period-hero-primary"
            onClick={() => setEditor("new")}
          >
            <PlusIcon aria-hidden="true" />
            <span>Thêm kỳ đánh giá</span>
            <kbd>N</kbd>
          </button>
        </div>
      </header>

      <section className="department-workspace period-workspace" aria-label="Danh sách kỳ đánh giá KPI">
        <div className="department-workspace-header period-workspace-header">
          <div
            ref={tabsRef}
            className="department-tabs"
            data-indicator-ready={!!tabIndicator}
            role="tablist"
            aria-label="Trạng thái kỳ đánh giá"
            onKeyDown={navigateTabs}
          >
            {([
              ["all", "Tất cả", items.length],
              ["active", "Hoạt động", activeCount],
              ["inactive", "Tạm ngưng", inactiveCount],
            ] as const).map(([key, label, count]) => (
              <button
                key={key}
                id={"period-tab-" + key}
                type="button"
                role="tab"
                tabIndex={status === key ? 0 : -1}
                aria-selected={status === key}
                aria-controls="period-results"
                onClick={() => setStatus(key)}
              >
                {key === "all" ? (
                  <LayersIcon aria-hidden="true" />
                ) : key === "active" ? (
                  <CheckCircledIcon aria-hidden="true" />
                ) : (
                  <ClockIcon aria-hidden="true" />
                )}
                {label}
                <span className="department-count">{showSkeleton ? "—" : count.toLocaleString("vi-VN")}</span>
              </button>
            ))}
            {tabIndicator && (
              <span
                className="department-tab-indicator"
                aria-hidden="true"
                style={{
                  transform: "translateX(" + tabIndicator.left + "px) scaleX(" + tabIndicator.width + ")",
                }}
              />
            )}
          </div>

          <div className="department-toolbar period-toolbar">
            <div className="department-view-toggle" role="group" aria-label="Kiểu hiển thị">
              <button
                type="button"
                aria-pressed={view === "table"}
                title="Dạng bảng"
                aria-label="Dạng bảng"
                onClick={() => changeView("table")}
              >
                <RowsIcon aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-pressed={view === "grid"}
                title="Dạng thẻ"
                aria-label="Dạng thẻ"
                onClick={() => changeView("grid")}
              >
                <DashboardIcon aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="department-icon-button"
              aria-label="Làm mới danh sách"
              title="Làm mới danh sách"
              disabled={loading}
              onClick={() => setQuery((prev) => ({ ...prev, revision: prev.revision + 1 }))}
            >
              <ReloadIcon className={loading ? "department-spinning" : ""} aria-hidden="true" />
            </button>
          </div>
        </div>

        {error && (
          <div className="department-error" role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => setQuery((prev) => ({ ...prev, revision: prev.revision + 1 }))}>
              Thử lại
            </button>
          </div>
        )}

        <div
          key={`${status}-${typeFilter}`}
          id="period-results"
          role="tabpanel"
          aria-labelledby={"period-tab-" + status}
          aria-busy={loading}
          className="department-results"
        >
          {view === "table" ? (
            <div className="overflow-x-auto">
              <table className={"department-table period-table" + (loading && data ? " department-loading" : "")}>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label">
                        <IdCardIcon aria-hidden="true" />
                        Mã kỳ
                      </span>
                    </th>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label">
                        <MixerHorizontalIcon aria-hidden="true" />
                        Loại kỳ
                      </span>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className="department-sort period-th-sort"
                        data-sorted={descending}
                        onClick={() => setDescending((v) => !v)}
                        aria-label={descending ? "Bỏ sắp xếp tên" : "Sắp xếp tên Z đến A"}
                        title={descending ? "Đang xếp Z → A (bấm để mặc định)" : "Sắp xếp tên Z → A"}
                      >
                        <LayersIcon aria-hidden="true" />
                        <span>Tên kỳ đánh giá</span>
                        {descending ? (
                          <ArrowDownIcon className="period-sort-caret" aria-hidden="true" />
                        ) : (
                          <CaretSortIcon className="period-sort-caret is-idle" aria-hidden="true" />
                        )}
                      </button>
                    </th>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label">
                        <CalendarIcon aria-hidden="true" />
                        Năm
                      </span>
                    </th>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label">
                        <CalendarIcon aria-hidden="true" />
                        Tháng
                      </span>
                    </th>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label">
                        <LayersIcon aria-hidden="true" />
                        Quý
                      </span>
                    </th>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label">
                        <CheckCircledIcon aria-hidden="true" />
                        Hiệu lực
                      </span>
                    </th>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label">
                        <ClockIcon aria-hidden="true" />
                        Bắt đầu
                      </span>
                    </th>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label">
                        <ClockIcon aria-hidden="true" />
                        Kết thúc
                      </span>
                    </th>
                    <th scope="col">
                      <span className="department-columnLabel period-th-label period-th-actions">
                        Thao tác
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {showSkeleton
                    ? Array.from({ length: 6 }, (_, index) => (
                        <tr key={index} aria-hidden="true">
                          <td><div className="department-skeleton" /></td>
                          <td><div className="department-skeleton" /></td>
                          <td>
                            <div className="department-skeleton department-skeleton-name" />
                            <div className="department-skeleton department-skeleton-description" />
                          </td>
                          <td><div className="department-skeleton" /></td>
                          <td><div className="department-skeleton" /></td>
                          <td><div className="department-skeleton" /></td>
                          <td><div className="department-skeleton department-skeleton-status" /></td>
                          <td><div className="department-skeleton" /></td>
                          <td><div className="department-skeleton" /></td>
                          <td><div className="department-skeleton" /></td>
                        </tr>
                      ))
                    : visible.map((period, index) => {
                        const typeMeta = getPeriodTypeMeta(period.periodType);
                        const templateInfo = templateInfoOf(period);
                        const scheduleHint = getScheduleHint(period, nowMs);
                        return (
                          <tr
                            key={period.id ?? index}
                            data-inactive={period.isActive === false}
                            style={{ "--item-index": Math.min(index, 7) } as CSSProperties}
                          >
                            <td>
                              {period.id != null ? (
                                <span className="period-code-chip">#{period.id}</span>
                              ) : (
                                <span className="period-empty-dash">—</span>
                              )}
                            </td>
                            <td>
                              {typeMeta ? (
                                <span className="period-type-badge" data-tone={typeMeta.tone}>
                                  <i className="period-type-dot" aria-hidden="true" />
                                  {typeMeta.label}
                                </span>
                              ) : (
                                <span className="period-empty-dash">—</span>
                              )}
                            </td>
                            <td>
                              <div className="department-name-cell">
                                <span className={"department-folder" + (period.isActive ? "" : " is-muted")}>
                                  <CalendarIcon aria-hidden="true" />
                                </span>
                                <div className="period-name-wrap">
                                  <button
                                    type="button"
                                    className="department-name"
                                    title={period.name ?? undefined}
                                    disabled={period.id == null}
                                    onClick={() => setEditor(period)}
                                  >
                                    {period.name || "—"}
                                  </button>
                                  {templateInfo.count != null && templateInfo.count > 0 ? (
                                    <span
                                      className="period-template-tag"
                                      title={templateInfo.tooltip}
                                    >
                                      <FileTextIcon aria-hidden="true" />
                                      <span>{templateInfo.count} biểu mẫu áp dụng</span>
                                    </span>
                                  ) : (
                                    <span className="period-template-tag is-empty">
                                      Chưa gắn biểu mẫu
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="tabular-nums period-year-cell">
                              {period.year ? period.year : <span className="period-empty-dash">—</span>}
                            </td>
                            <td className="tabular-nums">
                              {period.month ? (
                                <span className="period-cycle-chip">T{period.month}</span>
                              ) : (
                                <span className="period-empty-dash" aria-label="Không áp dụng tháng">—</span>
                              )}
                            </td>
                            <td className="tabular-nums">
                              {period.quarter ? (
                                <span className="period-cycle-chip is-quarter">Q{period.quarter}</span>
                              ) : (
                                <span className="period-empty-dash" aria-label="Không áp dụng quý">—</span>
                              )}
                            </td>
                            <td>
                              {period.isActive != null ? (
                                <span className={"department-status " + (period.isActive ? "active" : "inactive")}>
                                  <span className="department-dot" />
                                  {period.isActive ? "Hoạt động" : "Tạm ngưng"}
                                </span>
                              ) : (
                                <span className="period-empty-dash">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap tabular-nums period-date-cell">
                              {formatPeriodDate(period.startDate)}
                            </td>
                            <td className="whitespace-nowrap tabular-nums period-date-cell">
                              <span className="period-end-date">
                                <span>{formatPeriodDate(period.endDate)}</span>
                                {scheduleHint && (
                                  <span
                                    className="period-schedule-dot"
                                    data-tone={scheduleHint.tone}
                                    title={scheduleHint.label}
                                    aria-label={scheduleHint.label}
                                  />
                                )}
                              </span>
                            </td>
                            <td>
                              <div className="department-row-actions">
                                <button
                                  type="button"
                                  className="department-icon-button"
                                  disabled={period.id == null}
                                  title="Chỉnh sửa kỳ đánh giá"
                                  aria-label={"Chỉnh sửa " + (period.name ?? period.id ?? "")}
                                  onClick={() => setEditor(period)}
                                >
                                  <Pencil2Icon aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="department-icon-button department-delete-button"
                                  disabled={period.id == null}
                                  title="Xóa kỳ đánh giá"
                                  aria-label={"Xóa " + (period.name ?? period.id ?? "")}
                                  onClick={() => setDeleting(period)}
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
          ) : (
            <ul className={"department-grid period-grid" + (loading && data ? " department-loading" : "")}>
              {showSkeleton
                ? Array.from({ length: 6 }, (_, index) => (
                    <li key={index} aria-hidden="true" className="department-card period-card">
                      <div className="department-skeleton department-skeleton-name" />
                      <div className="department-skeleton department-skeleton-description" />
                      <div className="department-skeleton" style={{ marginTop: 28 }} />
                    </li>
                  ))
                : visible.map((period, index) => {
                    const typeMeta = getPeriodTypeMeta(period.periodType);
                    const templateInfo = templateInfoOf(period);
                    const scheduleHint = getScheduleHint(period, nowMs);
                    return (
                      <li
                        key={period.id ?? index}
                        style={{ "--item-index": Math.min(index, 7) } as CSSProperties}
                        data-tone={typeMeta?.tone ?? "neutral"}
                        className={"department-card period-card" + (period.isActive ? "" : " is-inactive")}
                      >
                        <div className="department-card-top period-card-top">
                          <div className="flex items-center gap-2">
                            {period.id != null && <span className="period-code-chip">#{period.id}</span>}
                            {typeMeta && (
                              <span className="period-type-badge" data-tone={typeMeta.tone}>
                                <i className="period-type-dot" aria-hidden="true" />
                                {typeMeta.label}
                              </span>
                            )}
                          </div>
                          {period.isActive != null && (
                            <span className={"department-status " + (period.isActive ? "active" : "inactive")}>
                              <span className="department-dot" />
                              {period.isActive ? "Hoạt động" : "Tạm ngưng"}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="department-name"
                          title={period.name ?? undefined}
                          disabled={period.id == null}
                          onClick={() => setEditor(period)}
                        >
                          {period.name || "—"}
                        </button>

                        <div className="period-card-meta">
                          {period.year && <span className="period-meta-chip">Năm {period.year}</span>}
                          {period.month && <span className="period-cycle-chip">Tháng {period.month}</span>}
                          {period.quarter && <span className="period-cycle-chip is-quarter">Quý {period.quarter}</span>}
                          {templateInfo.count != null && templateInfo.count > 0 && (
                            <span className="period-template-tag" title={templateInfo.tooltip}>
                              <FileTextIcon aria-hidden="true" />
                              <span>{templateInfo.count} biểu mẫu</span>
                            </span>
                          )}
                        </div>

                        <div className="department-card-foot period-card-foot">
                          <div className="period-card-dates">
                            <ClockIcon aria-hidden="true" />
                            <span className="tabular-nums">
                              {formatPeriodDate(period.startDate)} → {formatPeriodDate(period.endDate)}
                            </span>
                            {scheduleHint && (
                              <span
                                className="period-schedule-dot"
                                data-tone={scheduleHint.tone}
                                title={scheduleHint.label}
                                aria-label={scheduleHint.label}
                              />
                            )}
                          </div>
                          <div className="department-row-actions">
                            <button
                              type="button"
                              className="department-icon-button"
                              disabled={period.id == null}
                              title="Chỉnh sửa kỳ đánh giá"
                              aria-label={"Chỉnh sửa " + (period.name ?? period.id ?? "")}
                              onClick={() => setEditor(period)}
                            >
                              <Pencil2Icon aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="department-icon-button department-delete-button"
                              disabled={period.id == null}
                              title="Xóa kỳ đánh giá"
                              aria-label={"Xóa " + (period.name ?? period.id ?? "")}
                              onClick={() => setDeleting(period)}
                            >
                              <TrashIcon aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
            </ul>
          )}

          {!loading && !visible.length && (
            <div className="department-empty">
              <span>
                <CalendarIcon aria-hidden="true" />
              </span>
              <h2>
                {error
                  ? "Chưa tải được danh sách"
                  : hasFilters
                    ? "Không tìm thấy kỳ đánh giá phù hợp"
                    : "Chưa có kỳ đánh giá nào"}
              </h2>
              <p>
                {error
                  ? "Thử tải lại để xem thông tin kỳ đánh giá."
                  : hasFilters
                    ? "Thử đặt lại bộ lọc trạng thái hoặc loại kỳ."
                    : "Bắt đầu bằng việc thêm kỳ đánh giá đầu tiên."}
              </p>
              <button
                type="button"
                className="department-button"
                onClick={
                  error
                    ? () => setQuery((prev) => ({ ...prev, revision: prev.revision + 1 }))
                    : hasFilters
                      ? clearFilters
                      : () => setEditor("new")
                }
              >
                {error ? "Tải lại danh sách" : hasFilters ? "Đặt lại bộ lọc" : "Thêm kỳ đánh giá"}
              </button>
            </div>
          )}
        </div>

        <Pagination
          itemLabel="kỳ đánh giá"
          page={query.page}
          pageSize={query.pageSize}
          total={data?.total ?? null}
          loading={loading}
          error={!!error}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setQuery((prev) => ({ ...prev, page: 1, pageSize }))}
        />
      </section>

      {editor && (
        <EvaluationPeriodEditor
          key={editor === "new" ? "new" : editor.id}
          period={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            const isNew = editor === "new";
            setEditor(null);
            setQuery((prev) => ({
              ...prev,
              page: isNew ? 1 : prev.page,
              revision: prev.revision + 1,
            }));
          }}
        />
      )}
      {deleting && (
        <DeletePeriodDialog
          key={deleting.id ?? "delete"}
          period={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setQuery((prev) => ({ ...prev, revision: prev.revision + 1 }));
          }}
        />
      )}
    </div>
  );
}

function DeletePeriodDialog({
  period,
  onClose,
  onDeleted,
}: {
  period: EvaluationPeriod;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = period.name?.trim() || `Kỳ #${period.id}`;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function remove() {
    if (busy || period.id == null) return;
    setBusy(true);
    setError("");
    try {
      await evaluationPeriodApi.remove(period.id);
      notify("success", `Đã xóa ${label}.`);
      onDeleted();
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message === "PERIOD_DELETE_REJECTED"
          ? "Hệ thống không chấp nhận xóa kỳ đánh giá này (kỳ có thể đang được sử dụng)."
          : requestMessage(cause, "Không thể xóa kỳ đánh giá.");
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="department-delete-dialog"
      aria-labelledby="period-delete-title"
      aria-describedby="period-delete-description"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <span className="department-delete-symbol">
        <TrashIcon aria-hidden="true" />
      </span>
      <h2 id="period-delete-title">Xóa kỳ đánh giá?</h2>
      <p id="period-delete-description">
        Bạn đang xóa <strong>{label}</strong>. Thao tác này không thể hoàn tác.
      </p>
      {error && (
        <p className="department-form-error" role="alert">
          <ExclamationTriangleIcon aria-hidden="true" />
          {error}
        </p>
      )}
      <footer>
        <button autoFocus type="button" className="department-button" onClick={onClose} disabled={busy}>
          Giữ lại
        </button>
        <button type="button" className="department-button department-primary" onClick={remove} disabled={busy}>
          {busy ? "Đang xóa…" : "Xóa kỳ đánh giá"}
        </button>
      </footer>
    </dialog>
  );
}
