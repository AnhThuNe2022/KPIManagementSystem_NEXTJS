"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  AppButton,
  AppIconButton,
  AppMultiSelect,
  AppPagination,
  ApproverTimeCell,
  AppSelect,
  AppTabs,
  AppTextInput,
  ApprovalTimeline,
  CompanyChip,
  ConfirmDialog,
  DataTable,
  EvaluationStatusBadge,
  ExportProgressBar,
  FilterBar,
  InlineErrorBanner,
  LoadingOverlay,
  MasterDetailFrame,
  PageFrame,
  PageHeader,
  PeriodBadgeCell,
  RowActionMenu,
  UserIdentityCell,
  pixel,
  proportional,
  useAppToast,
  type ActiveFilterChip,
  type SelectOption,
  type TableColumn,
} from "@/components/ds";
import {
  EVALUATION_STATUS_REGISTRY,
  GENERAL_HR_FILTER_STATUS_KEYS,
} from "@/design-system/registries";
import { companyApi } from "@/features/company/services/companyApi";
import { departmentApi } from "@/features/department/services/departmentApi";
import { formatDateTime } from "@/lib/format/formatters";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import { exportEvaluationsApi } from "../services/exportEvaluations";
import { generalHrEvaluationApi, type ReviewerOption } from "../services/generalHrEvaluationApi";
import type {
  ApprovalHistoryEntry,
  EvaluationApprover,
  EvaluationTypeOption,
  GeneralHrEvaluationDto,
  GeneralHrFilters,
  LookupOption,
} from "../types";
import {
  ChangeEvaluationStatusDialog,
  EvaluationApproversDialog,
  EvaluationHistoryDialog,
} from "./GeneralHrEvaluationDialogs";

const INITIAL_FILTERS: GeneralHrFilters = {
  keyword: "",
  companyId: "",
  departmentId: "",
  reviewerId: "",
  typeId: "",
  periodId: "",
  statuses: [],
  sortOrder: "desc",
};

const SORT_OPTIONS: SelectOption[] = [
  { value: "desc", label: "Mới nhất trước" },
  { value: "asc", label: "Cũ nhất trước" },
];

const STATUS_FILTER_OPTIONS: SelectOption[] = GENERAL_HR_FILTER_STATUS_KEYS.map((key) => ({
  value: key,
  label: EVALUATION_STATUS_REGISTRY[key].label,
}));

function filtersEqual(a: GeneralHrFilters, b: GeneralHrFilters): boolean {
  return (
    a.keyword.trim() === b.keyword.trim() &&
    a.companyId === b.companyId &&
    a.departmentId === b.departmentId &&
    a.reviewerId === b.reviewerId &&
    a.typeId === b.typeId &&
    a.periodId === b.periodId &&
    a.sortOrder === b.sortOrder &&
    a.statuses.length === b.statuses.length &&
    a.statuses.every((s, idx) => s === b.statuses[idx])
  );
}

