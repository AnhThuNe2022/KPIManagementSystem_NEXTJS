"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Calendar,
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  AppButton,
  AppMultiSelect,
  AppSelect,
  CompanyChip,
  DataTable,
  ExportProgressBar,
  FilterBar,
  InlineErrorBanner,
  MetricStrip,
  PageFrame,
  PageHeader,
  PeriodBadgeCell,
  TagBadge,
  pixel,
  proportional,
  useAppToast,
  type ActiveFilterChip,
  type SelectOption,
  type TableColumn,
} from "@/components/ds";
import { SUMMARY_JOB_POSITION_OPTIONS } from "@/design-system/registries";
import { companyApi } from "@/features/company/services/companyApi";
import { evaluationLookupApi } from "@/features/evaluation/services/evaluationLookupApi";
import type { EvaluationTypeOption, LookupOption } from "@/features/evaluation/types";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { summaryApi } from "../services/summaryApi";
import type { SummaryFilters, SummaryMode, SummaryRow } from "../types";

const EMPTY_FILTERS: SummaryFilters = {
  companyIds: [],
  typeId: "",
  periodId: "",
  jobPositionId: "",
};

export function SummaryListView({ mode }: { mode: SummaryMode }) {
  const showToast = useAppToast();
  const isHrSummary = mode === "HrSummary";
  const routePath = `/summary/summary-list/${mode}`;

  const [filters, setFilters] = useState<SummaryFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reloadTick, setReloadTick] = useState(0);

  const [companies, setCompanies] = useState<LookupOption[]>([]);
  const [types, setTypes] = useState<EvaluationTypeOption[]>([]);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [items, setItems] = useState<SummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [exportState, setExportState] = useState<{ active: boolean; progress: number; label: string }>({
    active: false,
    progress: 0,
    label: "",
  });
  const exportCtrlRef = useRef<AbortController | null>(null);
  const fetchCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLookupLoading(true);
    setLookupError(null);
    Promise.allSettled([
      isHrSummary ? companyApi.getForHrCompile(ctrl.signal) : companyApi.getAll(ctrl.signal),
      evaluationLookupApi.getTypes(ctrl.signal),
    ]).then(([companyRes, typeRes]) => {
      if (ctrl.signal.aborted) return;
      setCompanies(
        companyRes.status === "fulfilled"
          ? companyRes.value.map((c) => ({ id: String(c.id), name: c.companyName }))
          : [],
      );
      setTypes(typeRes.status === "fulfilled" ? typeRes.value : []);
      const failed = [companyRes, typeRes].find((r) => r.status === "rejected");
      if (failed?.status === "rejected" && !isAbortError(failed.reason)) {
        setLookupError(getErrorMessage(failed.reason, "Chưa tải đủ dữ liệu bộ lọc."));
      }
      setLookupLoading(false);
    });
    return () => ctrl.abort();
  }, [isHrSummary, reloadTick]);

  const loadList = useCallback(async () => {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await summaryApi.list(mode, page, pageSize, filters, ctrl.signal);
      if (ctrl.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(res.total / pageSize));
      if (page > lastPage && res.total > 0) {
        setPage(lastPage);
        return;
      }
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Chưa tải được danh sách tổng hợp."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [filters, mode, page, pageSize]);

  useEffect(() => {
    void loadList();
    return () => fetchCtrlRef.current?.abort();
  }, [loadList, reloadTick]);

  useEffect(() => () => exportCtrlRef.current?.abort(), []);

  const periodOptions = useMemo<SelectOption[]>(() => {
    const matched = types.find((t) => t.id === filters.typeId);
    return (matched?.periods ?? []).map((p) => ({ value: p.id, label: p.name }));
  }, [filters.typeId, types]);

  const pageTotalEval = useMemo(
    () => items.reduce((sum, row) => sum + (row.totalEval ?? 0), 0),
    [items],
  );
  const maxTotal = useMemo(
    () => Math.max(1, ...items.map((row) => row.totalEval ?? 0)),
    [items],
  );
  const uniqueCompanies = useMemo(
    () => new Set(items.map((row) => row.companyName)).size,
    [items],
  );
  const latestPeriod = items[0]?.period ?? "—";

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleExportExcel = async () => {
    if (!total || exportState.active) return;
    const ctrl = new AbortController();
    exportCtrlRef.current = ctrl;
    setExportState({
      active: true,
      progress: 20,
      label: "Đang tải toàn bộ nhóm tổng hợp...",
    });

    try {
      const groups =
        items.length === total
          ? { items, total }
          : await summaryApi.list(mode, 1, total, filters, ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (!groups.items.length || groups.items.length !== groups.total) {
        throw new Error("Chưa lấy đủ nhóm tổng hợp. Vui lòng làm mới và xuất lại.");
      }
      const totalEvalCount = groups.items.reduce((sum, row) => sum + row.totalEval, 0);
      if (!totalEvalCount) {
        showToast("info", "Không có bản đánh giá chi tiết để xuất.");
        setExportState({ active: false, progress: 0, label: "" });
        return;
      }

      setExportState({
        active: true,
        progress: 55,
        label: `Đang tổng hợp ${totalEvalCount} hồ sơ chi tiết...`,
      });
      const details = await summaryApi.collectAllDetailsForExport(
        mode,
        groups.items.map((r) => r.periodId),
        filters.companyIds,
        totalEvalCount,
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      if (!details.total) {
        showToast("info", "Không có bản đánh giá chi tiết để xuất.");
        setExportState({ active: false, progress: 0, label: "" });
        return;
      }

      setExportState({
        active: true,
        progress: 85,
        label: `Đang tạo tệp Excel tổng hợp (${details.items.length} hồ sơ)...`,
      });
      const filename = await summaryApi.exportSummaryExcel(details.items, ctrl.signal);
      setExportState({ active: true, progress: 100, label: `Đã tải xuống ${filename}` });
      showToast("success", `Đã xuất Excel tổng hợp (${details.items.length} bản đánh giá).`);
      window.setTimeout(() => setExportState({ active: false, progress: 0, label: "" }), 1400);
    } catch (err) {
      if (isAbortError(err)) {
        showToast("info", "Đã hủy xuất Excel tổng hợp.");
      } else {
        showToast("error", getErrorMessage(err, "Chưa xuất được Excel tổng hợp."));
      }
      setExportState({ active: false, progress: 0, label: "" });
    } finally {
      exportCtrlRef.current = null;
    }
  };

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.companyIds.length > 0) {
      chips.push({
        key: "companies",
        label: `Công ty (${filters.companyIds.length})`,
        onRemove: () => {
          setFilters((p) => ({ ...p, companyIds: [] }));
          setPage(1);
        },
      });
    }
    if (filters.typeId) {
      const name = types.find((t) => t.id === filters.typeId)?.name ?? filters.typeId;
      chips.push({
        key: "typeId",
        label: `Loại: ${name}`,
        onRemove: () => {
          setFilters((p) => ({ ...p, typeId: "", periodId: "" }));
          setPage(1);
        },
      });
    }
    if (filters.periodId) {
      const name = periodOptions.find((p) => p.value === filters.periodId)?.label ?? filters.periodId;
      chips.push({
        key: "periodId",
        label: `Kỳ: ${name}`,
        onRemove: () => {
          setFilters((p) => ({ ...p, periodId: "" }));
          setPage(1);
        },
      });
    }
    if (filters.jobPositionId) {
      const name =
        SUMMARY_JOB_POSITION_OPTIONS.find((o) => o.value === filters.jobPositionId)?.label ??
        filters.jobPositionId;
      chips.push({
        key: "jobPositionId",
        label: `Vị trí: ${name}`,
        onRemove: () => {
          setFilters((p) => ({ ...p, jobPositionId: "" }));
          setPage(1);
        },
      });
    }
    return chips;
  }, [filters, periodOptions, types]);

  const columns = useMemo<TableColumn<SummaryRow>[]>(
    () => [
      {
        key: "period",
        header: "Kỳ đánh giá",
        width: proportional(1.5, { minWidth: 185 }),
        renderCell: (row) => (
          <div className="flex flex-wrap items-center gap-2">
            <PeriodBadgeCell label={row.period} />
            {row.period === latestPeriod ? <TagBadge tone="blue" label="Mới nhất" /> : null}
          </div>
        ),
      },
      {
        key: "template",
        header: "Biểu mẫu",
        width: proportional(1.6),
        renderCell: (row) => (
          <span className="text-sm text-primary">
            {row.periodName && row.periodName !== row.period
              ? row.periodName
              : `Đánh giá định kỳ · ${row.period}`}
          </span>
        ),
      },
      {
        key: "jobPosition",
        header: "Nhóm chức danh",
        width: proportional(1.2),
        renderCell: (row) => <TagBadge tone="neutral" label={row.jobPosition || "—"} />,
      },
      {
        key: "company",
        header: "Công ty",
        width: proportional(1.5),
        renderCell: (row) => (
          <CompanyChip companyCode={row.companyName} companyName={row.companyName} />
        ),
      },
      {
        key: "totalEval",
        header: "Tổng hồ sơ",
        width: pixel(190),
        align: "end",
        renderCell: (row) => {
          const share = pageTotalEval > 0 ? Math.round((row.totalEval / pageTotalEval) * 100) : 0;
          const barPct = Math.round((row.totalEval / maxTotal) * 100);
          return (
            <div className="flex items-center justify-end gap-2.5 tabular-nums">
              <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                <div className="h-full rounded-full bg-accent-bg" style={{ width: `${barPct}%` }} />
              </div>
              <span className="font-semibold text-primary">
                {row.totalEval.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs text-secondary">({share}%)</span>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Thao tác",
        width: pixel(148),
        align: "end",
        renderCell: (row) => (
          <AppButton
            label="Chi tiết"
            variant="secondary"
            size="sm"
            icon={<Eye className="h-3.5 w-3.5" />}
            href={`/summary/summary-list-detail/${mode}/${row.periodId}/${row.companyId}`}
          />
        ),
      },
    ],
    [latestPeriod, maxTotal, mode, pageTotalEval],
  );

  return (
    <PageFrame>
      <PageHeader
        artwork="summary"
        icon={<FileSpreadsheet className="h-5 w-5" />}
        eyebrow={isHrSummary ? "Nhân sự tổng hợp" : "Ban lãnh đạo"}
        title={isHrSummary ? "Tổng hợp đánh giá (HR)" : "Tổng hợp đánh giá (Cấp cao)"}
        description="Tổng hợp bản đánh giá KPI theo kỳ, biểu mẫu, nhóm chức danh và công ty thành viên."
        actions={
          <>
            <AppButton
              label="Excel tổng hợp"
              variant="primary"
              icon={<Download className="h-4 w-4" />}
              isLoading={exportState.active}
              isDisabled={isLoading || Boolean(error) || total === 0 || exportState.active}
              onClick={handleExportExcel}
            />
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setReloadTick((t) => t + 1)}
            />
          </>
        }
      />

      {exportState.active ? (
        <ExportProgressBar
          label={exportState.label}
          value={exportState.progress}
          onCancel={() => exportCtrlRef.current?.abort()}
        />
      ) : null}

      {lookupError ? <InlineErrorBanner message={lookupError} /> : null}

      <MetricStrip
        items={[
          {
            id: "groups",
            label: "Nhóm tổng hợp",
            value: total.toLocaleString("vi-VN"),
            tone: "blue",
            icon: <Layers className="h-5 w-5" />,
          },
          {
            id: "evals",
            label: "Hồ sơ trên trang",
            value: pageTotalEval.toLocaleString("vi-VN"),
            tone: "red",
            icon: <FileSpreadsheet className="h-5 w-5" />,
          },
          {
            id: "companies",
            label: "Đơn vị tham gia",
            value: `${uniqueCompanies} công ty`,
            tone: "green",
            icon: <Building2 className="h-5 w-5" />,
          },
          {
            id: "period",
            label: "Kỳ mới nhất",
            value: latestPeriod,
            tone: "orange",
            icon: <Calendar className="h-5 w-5" />,
          },
        ]}
      />

      <FilterBar
        primaryControls={
          <>
            <div className="min-w-[220px] flex-1">
              <AppMultiSelect
                label="Công ty"
                value={filters.companyIds}
                onChange={(companyIds) => {
                  setFilters((p) => ({ ...p, companyIds }));
                  setPage(1);
                }}
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={isHrSummary ? "Các công ty thuộc phạm vi HR" : "Tất cả công ty"}
                isLoading={lookupLoading}
              />
            </div>
            <div className="w-full sm:w-[210px]">
              <AppSelect
                label="Loại đánh giá"
                value={filters.typeId}
                onChange={(typeId) => {
                  setFilters((p) => ({ ...p, typeId, periodId: "" }));
                  setPage(1);
                }}
                options={types.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Tất cả loại"
                isDisabled={lookupLoading}
              />
            </div>
            <div className="w-full sm:w-[210px]">
              <AppSelect
                label="Kỳ đánh giá"
                value={filters.periodId}
                onChange={(periodId) => {
                  setFilters((p) => ({ ...p, periodId }));
                  setPage(1);
                }}
                options={periodOptions}
                placeholder={filters.typeId ? "Tất cả kỳ" : "Chọn loại đánh giá trước"}
                isDisabled={lookupLoading || !filters.typeId}
              />
            </div>
            <div className="w-full sm:w-[190px]">
              <AppSelect
                label="Vị trí công việc"
                value={filters.jobPositionId}
                onChange={(jobPositionId) => {
                  setFilters((p) => ({ ...p, jobPositionId }));
                  setPage(1);
                }}
                options={[...SUMMARY_JOB_POSITION_OPTIONS]}
                placeholder="Tất cả vị trí"
                hasSearch={false}
              />
            </div>
          </>
        }
        chips={activeChips}
        onReset={activeChips.length > 0 ? handleReset : undefined}
      />

      <DataTable
        data={items}
        columns={columns}
        idKey={(row) => `${row.periodId}-${row.companyId}-${row.jobPosition}`}
        isLoading={isLoading}
        error={error}
        isUnauthorized={isUnauthorized}
        loginNextPath={routePath}
        onRetry={() => setReloadTick((t) => t + 1)}
        emptyTitle="Chưa có kết quả tổng hợp"
        emptyDescription="Thử thay đổi bộ lọc công ty, kỳ đánh giá hoặc vị trí công việc."
        pagination={{
          page,
          pageSize,
          totalItems: total,
          onPageChange: setPage,
          onPageSizeChange: (nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          },
          itemLabel: "nhóm tổng hợp",
        }}
      />
    </PageFrame>
  );
}
