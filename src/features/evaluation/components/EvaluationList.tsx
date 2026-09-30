"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { evaluationApi } from "@/features/evaluation/services/evaluationApi";
import type { EvaluationDto } from "@/types/evaluation";

export default function EvaluationList() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EvaluationDto[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

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

  const nextPage = () => {
    if (page < totalPages) {
      setPage((current) => current + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage((current) => current - 1);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-[300px] w-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="
                h-7 w-7 animate-spin rounded-full border-4
                border-[rgb(var(--color-border))]
                border-t-[rgb(var(--color-brand))]
              "
            />

            <span className="text-xs text-[rgb(var(--color-muted))]">
              Đang tải dữ liệu...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-[rgb(var(--color-text))]">
      {/* TITLE */}
      <h3
        className="
          mb-2
          text-[24px]
          font-semibold
          uppercase
          leading-tight
        "
      >
        Danh sách bản đánh giá
      </h3>

      {/* CREATE BUTTON */}
      <div className="mb-3 flex justify-start">
        <button
          type="button"
          onClick={createNew}
          title="Tạo mới"
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-full
            bg-[rgb(var(--color-brand))]
            text-[25px]
            font-light
            leading-none
            text-white
            shadow-md
            transition
            hover:bg-[rgb(var(--color-brand-strong))]
          "
        >
          +
        </button>
      </div>

      {/* TABLE */}
      <div
        className="
          w-full
          overflow-hidden
          border
          border-[rgb(var(--color-border))]
          bg-[rgb(var(--color-surface))]
        "
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
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
                  Loại kỳ
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
                  Tên bản đánh giá
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
                  Ngày nộp
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
                  Trạng thái
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
                  Thao tác
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
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`
                      text-[13px]
                      transition-colors
                      hover:bg-[rgb(var(--color-border)/0.25)]
                      ${
                        index % 2 === 1
                          ? "bg-[rgb(var(--color-border)/0.28)]"
                          : "bg-[rgb(var(--color-surface))]"
                      }
                    `}
                  >
                    {/* LOẠI KỲ */}
                    <td
                      className="
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-3
                        align-middle
                      "
                    >
                      {item.period}
                    </td>

                    {/* TÊN */}
                    <td
                      className="
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-3
                        align-middle
                      "
                    >
                      {item.templateName}
                    </td>

                    {/* NGÀY */}
                    <td
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
                    <td
                      className="
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-3
                        align-middle
                      "
                    >
                      {convertStatusToDisplay(item.status)}
                    </td>

                    {/* ACTION */}
                    <td
                      className="
                        border-b
                        border-[rgb(var(--color-border))]
                        px-3
                        py-2
                        align-middle
                      "
                    >
                      <div className="flex w-full flex-col gap-1">
                        {/* VIEW */}
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/evaluationDetail/${item.id}`
                            )
                          }
                          className="
                            flex
                            h-[28px]
                            w-full
                            items-center
                            justify-center
                            gap-1.5
                            rounded-[4px]
                            bg-[#2196f3]
                            px-2
                            text-[12px]
                            font-semibold
                            uppercase
                            text-white
                            transition
                            hover:bg-[#1976d2]
                          "
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
                            className="
                              flex
                              h-[28px]
                              w-full
                              items-center
                              justify-center
                              gap-1.5
                              rounded-[4px]
                              bg-[#ffb000]
                              px-2
                              text-[12px]
                              font-semibold
                              uppercase
                              text-white
                              transition
                              hover:bg-[#e99d00]
                            "
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

      {/* PAGINATION */}
      <div
        className="
          mt-2
          flex
          items-center
          justify-between
        "
      >
        <div
          className="
            text-[13px]
            text-[rgb(var(--color-muted))]
          "
        >
          Trang {page} / {totalPages}
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={prevPage}
            className="
              h-[34px]
              rounded
              border
              border-[rgb(var(--color-border))]
              bg-transparent
              px-2
              text-[13px]
              text-[rgb(var(--color-muted))]
              transition
              hover:bg-[rgb(var(--color-border)/0.3)]
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            ← Trước
          </button>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={nextPage}
            className="
              h-[34px]
              rounded
              border
              border-[rgb(var(--color-border))]
              bg-transparent
              px-2
              text-[13px]
              text-[rgb(var(--color-muted))]
              transition
              hover:bg-[rgb(var(--color-border)/0.3)]
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            Sau →
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DATE
========================================================= */

function formatShortDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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