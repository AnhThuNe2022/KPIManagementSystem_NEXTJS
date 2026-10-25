"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ActivityLogIcon, CalendarIcon, FileTextIcon, LayersIcon, MixIcon, PlusIcon } from "@radix-ui/react-icons";
import { Pagination } from "@/components/ui/pagination";
import styles from "../evaluation-list.module.css";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { evaluationApi } from "@/features/evaluation/services/evaluationApi";
import type { EvaluationDto } from "@/types/evaluation";

export default function EvaluationList() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EvaluationDto[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const result = await evaluationApi.getPaged({
        page,
        pageSize,
        filters: {
          getMy: "123",
          // sortOrder: "desc",
        },
      });

      if (!result.success) {
        toast.error(result.message || "Không thể tải danh sách.");
        return;
      }

      setItems(result.data?.items ?? []);
      setTotalCount(result.data?.total ?? 0);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định.";

      toast.error(`Lỗi tải danh sách: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createNew = () => {
    router.push("/kpievaluation");
  };

  if (loading) {
    return (
      <div className={styles.page} role="status" aria-label="Đang tải bản đánh giá" aria-busy="true">
        <div className={styles.loadingHeader} />
        <div className={styles.loadingTable}>
          <div /><div /><div />
        </div>
        <span className="sr-only">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>Đánh giá KPI</span>
          {/* TITLE */}
          <h1
            className={styles.title}
          >
            Danh sách bản đánh giá
          </h1>
          <p className={styles.description}>Theo dõi và cập nhật các bản đánh giá KPI của bạn.</p>

          {/* CREATE BUTTON */}
          <div className={styles.createAction}>
            <button
              type="button"
              onClick={createNew}
              title="Tạo mới"
              className={styles.createButton}
            >
              <PlusIcon aria-hidden="true" />
              Tạo bản đánh giá
            </button>
          </div>
        </div>
        <div className={styles.illustration} aria-hidden="true">
          <Image src="/images/evaluation-mole.webp" alt="" width={640} height={533} sizes="(max-width: 520px) 112px, (max-width: 1024px) 152px, 176px" />
        </div>
      </header>

      {/* TABLE */}
      <div
        className={styles.list}
      >
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Danh sách bản đánh giá">
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
                    text-[13px]
                    font-semibold
                  "
                >
                  <span className={styles.columnLabel}><LayersIcon aria-hidden="true" />Loại kỳ</span>
                </th>

                <th
                  className="
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-[13px]
                    font-semibold
                  "
                >
                  <span className={styles.columnLabel}><FileTextIcon aria-hidden="true" />Tên bản đánh giá</span>
                </th>

                <th
                  className="
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-[13px]
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  <span className={styles.columnLabel}><CalendarIcon aria-hidden="true" />Ngày nộp</span>
                </th>

                <th
                  className="
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-[13px]
                    font-semibold
                  "
                >
                  <span className={styles.columnLabel}><ActivityLogIcon aria-hidden="true" />Trạng thái</span>
                </th>

                <th
                  className="
                    w-[140px]
                    border-b
                    border-[rgb(var(--color-border))]
                    px-3
                    py-3
                    text-left
                    text-[13px]
                    font-semibold
                  "
                >
                  <span className={styles.columnLabel}><MixIcon aria-hidden="true" />Thao tác</span>
                </th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="
                      px-3
                      py-8
                      text-center
                      text-[13px]
                      text-[rgb(var(--color-muted))]
                    "
                  >
                    <div className={styles.empty}>
                      <FileTextIcon aria-hidden="true" />
                      <strong>Chưa có bản đánh giá</strong>
                      <p>Chọn “Tạo bản đánh giá” để bắt đầu.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`
                      text-[13px]
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
                      <span className={styles.period}>{item.period}</span>
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
                      <span className={styles.templateName}><FileTextIcon aria-hidden="true" />{item.templateName}</span>
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
                      <span className={styles.status} data-status={item.status?.toLowerCase()}>
                        {convertStatusToDisplay(item.status)}
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
                      <div className={styles.rowActions}>
                        {/* VIEW */}
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/evaluationDetail/${item.id}`
                            )
                          }
                          className={styles.viewButton}
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
                            className={styles.editButton}
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
   STATUS
========================================================= */

function convertStatusToDisplay(status: string) {
  switch (status?.toLowerCase()) {
    case "unknown":
      return "Không xác định";

    case "drafted":
      return "Lưu nháp";

    case "submitted":
      return "Đã gửi";

    case "managermidreviewing":
      return "Quản lý đang duyệt";

    case "hrreviewing":
      return "HR đang duyệt";

    case "managerseniorreviewing":
      return "Quản lý cấp cao đang duyệt";

    case "chairmanreviewing":
      return "Chủ tịch đang duyệt";

    case "rejected":
      return "Bị từ chối";

    case "senthr":
      return "QLCC đã duyệt";

    case "compilehrlist":
      return "Đã đánh giá xong";

    case "directorreviewcompilehrlist":
      return "Giám đốc đang duyệt";

    case "directmanagerreviewing":
      return "Quản lý trực tiếp đang duyệt";

    case "compilechiefofstafflist":
      return "Chánh VP đang tổng hợp";

    case "chairmanreviewcompile":
      return "Chủ tịch đang duyệt";

    case "departmentheadreviewing":
      return "Giám đốc ban đang duyệt";

    case "imported":
      return "Đã được import";

    default:
      return "Không xác định";
  }
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
