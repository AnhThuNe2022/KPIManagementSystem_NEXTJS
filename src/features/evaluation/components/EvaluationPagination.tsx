"use client";
import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import styles from "../evaluation-common.module.css";

type Props = {
  page: number;
  pageSize: number;
  total: number | null;
  loading: boolean;
  error: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function EvaluationPagination({
  page,
  pageSize,
  total,
  loading,
  error,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  const firstPage = Math.max(1, Math.min(page - 2, pageCount - 4));
  const disabled = loading || total === null || error;
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);

  return (
    <footer className={styles.footer}>
      <p aria-live="polite">
        {loading ? (
          "Đang tải danh sách…"
        ) : error ? (
          "Chưa có dữ liệu"
        ) : total ? (
          <>
            <strong>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
            </strong>{" "}
            / {total} bản đánh giá
          </>
        ) : (
          "0 bản đánh giá"
        )}
      </p>
      <label className={styles.pageSize}>
        Hiển thị
        <select
          aria-label="Số bản đánh giá mỗi trang"
          value={pageSize}
          disabled={loading}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <nav className={styles.pagination} aria-label="Phân trang bản đánh giá">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowLeftIcon aria-hidden="true" />
        </button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            aria-label={`Trang ${number}`}
            aria-current={page === number ? "page" : undefined}
            disabled={disabled}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          aria-label="Trang sau"
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ArrowRightIcon aria-hidden="true" />
        </button>
      </nav>
    </footer>
  );
}
