"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityLogIcon, CalendarIcon, FileTextIcon, LayersIcon, MagnifyingGlassIcon, MixIcon, PlusIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Pagination } from "@/components/ui/Pagination";
import "./EvaluationList.css";
import { useRouter } from "next/navigation";
import { notify } from "@/components/ui/Toaster";

import { evaluationApi } from "@/features/evaluation/services/evaluationApi";
import { hrStatusLabel, requestMessage, statusKey as resolveStatusKey } from "../evaluationDisplay";
import type { EvaluationDto } from "@/features/evaluation/types";

type StatusGroup = "all" | "waiting" | "done" | "other";

function statusTone(status: string | number): "danger" | "success" | "waiting" | "neutral" {
  const parts = resolveStatusKey(status)
    .toLowerCase()
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length || parts.some((part) => ["drafted", "unknown", "imported"].includes(part))) {
    return "neutral";
  }
  if (parts.some((part) => part === "rejected")) return "danger";
  if (parts.every((part) => ["over", "compilehrlist", "senthr"].includes(part))) return "success";
  return "waiting";
}

export default function EvaluationList() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EvaluationDto[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusGroup>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [revision, setRevision] = useState(0);

  const loadData = useCallback(async (signal: AbortSignal) => {
    setLoading(true);

    try {
      const result = await evaluationApi.getPaged({
        page,
        pageSize,
        filters: {
          getMy: "123",
          // sortOrder: "desc",
        },
      }, signal);
      if (signal.aborted) return;

      setItems(result.data?.items ?? []);
      setTotalCount(result.data?.total ?? 0);
    } catch (error) {
      if (signal.aborted) return;
      const message =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định.";

      notify("error", `Lỗi tải danh sách: ${requestMessage(error, message)}`);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, revision]);

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const waitingCount = items.filter(item => statusTone(item.status) === "waiting").length;
  const doneCount = items.filter(item => statusTone(item.status) === "success").length;
  const otherCount = items.length - waitingCount - doneCount;
  const visibleItems = items.filter(item => {
    const tone = statusTone(item.status);
    if (statusFilter === "waiting" && tone !== "waiting") return false;
    if (statusFilter === "done" && tone !== "success") return false;
    if (statusFilter === "other" && (tone === "waiting" || tone === "success")) return false;
    if (!normalizedQuery) return true;
    return (
      (item.templateName || "").toLowerCase().includes(normalizedQuery) ||
      (item.period || "").toLowerCase().includes(normalizedQuery) ||
      hrStatusLabel(item.status, " và ").toLowerCase().includes(normalizedQuery)
    );
  });

  const createNew = () => {
    router.push("/kpievaluation");
  };

  if (loading) {
    return (
      <div className="evaluation-list__page" role="status" aria-label="Đang tải bản đánh giá" aria-busy="true">
        <div className="evaluation-list__loadingHeader" />
        <div className="evaluation-list__loadingTable">
          <div /><div /><div />
        </div>
        <span className="sr-only">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="evaluation-list__page">
      <header className="evaluation-list__header">
        <div className="evaluation-list__headerContent">
          <span className="evaluation-list__eyebrow">Đánh giá KPI</span>
          {/* TITLE */}
          <h1
            className="evaluation-list__title"
          >
            Danh sách bản đánh giá
          </h1>
          <p className="evaluation-list__description">Theo dõi và cập nhật các bản đánh giá KPI của bạn.</p>

          {/* CREATE BUTTON */}
          <div className="evaluation-list__createAction">
            <button
              type="button"
              onClick={createNew}
              title="Tạo mới"
              className="evaluation-list__createButton"
            >
              <PlusIcon aria-hidden="true" />
              Tạo bản đánh giá
            </button>
          </div>
        </div>
        <div className="evaluation-list__glassCard" aria-hidden="true">
          <span className="evaluation-list__glassRing" />
          <div className="evaluation-list__glassBars">
            <span className="is-accent" />
            <span />
          </div>
        </div>
      </header>

      {/* TABLE */}
      <div
        className="evaluation-list__list"
      >
        <div className="evaluation-list__toolbar">
          <div className="evaluation-list__filterPills" role="tablist" aria-label="Lọc nhanh theo trạng thái">
            {(
              [
                ["all", "Tất cả", items.length],
                ["waiting", "Đang duyệt", waitingCount],
                ["done", "Hoàn tất", doneCount],
                ["other", "Khác", otherCount],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={statusFilter === key}
                className="evaluation-list__filterPill"
                onClick={() => setStatusFilter(key)}
              >
                <span>{label}</span>
                <span className="evaluation-list__filterCount">{count}</span>
              </button>
            ))}
          </div>
          <div className="evaluation-list__toolbarRight">
            <div className="evaluation-list__searchBox">
              <MagnifyingGlassIcon aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm tên bản đánh giá hoặc kỳ…"
                aria-label="Tìm tên bản đánh giá hoặc kỳ"
              />
            </div>
            <button
              type="button"
              className="evaluation-list__refreshBtn"
              onClick={() => setRevision(v => v + 1)}
              title="Làm mới danh sách"
              aria-label="Làm mới danh sách"
            >
              <ReloadIcon aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="evaluation-list__tableWrap">
          <table className="evaluation-list__table" aria-label="Danh sách bản đánh giá">
            {/* HEADER */}
            <thead>
              <tr
                className="
                  bg-[rgb(var(--color-surface))]
                  text-[rgb(var(--color-text))]
                "
              >
                <th
                  className="
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-sm
                    font-semibold
                  "
                >
                  <span className="evaluation-list__columnLabel"><LayersIcon aria-hidden="true" />Loại kỳ</span>
                </th>

                <th
                  className="
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-sm
                    font-semibold
                  "
                >
                  <span className="evaluation-list__columnLabel"><FileTextIcon aria-hidden="true" />Tên bản đánh giá</span>
                </th>

                <th
                  className="
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-sm
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  <span className="evaluation-list__columnLabel"><CalendarIcon aria-hidden="true" />Ngày nộp</span>
                </th>

                <th
                  className="
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-sm
                    font-semibold
                  "
                >
                  <span className="evaluation-list__columnLabel"><ActivityLogIcon aria-hidden="true" />Trạng thái</span>
                </th>

                <th
                  className="
                    w-[140px]
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-sm
                    font-semibold
                  "
                >
                  <span className="evaluation-list__columnLabel"><MixIcon aria-hidden="true" />Thao tác</span>
                </th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="
                      px-3
                      py-8
                      text-center
                      text-sm
                      text-[rgb(var(--color-muted))]
                    "
                  >
                    <div className="evaluation-list__empty">
                      <FileTextIcon aria-hidden="true" />
                      <strong>{items.length === 0 ? "Chưa có bản đánh giá" : "Không có bản đánh giá phù hợp"}</strong>
                      <p>{items.length === 0 ? "Chọn “Tạo bản đánh giá” để bắt đầu." : "Thử bỏ từ khóa hoặc chọn lại bộ lọc trạng thái."}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`
                      text-sm
                      transition-colors
                      ${
                        index % 2 === 1
                          ? "bg-[rgb(var(--color-border)/0.28)]"
                          : "bg-[rgb(var(--color-surface))]"
                      }
                    `}
                  >
                    {/* LOẠI KỲ */}
                    <td data-label="Loại kỳ"
                      className="
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-3
                        align-middle
                      "
                    >
                      <span className="evaluation-list__period">{item.period}</span>
                    </td>

                    {/* TÊN */}
                    <td data-label="Tên bản đánh giá"
                      className="
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-3
                        align-middle
                      "
                    >
                      <span className="evaluation-list__templateName"><FileTextIcon aria-hidden="true" />{item.templateName}</span>
                    </td>

                    {/* NGÀY */}
                    <td data-label="Ngày nộp"
                      className="
                        whitespace-nowrap
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-3
                        align-middle
                      "
                    >
                      {formatShortDate(item.submitDate)}
                    </td>

                    {/* STATUS */}
                    <td data-label="Trạng thái"
                      className="
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-3
                        align-middle
                      "
                    >
                      <span
                        className="evaluation-list__status"
                        data-status={item.status?.toLowerCase()}
                        data-tone={statusTone(item.status)}
                      >
                        {hrStatusLabel(item.status, " và ")}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td data-label="Thao tác"
                      className="
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-2
                        align-middle
                      "
                    >
                      <div className="evaluation-list__rowActions">
                        {/* VIEW */}
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/evaluationDetail/${item.id}`
                            )
                          }
                          className="evaluation-list__viewButton"
                        >
                          <EyeIcon />
                          Xem
                        </button>

                        {/* EDIT */}
                        {isValidEvaluationStatus(item.status) && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/kpievaluation/${item.evalPeriodTemplateId}`
                              )
                            }
                            className="evaluation-list__editButton"
                          >
                            <EditIcon />
                            Cập nhật
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        itemLabel="bản đánh giá"
        page={page}
        pageSize={pageSize}
        total={totalCount}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}

/* =========================================================
   DATE
========================================================= */

function formatShortDate(value?: string | null) {
  if (!value) return "";

  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value.trim());
  if (!parts) return "";

  const [inputYear, inputMonth, inputDay] = parts.slice(1).map(Number);
  // .NET DateTime.MinValue is an unset submission date.
  if (inputYear <= 1) return "";

  const calendar = new Date(0);
  calendar.setUTCFullYear(inputYear, inputMonth - 1, inputDay);
  if (
    calendar.getUTCFullYear() !== inputYear ||
    calendar.getUTCMonth() !== inputMonth - 1 ||
    calendar.getUTCDate() !== inputDay
  ) return "";

  const date = new Date(value.trim());

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/* =========================================================
   EDIT CONDITION
========================================================= */

function isValidEvaluationStatus(status: string) {
  return (
    status?.toLowerCase() === "drafted" ||
    status?.toLowerCase() === "rejected"
  );
}

/* =========================================================
   ICONS
========================================================= */

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}