export function GeneralHrEvaluationsView() {
  const showToast = useAppToast();

  const [draft, setDraft] = useState<GeneralHrFilters>(INITIAL_FILTERS);
  const [applied, setApplied] = useState<GeneralHrFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [items, setItems] = useState<GeneralHrEvaluationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Lookups
  const [companies, setCompanies] = useState<LookupOption[]>([]);
  const [departments, setDepartments] = useState<LookupOption[]>([]);
  const [reviewers, setReviewers] = useState<ReviewerOption[]>([]);
  const [types, setTypes] = useState<EvaluationTypeOption[]>([]);
  const [fallbackPeriods, setFallbackPeriods] = useState<LookupOption[]>([]);

  // Right-side Tracking Panel (only fetches when open!)
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackedEval, setTrackedEval] = useState<GeneralHrEvaluationDto | null>(null);
  const [trackingTab, setTrackingTab] = useState("history");
  const [trackingHistory, setTrackingHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [trackingApprovers, setTrackingApprovers] = useState<EvaluationApprover[]>([]);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Action dialogs
  const [historyTarget, setHistoryTarget] = useState<GeneralHrEvaluationDto | null>(null);
  const [approversTarget, setApproversTarget] = useState<GeneralHrEvaluationDto | null>(null);
  const [changeStatusTarget, setChangeStatusTarget] = useState<GeneralHrEvaluationDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneralHrEvaluationDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export progress
  const [exportState, setExportState] = useState<{ active: boolean; progress: number; label: string }>({
    active: false,
    progress: 0,
    label: "",
  });
  const exportCtrlRef = useRef<AbortController | null>(null);
  const fetchCtrlRef = useRef<AbortController | null>(null);
  const trackingPanelRef = useRef<HTMLDivElement | null>(null);

  const isDirty = !filtersEqual(draft, applied);

  // Initial lookups
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      companyApi.getAll(ctrl.signal).catch(() => []),
      generalHrEvaluationApi.getReviewers(ctrl.signal).catch(() => []),
      evaluationLookupApi.getTypes(ctrl.signal).catch(() => []),
      evaluationLookupApi.getPeriods(ctrl.signal).catch(() => []),
    ]).then(([companyList, reviewerList, typeList, periodList]) => {
      if (ctrl.signal.aborted) return;
      setCompanies(companyList.map((c) => ({ id: String(c.id), name: c.companyName })));
      setReviewers(reviewerList);
      setTypes(typeList);
      setFallbackPeriods(periodList);
    });
    return () => ctrl.abort();
  }, []);

  // Cascading departments when companyId changes
  useEffect(() => {
    if (!draft.companyId) {
      setDepartments([]);
      return;
    }
    const ctrl = new AbortController();
    departmentApi
      .getAll(draft.companyId, { signal: ctrl.signal })
      .then((list) => {
        if (!ctrl.signal.aborted) {
          setDepartments(list.map((d) => ({ id: String(d.id), name: d.name })));
        }
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) setDepartments([]);
      });
    return () => ctrl.abort();
  }, [draft.companyId]);

  const periodOptions = useMemo<SelectOption[]>(() => {
    if (draft.typeId) {
      const matched = types.find((t) => t.id === draft.typeId);
      if (matched && matched.periods.length > 0) {
        return matched.periods.map((p) => ({ value: p.id, label: p.name }));
      }
    }
    return fallbackPeriods.map((p) => ({ value: p.id, label: p.name }));
  }, [draft.typeId, fallbackPeriods, types]);

  // Main paged fetch
  const loadData = useCallback(async () => {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await generalHrEvaluationApi.getPaged({
        page,
        pageSize,
        filters: applied,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Không thể tải danh sách bản đánh giá toàn hệ thống."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [applied, page, pageSize]);

  useEffect(() => {
    void loadData();
    return () => fetchCtrlRef.current?.abort();
  }, [loadData, reloadTick]);

  // Tracking panel fetch — strictly only when panel is open and an item is selected
  useEffect(() => {
    if (!isTrackingOpen || !trackedEval) return;
    const ctrl = new AbortController();
    setIsTrackingLoading(true);
    setTrackingError(null);

    Promise.all([
      generalHrEvaluationApi.getApprovalHistory(trackedEval.id, ctrl.signal),
      generalHrEvaluationApi.getApprovers(trackedEval.id, ctrl.signal),
    ])
      .then(([historyList, approverList]) => {
        if (ctrl.signal.aborted) return;
        setTrackingHistory(historyList);
        setTrackingApprovers(approverList);
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) {
          setTrackingError(getErrorMessage(err, "Không thể tải thông tin theo dõi."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsTrackingLoading(false);
      });

    return () => ctrl.abort();
  }, [isTrackingOpen, trackedEval, reloadTick]);

  const handleApply = () => {
    setPage(1);
    setApplied({ ...draft, statuses: [...draft.statuses] });
  };

  const handleReset = () => {
    setDraft(INITIAL_FILTERS);
    setApplied(INITIAL_FILTERS);
    setPage(1);
  };

  const handleOpenTracking = useCallback((row: GeneralHrEvaluationDto) => {
    setTrackedEval(row);
    setIsTrackingOpen(true);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.requestAnimationFrame(() => {
        trackingPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await generalHrEvaluationApi.remove(deleteTarget.id);
      showToast("success", "Đã xóa bản đánh giá thành công.");
      if (trackedEval?.id === deleteTarget.id) {
        setTrackedEval(null);
      }
      setDeleteTarget(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể xóa bản đánh giá."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = async () => {
    if (exportState.active) return;
    const ctrl = new AbortController();
    exportCtrlRef.current = ctrl;
    setExportState({
      active: true,
      progress: 25,
      label: "Đang tải toàn bộ dữ liệu theo bộ lọc...",
    });

    try {
      const allData = await generalHrEvaluationApi.getPaged({
        page: 1,
        pageSize: Math.max(total, 100),
        filters: applied,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      if (allData.items.length === 0) {
        showToast("warning", "Không có bản đánh giá nào để xuất Excel.");
        setExportState({ active: false, progress: 0, label: "" });
        return;
      }

      setExportState({
        active: true,
        progress: 70,
        label: `Đang tạo tệp Excel (${allData.items.length} hồ sơ)...`,
      });
      const filename = await exportEvaluationsApi.downloadListExcel(allData.items, ctrl.signal);
      if (ctrl.signal.aborted) return;

      setExportState({ active: true, progress: 100, label: `Đã tải xuống ${filename}` });
      showToast("success", `Đã xuất tệp Excel: ${filename}`);
      window.setTimeout(() => {
        setExportState({ active: false, progress: 0, label: "" });
      }, 1500);
    } catch (err) {
      if (isAbortError(err)) {
        showToast("info", "Đã hủy xuất tệp Excel.");
      } else {
        showToast("error", getErrorMessage(err, "Xuất tệp Excel thất bại."));
      }
      setExportState({ active: false, progress: 0, label: "" });
    }
  };

  const advancedActiveCount = useMemo(() => {
    let count = 0;
    if (applied.departmentId) count++;
    if (applied.reviewerId) count++;
    if (applied.typeId) count++;
    if (applied.periodId) count++;
    return count;
  }, [applied]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (applied.keyword.trim()) {
      chips.push({
        key: "keyword",
        label: `Từ khóa: ${applied.keyword.trim()}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, keyword: "" }));
          setApplied((p) => ({ ...p, keyword: "" }));
          setPage(1);
        },
      });
    }
    if (applied.companyId) {
      const name = companies.find((c) => c.id === applied.companyId)?.name ?? applied.companyId;
      chips.push({
        key: "companyId",
        label: `Công ty: ${name}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, companyId: "", departmentId: "" }));
          setApplied((p) => ({ ...p, companyId: "", departmentId: "" }));
          setPage(1);
        },
      });
    }
    if (applied.departmentId) {
      const name = departments.find((d) => d.id === applied.departmentId)?.name ?? applied.departmentId;
      chips.push({
        key: "departmentId",
        label: `Phòng ban: ${name}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, departmentId: "" }));
          setApplied((p) => ({ ...p, departmentId: "" }));
          setPage(1);
        },
      });
    }
    if (applied.reviewerId) {
      const name = reviewers.find((r) => r.id === applied.reviewerId)?.fullName ?? applied.reviewerId;
      chips.push({
        key: "reviewerId",
        label: `Người duyệt: ${name}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, reviewerId: "" }));
          setApplied((p) => ({ ...p, reviewerId: "" }));
          setPage(1);
        },
      });
    }
    if (applied.typeId) {
      const name = types.find((t) => t.id === applied.typeId)?.name ?? applied.typeId;
      chips.push({
        key: "typeId",
        label: `Loại: ${name}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, typeId: "", periodId: "" }));
          setApplied((p) => ({ ...p, typeId: "", periodId: "" }));
          setPage(1);
        },
      });
    }
    if (applied.periodId) {
      const name = periodOptions.find((p) => p.value === applied.periodId)?.label ?? applied.periodId;
      chips.push({
        key: "periodId",
        label: `Kỳ: ${name}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, periodId: "" }));
          setApplied((p) => ({ ...p, periodId: "" }));
          setPage(1);
        },
      });
    }
    if (applied.statuses.length > 0) {
      chips.push({
        key: "statuses",
        label: `Trạng thái (${applied.statuses.length})`,
        onRemove: () => {
          setDraft((p) => ({ ...p, statuses: [] }));
          setApplied((p) => ({ ...p, statuses: [] }));
          setPage(1);
        },
      });
    }
    return chips;
  }, [applied, companies, departments, periodOptions, reviewers, types]);

  const columns = useMemo<TableColumn<GeneralHrEvaluationDto>[]>(
    () => [
      {
        key: "employee",
        header: "Nhân viên",
        width: proportional(2),
        renderCell: (row) => (
          <UserIdentityCell
            name={row.name}
            subtitle={[row.systemCode, row.email].filter(Boolean).join(" · ") || undefined}
          />
        ),
      },
      {
        key: "companyDept",
        header: "Đơn vị / Phòng ban",
        width: proportional(1.6),
        renderCell: (row) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <CompanyChip companyCode={row.companyCode} />
            <span className="truncate text-xs text-secondary">{row.departmentName || "—"}</span>
          </div>
        ),
      },
      {
        key: "periodTemplate",
        header: "Kỳ & Biểu mẫu",
        width: proportional(1.6, { minWidth: 185 }),
        renderCell: (row) => (
          <PeriodBadgeCell label={row.period} sublabel={row.templateName} />
        ),
      },
      {
        key: "manager",
        header: "Quản lý trực tiếp",
        width: proportional(1.2),
        renderCell: (row) => (
          <span className="text-sm font-medium text-primary">{row.strDirectManager || "—"}</span>
        ),
      },
      ...(!isTrackingOpen
        ? [
            {
              key: "submitDate",
              header: "Ngày nộp",
              width: pixel(172),
              renderCell: (row: GeneralHrEvaluationDto) => (
                <ApproverTimeCell timestamp={formatDateTime(row.submitDate)} />
              ),
            },
          ]
        : []),
      {
        key: "status",
        header: "Trạng thái",
        width: pixel(212),
        renderCell: (row) => <EvaluationStatusBadge status={row.status} compact />,
      },
      {
        key: "actions",
        header: "Thao tác",
        width: pixel(198),
        align: "end",
        renderCell: (row) => {
          const isCurrentTracked = isTrackingOpen && trackedEval?.id === row.id;
          return (
            <div className="flex flex-nowrap items-center justify-end gap-1.5">
              <AppButton
                label="Theo dõi"
                variant={isCurrentTracked ? "primary" : "secondary"}
                size="sm"
                icon={<Activity className="h-3.5 w-3.5" />}
                onClick={() => handleOpenTracking(row)}
              />
              <RowActionMenu
                label={`Thao tác hồ sơ ${row.name ?? row.id}`}
                items={[
                  {
                    id: "track",
                    label: "Theo dõi nhanh",
                    icon: <PanelRightOpen className="h-4 w-4" />,
                    onClick: () => handleOpenTracking(row),
                  },
                  {
                    id: "history",
                    label: "Quá trình phê duyệt",
                    icon: <History className="h-4 w-4" />,
                    onClick: () => setHistoryTarget(row),
                  },
                  {
                    id: "approvers",
                    label: "Người đang duyệt",
                    icon: <UserCheck className="h-4 w-4" />,
                    onClick: () => setApproversTarget(row),
                  },
                  {
                    id: "change-status",
                    label: "Chuyển trạng thái",
                    icon: <ArrowRightLeft className="h-4 w-4" />,
                    onClick: () => setChangeStatusTarget(row),
                  },
                  {
                    id: "view-eval",
                    label: "Xem bản đánh giá",
                    icon: <Eye className="h-4 w-4" />,
                    isDisabled: true,
                  },
                  {
                    id: "delete",
                    label: "Xóa bản đánh giá",
                    icon: <Trash2 className="h-4 w-4" />,
                    variant: "destructive",
                    onClick: () => setDeleteTarget(row),
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [handleOpenTracking, isTrackingOpen, trackedEval?.id],
  );

  const orderedTrackingHistory = useMemo(
    () =>
      [...trackingHistory].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }),
    [trackingHistory],
  );

  const trackingPanel = (
    <div ref={trackingPanelRef}>
    <Card padding={4} elevation="low">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
              <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Theo dõi hồ sơ</span>
              {trackedEval ? (
                <span className="ds-timeline-pill ml-1 font-mono text-xs">
                  #{trackedEval.id}
                </span>
              ) : null}
            </div>
            <div className="mt-1 truncate text-sm font-bold text-primary">
              {trackedEval ? trackedEval.name || `Hồ sơ #${trackedEval.id}` : "Chưa chọn hồ sơ"}
            </div>
            {trackedEval ? (
              <div className="truncate text-xs text-secondary">
                {trackedEval.systemCode || "—"} · {trackedEval.period || "—"}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {trackedEval ? (
              <AppIconButton
                label="Mở chi tiết quá trình phê duyệt"
                icon={<History className="h-4 w-4" />}
                onClick={() => setHistoryTarget(trackedEval)}
              />
            ) : null}
            <AppIconButton
              label="Đóng bảng theo dõi"
              icon={<X className="h-4 w-4" />}
              onClick={() => setIsTrackingOpen(false)}
            />
          </div>
        </div>

        {!trackedEval ? (
          <Text type="supporting">
            Bấm nút &ldquo;Theo dõi&rdquo; trên bất kỳ hồ sơ nào để xem nhanh tiến trình phê duyệt.
          </Text>
        ) : (
          <>
            <div className="ds-track-summary flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CompanyChip companyCode={trackedEval.companyCode} />
                <EvaluationStatusBadge status={trackedEval.status} compact />
              </div>
              {trackedEval.submitDate ? (
                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs">
                  <span className="text-secondary">Ngày nộp</span>
                  <span className="font-medium tabular-nums text-primary">
                    {formatDateTime(trackedEval.submitDate)}
                  </span>
                </div>
              ) : null}
            </div>

            <AppTabs
              size="sm"
              value={trackingTab}
              onChange={setTrackingTab}
              items={[
                { value: "history", label: "Lịch sử", count: trackingHistory.length },
                { value: "approvers", label: "Người duyệt", count: trackingApprovers.length },
              ]}
            />

            {isTrackingLoading ? (
              <LoadingOverlay label="Đang tải tiến trình..." />
            ) : trackingError ? (
              <InlineErrorBanner message={trackingError} />
            ) : trackingTab === "history" ? (
              <div className="max-h-[420px] overflow-y-auto pr-0.5">
                <ApprovalTimeline
                  highlightFirst
                  entries={orderedTrackingHistory.map((entry, idx) => ({
                    id: entry.approvalId ?? idx,
                    actorName: entry.approverName || entry.approverUserId || "Hệ thống",
                    roleOrLevel: entry.approvalLevel,
                    status: entry.status ?? entry.statusValue,
                    comment: entry.comment,
                    timestamp: entry.createdAt,
                  }))}
                />
              </div>
            ) : trackingApprovers.length === 0 ? (
              <Text type="supporting">Không có người duyệt đang chờ.</Text>
            ) : (
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-0.5">
                {trackingApprovers.map((ap) => (
                  <div
                    key={ap.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5"
                  >
                    <UserIdentityCell name={ap.userName} subtitle={ap.systemCode ?? undefined} size="xsm" />
                    <span
                      className="ds-timeline-pill inline-flex shrink-0 items-center gap-1"
                      data-tone={ap.isApprove ? "success" : "waiting"}
                    >
                      {ap.isApprove ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {ap.isApprove ? "Đã duyệt" : "Chờ duyệt"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick action shortcuts for the tracked record */}
            <div className="flex flex-col gap-2 border-t border-border pt-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Thao tác nhanh
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="ds-track-shortcut flex min-h-[40px] w-full min-w-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-left text-xs font-semibold text-primary"
                  data-tone="blue"
                  onClick={() => setApproversTarget(trackedEval)}
                >
                  <span className="ds-track-shortcut-icon inline-grid h-6 w-6 shrink-0 place-items-center rounded-md" aria-hidden="true">
                    <UserCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">Người đang duyệt</span>
                </button>
                <button
                  type="button"
                  className="ds-track-shortcut flex min-h-[40px] w-full min-w-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-left text-xs font-semibold text-primary"
                  data-tone="purple"
                  onClick={() => setChangeStatusTarget(trackedEval)}
                >
                  <span className="ds-track-shortcut-icon inline-grid h-6 w-6 shrink-0 place-items-center rounded-md" aria-hidden="true">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">Chuyển trạng thái</span>
                </button>
              </div>
              <button
                type="button"
                className="ds-track-shortcut flex min-h-[40px] w-full min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
                data-tone="danger"
                onClick={() => setDeleteTarget(trackedEval)}
              >
                <span className="ds-track-shortcut-icon inline-grid h-6 w-6 shrink-0 place-items-center rounded-md" aria-hidden="true">
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
                <span>Xóa bản đánh giá</span>
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
    </div>
  );

  return (
    <PageFrame>
      <PageHeader
        artwork="evaluation"
        icon={<ClipboardCheck className="h-5 w-5" />}
        eyebrow="Quản trị nhân sự (HR)"
        title="Danh sách đánh giá toàn hệ thống"
        description="Theo dõi tiến độ phê duyệt KPI, lọc đa điều kiện, điều chỉnh trạng thái và xuất báo cáo Excel."
        actions={
          <>
            <AppButton
              label={isTrackingOpen ? "Ẩn theo dõi" : "Mở theo dõi"}
              variant="secondary"
              icon={
                isTrackingOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )
              }
              onClick={() => setIsTrackingOpen((open) => !open)}
            />
            <AppButton
              label="Xuất Excel"
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              isLoading={exportState.active}
              isDisabled={exportState.active || total === 0}
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

      <FilterBar
        primaryControls={
          <>
            <div className="w-full sm:min-w-[200px] sm:flex-1">
              <AppTextInput
                label="Tìm kiếm"
                value={draft.keyword}
                onChange={(keyword) => setDraft((p) => ({ ...p, keyword }))}
                placeholder="Tên, email, mã nhân viên..."
                startIcon="search"
                hasClear
                onEnter={handleApply}
              />
            </div>
            <div className="w-full sm:w-[210px]">
              <AppSelect
                label="Công ty"
                value={draft.companyId}
                onChange={(companyId) =>
                  setDraft((p) => ({ ...p, companyId, departmentId: "" }))
                }
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Tất cả công ty"
              />
            </div>
            <div className="w-full sm:w-[250px]">
              <AppMultiSelect
                label="Trạng thái"
                value={draft.statuses}
                onChange={(statuses) => setDraft((p) => ({ ...p, statuses }))}
                options={STATUS_FILTER_OPTIONS}
                placeholder="Tất cả trạng thái (9)"
              />
            </div>
            <div className="w-full sm:w-[170px]">
              <AppSelect
                label="Sắp xếp"
                value={draft.sortOrder}
                onChange={(val) =>
                  setDraft((p) => ({ ...p, sortOrder: val === "asc" ? "asc" : "desc" }))
                }
                options={SORT_OPTIONS}
                hasClear={false}
                hasSearch={false}
              />
            </div>
          </>
        }
        advancedControls={
          <>
            <AppSelect
              label="Phòng ban"
              value={draft.departmentId}
              onChange={(departmentId) => setDraft((p) => ({ ...p, departmentId }))}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder={draft.companyId ? "Tất cả phòng ban" : "Chọn công ty trước"}
              isDisabled={!draft.companyId}
              disabledMessage="Chọn công ty trước để lọc phòng ban"
            />
            <AppSelect
              label="Người duyệt"
              value={draft.reviewerId}
              onChange={(reviewerId) => setDraft((p) => ({ ...p, reviewerId }))}
              options={reviewers.map((r) => ({
                value: r.id,
                label: r.systemCode ? `${r.fullName} (${r.systemCode})` : r.fullName,
              }))}
              placeholder="Tất cả người duyệt"
            />
            <AppSelect
              label="Loại đánh giá"
              value={draft.typeId}
              onChange={(typeId) => setDraft((p) => ({ ...p, typeId, periodId: "" }))}
              options={types.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Tất cả loại đánh giá"
            />
            <AppSelect
              label="Kỳ đánh giá"
              value={draft.periodId}
              onChange={(periodId) => setDraft((p) => ({ ...p, periodId }))}
              options={periodOptions}
              placeholder="Tất cả kỳ đánh giá"
            />
          </>
        }
        advancedActiveCount={advancedActiveCount}
        chips={activeChips}
        onApply={handleApply}
        onReset={handleReset}
        isDirty={isDirty}
      />

      <MasterDetailFrame
        isDetailOpen={isTrackingOpen}
        main={
          <>
            <div className={!isLoading && !error && items.length > 0 ? "hidden md:block" : "block"}>
              <DataTable
                data={items}
                columns={columns}
                idKey={(row) => String(row.id)}
                isLoading={isLoading}
                error={error}
                isUnauthorized={isUnauthorized}
                loginNextPath="/admin/evaluationList"
                onRetry={() => setReloadTick((t) => t + 1)}
                emptyTitle="Chưa có bản đánh giá nào"
                emptyDescription="Không có hồ sơ nào phù hợp với tiêu chí lọc hiện tại."
                pagination={{
                  page,
                  pageSize,
                  totalItems: total,
                  onPageChange: setPage,
                  onPageSizeChange: (nextSize) => {
                    setPageSize(nextSize);
                    setPage(1);
                  },
                  itemLabel: "hồ sơ",
                }}
              />
            </div>

            {!isLoading && !error && items.length > 0 ? (
              <div className="flex flex-col gap-3 md:hidden ds-fade-in">
                {items.map((row) => {
                  const isCurrentTracked = isTrackingOpen && trackedEval?.id === row.id;
                  return (
                    <Card key={row.id} padding={4} elevation="low">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                          <div className="min-w-0 flex-1">
                            <UserIdentityCell
                              name={row.name}
                              subtitle={[row.systemCode, row.email].filter(Boolean).join(" · ") || undefined}
                            />
                          </div>
                          <span className="ds-timeline-pill shrink-0 font-mono text-xs">
                            #{row.id}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <PeriodBadgeCell label={row.period} sublabel={row.templateName} />
                          <ApproverTimeCell timestamp={formatDateTime(row.submitDate)} />
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 border-t border-border pt-2.5 sm:grid-cols-2">
                          <div className="flex min-w-0 flex-col gap-1">
                            <CompanyChip companyCode={row.companyCode} />
                            <span className="break-words text-xs text-secondary">
                              {row.departmentName || "—"}
                            </span>
                            {row.strDirectManager ? (
                              <span className="text-xs text-secondary">
                                QLTT: <strong className="font-medium text-primary">{row.strDirectManager}</strong>
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-start gap-1.5 sm:items-end">
                            <EvaluationStatusBadge status={row.status} compact />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                          <button
                            type="button"
                            onClick={() => handleOpenTracking(row)}
                            className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors ${
                              isCurrentTracked
                                ? "border-accent bg-blue-subtle text-accent"
                                : "border-border bg-surface text-primary hover:bg-muted/40"
                            }`}
                          >
                            <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Theo dõi</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryTarget(row)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/40"
                          >
                            <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Quá trình</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setApproversTarget(row)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/40"
                          >
                            <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Người duyệt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setChangeStatusTarget(row)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/40"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Chuyển TT</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-error transition-colors hover:bg-muted/40"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Xóa bản đánh giá</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                <AppPagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={total}
                  onPageChange={setPage}
                  onPageSizeChange={(nextSize) => {
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                  itemLabel="hồ sơ"
                />
              </div>
            ) : null}
          </>
        }
        detail={trackingPanel}
      />

      <EvaluationHistoryDialog
        evaluation={historyTarget}
        onClose={() => setHistoryTarget(null)}
        onOpenApprovers={(row) => {
          setHistoryTarget(null);
          setApproversTarget(row);
        }}
      />
      <EvaluationApproversDialog
        evaluation={approversTarget}
        onClose={() => setApproversTarget(null)}
        onOpenHistory={(row) => {
          setApproversTarget(null);
          setHistoryTarget(row);
        }}
      />
      <ChangeEvaluationStatusDialog
        evaluation={changeStatusTarget}
        onClose={() => setChangeStatusTarget(null)}
        onSuccess={() => setReloadTick((t) => t + 1)}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa bản đánh giá?"
        description={
          deleteTarget ? (
            <div className="flex flex-col gap-3">
              <span>
                Hồ sơ sẽ bị xóa khỏi danh sách. Kiểm tra thông tin trước khi xác nhận.
              </span>
              <div className="ds-form-section flex flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    Bản đánh giá #{deleteTarget.id}
                  </span>
                  <EvaluationStatusBadge status={deleteTarget.status} compact />
                </div>
                <UserIdentityCell
                  name={deleteTarget.name}
                  companyCode={deleteTarget.companyCode}
                  code={deleteTarget.systemCode}
                  department={deleteTarget.departmentName}
                />
                <div className="border-t border-border pt-2 text-xs">
                  <div className="font-semibold text-primary">
                    {deleteTarget.period || "Chưa có kỳ đánh giá"}
                  </div>
                  <div className="text-secondary">
                    {deleteTarget.templateName || "Chưa có tên bản đánh giá"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            ""
          )
        }
        cancelLabel="Giữ lại hồ sơ"
        confirmLabel="Xác nhận xóa"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </PageFrame>
  );
}
