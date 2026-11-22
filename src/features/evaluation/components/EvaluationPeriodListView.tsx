"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  ActiveStatus,
  AppButton,
  AppIconButton,
  AppTextInput,
  ConfirmDialog,
  DataTable,
  MetricStrip,
  PageFrame,
  PageHeader,
  PeriodStatusBadge,
  PeriodTypeBadge,
  StatusFilterTabs,
  ViewModeToggle,
  pixel,
  proportional,
  useAppToast,
  type TableColumn,
} from "@/components/ds";
import { ACTIVE_FILTER_OPTIONS, normalizePeriodType, resolvePeriodType } from "@/design-system/registries";
import { formatDate, normalizeVietnamese } from "@/lib/format/formatters";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { evaluationPeriodApi } from "../services/evaluationPeriodApi";
import type { EvaluationPeriodDto } from "../types";
import { EvaluationPeriodEditorDialog } from "./EvaluationPeriodEditorDialog";

type PeriodRow = EvaluationPeriodDto & Record<string, unknown>;

function countTemplates(item: EvaluationPeriodDto): number {
  if (Array.isArray(item.templatePeriodDtos) && item.templatePeriodDtos.length > 0) {
    return item.templatePeriodDtos.length;
  }
  if (Array.isArray(item.listTemplateId) && item.listTemplateId.length > 0) {
    return item.listTemplateId.length;
  }
  return item.templateId ? 1 : 0;
}

function formatTimeSlot(item: EvaluationPeriodDto): string {
  const parts: string[] = [];
  if (item.month) parts.push(`T${item.month}`);
  if (item.quarter) parts.push(`Q${item.quarter}`);
  if (item.year) parts.push(String(item.year));
  return parts.join(" / ") || "—";
}

