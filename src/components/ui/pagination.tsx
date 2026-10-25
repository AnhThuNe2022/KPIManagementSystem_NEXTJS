"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import styles from "./pagination.module.css";

type Props = {
  page: number;
  pageSize: number;
  total: number | null;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  itemLabel: string;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function Pagination({
  page,
  pageSize,
  total,
  loading = false,
  error = false,
  disabled = false,
  itemLabel,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: Props) {
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  const firstPage = Math.max(1, Math.min(page - 2, pageCount - 4));
  const mobileFirstPage = Math.max(1, Math.min(page - 1, pageCount - 2));
  const unavailable = disabled || loading || error || total === null || total === 0;
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);

  return (
    <footer className={styles.footer}>
      <p role="status" aria-live="polite">
        {loading ? "Đang tải danh sách…" : error ? "Chưa tải được dữ liệu" : total === null ? "Chưa có dữ liệu" : total ? (
          <><strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</strong> / {total} {itemLabel}</>
        ) : `0 ${itemLabel}`}
      </p>
      <div className={styles.controls}>
        <label className={styles.pageSize}>
          Hiển thị
          <select
            aria-label={`Số ${itemLabel} mỗi trang`}
            value={pageSize}
            disabled={disabled || loading}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <nav className={styles.pages} aria-label={`Phân trang ${itemLabel}`}>
          <button type="button" aria-label="Trang trước" disabled={unavailable || page <= 1} onClick={() => onPageChange(page - 1)}>
            <ArrowLeftIcon aria-hidden="true" />
          </button>
          {pages.map(number => (
            <button key={number} type="button" aria-label={`Trang ${number}`} aria-current={page === number ? "page" : undefined} data-mobile-hidden={number < mobileFirstPage || number > mobileFirstPage + 2} disabled={unavailable} onClick={() => onPageChange(number)}>
              {number}
            </button>
          ))}
          <button type="button" aria-label="Trang sau" disabled={unavailable || page >= pageCount} onClick={() => onPageChange(page + 1)}>
            <ArrowRightIcon aria-hidden="true" />
          </button>
        </nav>
      </div>
    </footer>
  );
}
