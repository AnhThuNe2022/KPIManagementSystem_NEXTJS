"use client";

import React, { type ReactNode } from "react";
import { Pagination } from "@astryxdesign/core/Pagination";
import {
  Table,
  pixel,
  proportional,
  useTableSelection,
  useTableSelectionState,
  type TableColumn as AstryxTableColumn,
  type TableDensity,
} from "@astryxdesign/core/Table";
import { X } from "lucide-react";
import { resolveTableHeaderIcon } from "@/design-system/registries";
import { AppEmptyState, InlineErrorBanner, TableSkeleton } from "./Feedback";

export { pixel, proportional };

export type TableColumn<T extends object> = Omit<
  AstryxTableColumn<Record<string, unknown>>,
  "renderCell"
> & {
  renderCell?: (item: T, index: number) => ReactNode;
  /** Optional custom icon for the column header; pass `false` to hide the automatic icon. */
  headerIcon?: ReactNode | false;
};

export interface DataTablePaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
}

export interface DataTableSelectionConfig<T extends object> {
  selectedKeys: Set<string>;
  onSelectedKeysChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  getIsItemSelectable?: (item: T) => boolean;
  getIsItemEnabled?: (item: T) => boolean;
  actions: ReactNode;
  selectionLabel?: (count: number) => ReactNode;
}

/**
 * SINGLE SOURCE OF TRUTH DataTable wrapping Astryx Table, Pagination, Selection Toolbar,
 * Skeleton loading, Error banner, Empty state, and optional Card Grid view.
 */
export function DataTable<T extends object>({
  data,
  columns,
  idKey,
  density = "balanced",
  isLoading = false,
  error,
  isUnauthorized = false,
  loginNextPath,
  onRetry,
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription = "Thử điều chỉnh bộ lọc hoặc thêm bản ghi mới.",
  emptyActions,
  pagination,
  selection,
  viewMode = "table",
  renderCard,
  headerSlot,
}: {
  data: T[];
  columns: TableColumn<T>[];
  idKey: (keyof T & string) | ((item: T) => string);
  density?: TableDensity;
  isLoading?: boolean;
  error?: string | null;
  isUnauthorized?: boolean;
  loginNextPath?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActions?: ReactNode;
  pagination?: DataTablePaginationConfig;
  selection?: DataTableSelectionConfig<T>;
  viewMode?: "table" | "grid";
  renderCard?: (item: T, index: number) => ReactNode;
  headerSlot?: ReactNode;
}) {
  const [fallbackKeys, setFallbackKeys] = React.useState<Set<string>>(() => new Set());
  const selectionEnabled = Boolean(selection);
  const tableData = data as unknown as Record<string, unknown>[];
  const tableColumns = React.useMemo<AstryxTableColumn<Record<string, unknown>>[]>(
    () =>
      columns.map((col) => {
        const { headerIcon, header, ...rest } = col;
        if (headerIcon === false || !header) {
          return { ...rest, header } as unknown as AstryxTableColumn<Record<string, unknown>>;
        }
        const IconComp =
          headerIcon === undefined
            ? resolveTableHeaderIcon(col.key, typeof header === "string" ? header : undefined)
            : null;
        const iconNode =
          headerIcon !== undefined
            ? headerIcon
            : IconComp
              ? <IconComp className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              : null;

        const alignClass =
          col.align === "end"
            ? "justify-end"
            : col.align === "center"
              ? "justify-center"
              : "justify-start";

        return {
          ...rest,
          header: (
            <span className={`inline-flex max-w-full items-center gap-1.5 ${alignClass}`}>
              {iconNode}
              <span className="truncate">{header}</span>
            </span>
          ),
        } as unknown as AstryxTableColumn<Record<string, unknown>>;
      }),
    [columns],
  );
  const tableIdKey = idKey as string | ((item: Record<string, unknown>) => string);

  const { selectionConfig, selectionState } = useTableSelectionState<Record<string, unknown>>({
    data: tableData,
    idKey: tableIdKey,
    selectedKeys: selection?.selectedKeys ?? fallbackKeys,
    setSelectedKeys: selection?.onSelectedKeysChange ?? setFallbackKeys,
    getIsItemSelectable: selection?.getIsItemSelectable as
      | ((item: Record<string, unknown>) => boolean)
      | undefined,
    getIsItemEnabled: selection?.getIsItemEnabled as
      | ((item: Record<string, unknown>) => boolean)
      | undefined,
  });

  const selectionPlugin = useTableSelection<Record<string, unknown>>(selectionConfig);
  const plugins = selectionEnabled ? { selection: selectionPlugin } : undefined;

  const rowIndexStart = pagination
    ? (pagination.page - 1) * pagination.pageSize + 1
    : 1;

  const selectedCount = selection?.selectedKeys.size ?? selectionState.selectedCount;

  return (
    <div className="flex flex-col gap-3">
      {headerSlot}

      <div className="ds-table-shell overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {error ? (
          <div className="p-4">
            <InlineErrorBanner
              message={error}
              onRetry={onRetry}
              isUnauthorized={isUnauthorized}
              loginNextPath={loginNextPath}
            />
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={Math.min(pagination?.pageSize ?? 6, 8)} columns={Math.min(columns.length, 6)} />
        ) : data.length === 0 ? (
          <AppEmptyState title={emptyTitle} description={emptyDescription} actions={emptyActions} />
        ) : viewMode === "grid" && renderCard ? (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 ds-fade-in">
            {data.map((item, idx) => (
              <React.Fragment key={typeof idKey === "function" ? idKey(item) : String(item[idKey])}>
                {renderCard(item, idx)}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="w-full overflow-x-auto ds-fade-in">
            <Table
              data={tableData}
              columns={tableColumns}
              idKey={tableIdKey}
              density={density}
              dividers="rows"
              hasHover
              verticalAlign="middle"
              rowIndexStart={rowIndexStart}
              rowCount={pagination?.totalItems ?? data.length}
              plugins={plugins}
            />
          </div>
        )}
      </div>

      {pagination && pagination.totalItems > 0 ? (
        <AppPagination {...pagination} />
      ) : null}

      {selectionEnabled && selectedCount > 0 ? (
        <div
          className="ds-selection-dock"
          role="region"
          aria-label="Thao tác hàng loạt mục đã chọn"
        >
          <div className="ds-selection-pill">
            <div className="inline-flex shrink-0 items-center gap-2" role="status" aria-live="polite">
              <span className="ds-selection-badge">
                {selectedCount.toLocaleString("vi-VN")}
              </span>
              <span className="hidden whitespace-nowrap text-xs font-semibold text-primary sm:inline">
                {selection?.selectionLabel ? selection.selectionLabel(selectedCount) : "hồ sơ đã chọn"}
              </span>
            </div>

            <span className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden="true" />

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {selection?.actions}
            </div>

            <button
              type="button"
              className="ds-selection-clearBtn"
              aria-label="Bỏ chọn tất cả"
              title="Bỏ chọn tất cả"
              onClick={() => selection?.onSelectedKeysChange(new Set())}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AppPagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = "bản ghi",
}: DataTablePaginationConfig) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
      <span className="text-secondary">
        Hiển thị <strong className="font-semibold text-primary">{start}–{end}</strong> /{" "}
        <strong className="font-semibold text-primary">{totalItems}</strong> {itemLabel}
      </span>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        pageSizeOptions={onPageSizeChange ? pageSizeOptions : undefined}
        onChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        variant="pages"
        size="sm"
        label="Phân trang danh sách"
      />
    </div>
  );
}