export function EvaluationPeriodListView() {
  const toast = useAppToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    items: EvaluationPeriodDto[];
    total: number;
  } | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortDescName, setSortDescName] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<EvaluationPeriodDto | null>(null);
  const [deletingPeriod, setDeletingPeriod] = useState<EvaluationPeriodDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("evaluation-period-view");
      if (saved === "grid" || saved === "table") setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const handleViewChange = (next: "table" | "grid") => {
    setViewMode(next);
    try {
      window.localStorage.setItem("evaluation-period-view", next);
    } catch {
      // ignore
    }
  };

  const requestKey = `${page}:${pageSize}:${revision}`;

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    evaluationPeriodApi
      .getPage({ page, pageSize, signal: ctrl.signal })
      .then((res) => {
        if (ctrl.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(res.total / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setSnapshot({ key: requestKey, items: res.items, total: res.total });
      })
      .catch((cause) => {
        if (isAbortError(cause)) return;
        setUnauthorized(cause instanceof ApiRequestError && cause.status === 401);
        setError(getErrorMessage(cause, "Không tải được danh sách kỳ đánh giá."));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [page, pageSize, requestKey]);

  const pageItems = useMemo(
    () => (snapshot?.key === requestKey ? snapshot.items : []),
    [requestKey, snapshot],
  );
  const totalItems = snapshot?.key === requestKey ? snapshot.total : 0;

  const activeCountOnPage = useMemo(
    () => pageItems.filter((p) => Boolean(p.isActive)).length,
    [pageItems],
  );
  const activePercent =
    pageItems.length > 0 ? Math.round((activeCountOnPage / pageItems.length) * 100) : 0;

  const filteredItems = useMemo<PeriodRow[]>(() => {
    const needle = normalizeVietnamese(search);
    const list = pageItems.filter((item) => {
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "inactive" && item.isActive) return false;
      if (typeFilter && normalizePeriodType(item.periodType) !== typeFilter) return false;
      if (needle) {
        const typeLabel = resolvePeriodType(item.periodType).label;
        const haystack = [item.name, String(item.id), `#${item.id}`, String(item.year ?? ""), typeLabel]
          .map(normalizeVietnamese)
          .join(" ");
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    if (sortDescName) {
      return [...list].sort((a, b) => (b.name ?? "").localeCompare(a.name ?? "", "vi")) as PeriodRow[];
    }
    return list as PeriodRow[];
  }, [pageItems, search, sortDescName, statusFilter, typeFilter]);

  const handleConfirmDelete = async () => {
    if (!deletingPeriod) return;
    setDeleting(true);
    try {
      await evaluationPeriodApi.remove(deletingPeriod.id);
      toast("success", `Đã xóa kỳ đánh giá "${deletingPeriod.name}".`);
      setDeletingPeriod(null);
      setRevision((v) => v + 1);
    } catch (cause) {
      toast("error", getErrorMessage(cause, "Không thể xóa kỳ đánh giá."));
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<PeriodRow>[] = [
    {
      key: "id",
      header: "Mã kỳ",
      width: pixel(104),
      renderCell: (row) => (
        <span className="font-mono text-xs font-semibold text-secondary">#{row.id}</span>
      ),
    },
    {
      key: "name",
      header: "Tên kỳ đánh giá",
      width: proportional(2, { minWidth: 200 }),
      renderCell: (row) => (
        <button
          type="button"
          onClick={() => {
            setEditingPeriod(row);
            setEditorOpen(true);
          }}
          className="text-left text-sm font-semibold text-accent ds-interactive hover:underline"
        >
          {row.name}
        </button>
      ),
    },
    {
      key: "periodType",
      header: "Loại kỳ",
      width: pixel(132),
      renderCell: (row) => <PeriodTypeBadge periodType={row.periodType} />,
    },
    {
      key: "timeSlot",
      header: "Thời gian",
      width: pixel(128),
      renderCell: (row) => <span className="text-sm text-primary">{formatTimeSlot(row)}</span>,
    },
    {
      key: "templates",
      header: "Biểu mẫu",
      width: pixel(124),
      renderCell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {countTemplates(row)} mẫu
        </span>
      ),
    },
    {
      key: "schedule",
      header: "Thời hạn áp dụng",
      width: proportional(1.4, { minWidth: 190 }),
      renderCell: (row) => (
        <span className="text-xs text-secondary">
          {formatDate(row.startDate)} → {formatDate(row.endDate)}
        </span>
      ),
    },
    {
      key: "statusPeriod",
      header: "Trạng thái mở",
      width: pixel(150),
      renderCell: (row) => <PeriodStatusBadge status={row.statusPeriod} />,
    },
    {
      key: "isActive",
      header: "Kích hoạt",
      width: pixel(145),
      renderCell: (row) => <ActiveStatus isActive={row.isActive} compact />,
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "end",
      width: pixel(120),
      renderCell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <AppIconButton
            label="Chỉnh sửa kỳ"
            tooltip="Chỉnh sửa"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => {
              setEditingPeriod(row);
              setEditorOpen(true);
            }}
          />
          <AppIconButton
            label="Xóa kỳ đánh giá"
            tooltip="Xóa"
            icon={<Trash2 className="h-4 w-4 text-error" />}
            onClick={() => setDeletingPeriod(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <PageFrame>
      <PageHeader
        artwork="organization"
        icon={<Calendar className="h-5 w-5" />}
        eyebrow="Quản trị kỳ KPI"
        title="Kỳ đánh giá KPI"
        description="Thiết lập chu kỳ đánh giá (Tháng, Quý, 6 tháng, Năm), thời hạn và danh sách biểu mẫu áp dụng."
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setRevision((v) => v + 1)}
            />
            <AppButton
              label="Thêm kỳ đánh giá"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingPeriod(null);
                setEditorOpen(true);
              }}
            />
          </>
        }
      />

      <MetricStrip
        items={[
          {
            id: "total",
            label: "Tổng số kỳ đánh giá",
            value: totalItems,
            hint: `Trang ${page} / ${Math.max(1, Math.ceil(totalItems / pageSize))}`,
            icon: <Calendar className="h-5 w-5" />,
            tone: "blue",
          },
          {
            id: "active",
            label: "Đang hoạt động (trang này)",
            value: `${activeCountOnPage} (${activePercent}%)`,
            hint: `${pageItems.length - activeCountOnPage} kỳ tạm ngưng`,
            icon: <CheckCircle2 className="h-5 w-5" />,
            tone: "green",
          },
          {
            id: "month",
            label: "Kỳ theo tháng (trang này)",
            value: pageItems.filter((p) => normalizePeriodType(p.periodType) === "Month").length,
            hint: "Nhấn chip lọc bên dưới để lọc nhanh",
            icon: <Calendar className="h-5 w-5" />,
            tone: "orange",
          },
          {
            id: "templates",
            label: "Tổng lượt gán biểu mẫu",
            value: pageItems.reduce((sum, p) => sum + countTemplates(p), 0),
            hint: "Trên trang hiện tại",
            icon: <FileSpreadsheet className="h-5 w-5" />,
            tone: "neutral",
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <StatusFilterTabs
            label="Trạng thái kích hoạt"
            value={statusFilter}
            onChange={setStatusFilter}
            items={ACTIVE_FILTER_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
              count:
                opt.value === "all"
                  ? pageItems.length
                  : opt.value === "active"
                    ? activeCountOnPage
                    : pageItems.length - activeCountOnPage,
            }))}
          />
          <StatusFilterTabs
            label="Loại kỳ"
            value={typeFilter}
            onChange={setTypeFilter}
            items={[
              { value: "", label: "Mọi loại" },
              { value: "Month", label: "Tháng" },
              { value: "Quarter", label: "Quý" },
              { value: "HaftYear", label: "6 tháng" },
              { value: "Year", label: "Năm" },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-60">
            <AppTextInput
              label="Tìm kỳ đánh giá"
              isLabelHidden
              type="search"
              startIcon="search"
              size="sm"
              placeholder="Tìm tên, #mã, năm..."
              value={search}
              onChange={setSearch}
              hasClear
            />
          </div>
          <AppButton
            label={sortDescName ? "Tên: Z → A" : "Mặc định"}
            variant="secondary"
            size="sm"
            icon={<ArrowUpDown className="h-3.5 w-3.5" />}
            onClick={() => setSortDescName((v) => !v)}
          />
          <ViewModeToggle value={viewMode} onChange={handleViewChange} gridLabel="Lưới" />
        </div>
      </div>

      <DataTable
        data={filteredItems}
        columns={columns}
        idKey={(row) => String(row.id)}
        isLoading={loading}
        error={error}
        isUnauthorized={unauthorized}
        loginNextPath="/manager/kpi-evaluation-periods"
        onRetry={() => setRevision((v) => v + 1)}
        emptyTitle="Chưa có kỳ đánh giá phù hợp"
        emptyDescription="Thử bỏ bộ lọc hoặc tạo kỳ đánh giá mới."
        viewMode={viewMode}
        renderCard={(row) => (
          <Card padding={4} elevation="low">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-secondary">#{row.id}</span>
                  <PeriodTypeBadge periodType={row.periodType} />
                </div>
                <ActiveStatus isActive={row.isActive} compact />
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPeriod(row);
                  setEditorOpen(true);
                }}
                className="text-left text-base font-semibold text-primary ds-interactive hover:text-accent"
              >
                {row.name}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-secondary">
                <span>Thời gian: {formatTimeSlot(row)}</span>
                <span>{countTemplates(row)} biểu mẫu</span>
              </div>
              <Text type="supporting">
                {formatDate(row.startDate)} → {formatDate(row.endDate)}
              </Text>
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <PeriodStatusBadge status={row.statusPeriod} />
                <div className="flex items-center gap-1">
                  <AppButton
                    label="Sửa"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingPeriod(row);
                      setEditorOpen(true);
                    }}
                  />
                  <AppIconButton
                    label="Xóa kỳ"
                    icon={<Trash2 className="h-4 w-4 text-error" />}
                    onClick={() => setDeletingPeriod(row)}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}
        pagination={{
          page,
          pageSize,
          totalItems,
          pageSizeOptions: [10, 20, 50],
          onPageChange: setPage,
          onPageSizeChange: (nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          },
          itemLabel: "kỳ đánh giá",
        }}
      />

      <EvaluationPeriodEditorDialog
        isOpen={editorOpen}
        editingId={editingPeriod?.id ?? null}
        fallbackPeriod={editingPeriod}
        onOpenChange={setEditorOpen}
        onSaved={() => setRevision((v) => v + 1)}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingPeriod)}
        onOpenChange={(open) => {
          if (!open) setDeletingPeriod(null);
        }}
        title="Xóa kỳ đánh giá?"
        description={
          deletingPeriod ? (
            <>
              Bạn đang xóa{" "}
              <strong className="font-semibold text-primary">{deletingPeriod.name}</strong>. Thao
              tác này không thể hoàn tác.
            </>
          ) : (
            ""
          )
        }
        cancelLabel="Giữ lại"
        confirmLabel="Xóa kỳ đánh giá"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </PageFrame>
  );
}
