"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Download,
  FileArchive,
  FileSpreadsheet,
  History,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Send,
  UserCheck,
} from "lucide-react";
import {
  AppButton,
  AppForm,
  AppSelect,
  AppTextArea,
  AppTextInput,
  BandBadge,
  CompanyChip,
  DataTable,
  EvaluationStatusBadge,
  ExportProgressBar,
  FilterBar,
  FormDialog,
  PageFrame,
  PageHeader,
  RowActionMenu,
  ScorePairCell,
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
  EvaluationStatus,
} from "@/design-system/registries";
import { UserRoleSystem } from "@/features/auth/types";
import { companyApi } from "@/features/company/services/companyApi";
import { departmentApi } from "@/features/department/services/departmentApi";
import {
  EvaluationApproversDialog,
  EvaluationHistoryDialog,
} from "@/features/evaluation/components/GeneralHrEvaluationDialogs";
import type { GeneralHrEvaluationDto, LookupOption } from "@/features/evaluation/types";
import { formatDate, formatScore } from "@/lib/format/formatters";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { summaryApi } from "../services/summaryApi";
import type { SummaryDetail, SummaryDetailFilters, SummaryMode } from "../types";
import { SummaryReviewDialog, type SummaryReviewTarget } from "./SummaryReviewDialog";

const ALL_STATUS_OPTIONS: SelectOption[] = Object.values(EvaluationStatus).map((status) => ({
  value: status,
  label: EVALUATION_STATUS_REGISTRY[status].label,
}));

type BatchTaskKind =
  | "select-all"
  | "approve-all"
  | "export-selected"
  | "export-all"
  | "export-detail-selected"
  | "export-detail-all";

function toCompletionPercent(value: number | null): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return value > 1 ? Math.max(0, Math.min(100, value)) : Math.max(0, Math.min(100, value * 100));
}

function asGeneralHrStub(row: SummaryDetail): GeneralHrEvaluationDto {
  return {
    id: row.evalId,
    userId: row.userId,
    name: row.userName,
    email: null,
    status: row.status,
    templateId: null,
    systemCode: row.userId,
    companyCode: row.companyCode,
    departmentName: row.departmentName,
    period: row.periodName,
    templateName: row.templateCode,
    submitDate: row.startDate,
    strDirectManager: row.userDoing,
  };
}

export function SummaryListDetailView({
  mode,
  periodId,
  companyId,
}: {
  mode: SummaryMode;
  periodId: number;
  companyId: number;
}) {
  const showToast = useAppToast();
  const isHrSummary = mode === "HrSummary";
  const reviewLevel = isHrSummary ? UserRoleSystem.HRSummary : UserRoleSystem.ManagerSenior;
  const routePath = `/summary/summary-list-detail/${mode}/${periodId}/${companyId}`;

  const initialFilters = useMemo<SummaryDetailFilters>(
    () => ({
      status: "",
      keyword: "",
      companyId: companyId === 0 ? "-1" : String(companyId),
      departmentId: "-1",
    }),
    [companyId],
  );

  const [filters, setFilters] = useState<SummaryDetailFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reloadTick, setReloadTick] = useState(0);

  const [companies, setCompanies] = useState<LookupOption[]>([]);
  const [departments, setDepartments] = useState<LookupOption[]>([]);
  const [items, setItems] = useState<SummaryDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [contextRow, setContextRow] = useState<SummaryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Cross-page selection map keyed by String(evalId)
  const [selectedMap, setSelectedMap] = useState<Map<string, SummaryDetail>>(() => new Map());
  const selectedKeys = useMemo(() => new Set(selectedMap.keys()), [selectedMap]);
  const selectedRows = useMemo(() => Array.from(selectedMap.values()), [selectedMap]);

  // Dialogs
  const [reviewTarget, setReviewTarget] = useState<SummaryReviewTarget | null>(null);
  const [historyRow, setHistoryRow] = useState<SummaryDetail | null>(null);
  const [approversRow, setApproversRow] = useState<SummaryDetail | null>(null);
  const [noteTarget, setNoteTarget] = useState<SummaryDetail | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Batch task / export progress
  const [taskState, setTaskState] = useState<{
    kind: BatchTaskKind | null;
    progress: number;
    label: string;
  }>({ kind: null, progress: 0, label: "" });
  const taskCtrlRef = useRef<AbortController | null>(null);
  const fetchCtrlRef = useRef<AbortController | null>(null);

  // Debounce search 300ms
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === filters.keyword) return;
    const timer = window.setTimeout(() => {
      setFilters((prev) => ({ ...prev, keyword: trimmed }));
      setSelectedMap(new Map());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.keyword, searchInput]);

  // Load companies
  useEffect(() => {
    const ctrl = new AbortController();
    const promise = isHrSummary
      ? companyApi.getForHrCompile(ctrl.signal)
      : companyApi.getAll(ctrl.signal);
    promise
      .then((list) => {
        if (!ctrl.signal.aborted) {
          setCompanies(list.map((c) => ({ id: String(c.id), name: c.companyName })));
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [isHrSummary, reloadTick]);

  // Load departments (fixes legacy SummaryDirector bug: pass byUnitHrCompile = isHrSummary!)
  useEffect(() => {
    const ctrl = new AbortController();
    const effectiveCompany = filters.companyId === "-1" ? "" : filters.companyId;
    departmentApi
      .list(effectiveCompany, "", {
        byUnitHrCompile: isHrSummary,
        signal: ctrl.signal,
      })
      .then((list) => {
        if (!ctrl.signal.aborted) {
          setDepartments(list.map((d) => ({ id: String(d.id), name: d.name })));
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setDepartments([]);
      });
    return () => ctrl.abort();
  }, [filters.companyId, isHrSummary, reloadTick]);

  // Load paged details
  const loadDetails = useCallback(async () => {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await summaryApi.getDetails(
        mode,
        periodId,
        page,
        pageSize,
        filters,
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(res.total / pageSize));
      if (page > lastPage && res.total > 0) {
        setPage(lastPage);
        return;
      }
      setItems(res.items);
      setTotal(res.total);
      if (res.items[0]) setContextRow(res.items[0]);
      // Keep selected rows fresh with latest server fields
      setSelectedMap((prev) => {
        if (prev.size === 0) return prev;
        const next = new Map(prev);
        for (const row of res.items) {
          const key = String(row.evalId);
          if (next.has(key)) next.set(key, row);
        }
        return next;
      });
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Chưa tải được danh sách hồ sơ chi tiết."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [filters, mode, page, pageSize, periodId]);

  useEffect(() => {
    void loadDetails();
    return () => fetchCtrlRef.current?.abort();
  }, [loadDetails, reloadTick]);

  useEffect(() => () => taskCtrlRef.current?.abort(), []);

  // Bridge DataTable's Set<string> selection updates into our cross-page Map<string, SummaryDetail>
  const handleSelectedKeysChange: React.Dispatch<React.SetStateAction<Set<string>>> = useCallback(
    (updater) => {
      setSelectedMap((prevMap) => {
        const prevKeys = new Set(prevMap.keys());
        const nextKeys = typeof updater === "function" ? updater(prevKeys) : updater;
        const nextMap = new Map<string, SummaryDetail>();
        const pageRowByKey = new Map(items.map((r) => [String(r.evalId), r]));
        for (const key of nextKeys) {
          const existing = pageRowByKey.get(key) ?? prevMap.get(key);
          if (existing) nextMap.set(key, existing);
        }
        return nextMap;
      });
    },
    [items],
  );

  const handleSaveNote = async () => {
    if (!noteTarget) return;
    setIsSavingNote(true);
    try {
      await summaryApi.updateNote(noteTarget, noteValue);
      const updated: SummaryDetail = { ...noteTarget, note: noteValue };
      setItems((prev) => prev.map((r) => (r.evalId === updated.evalId ? updated : r)));
      setSelectedMap((prev) => {
        const key = String(updated.evalId);
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.set(key, updated);
        return next;
      });
      setNoteTarget(null);
      showToast("success", "Đã lưu ý kiến Ban điều hành.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Chưa lưu được ý kiến Ban điều hành."));
    } finally {
      setIsSavingNote(false);
    }
  };

  const runBatchTask = async (kind: BatchTaskKind) => {
    if (taskState.kind || isLoading || total === 0) return;
    const onlySelected = kind === "export-selected" || kind === "export-detail-selected";
    if (onlySelected && selectedRows.length === 0) return;

    const ctrl = new AbortController();
    taskCtrlRef.current = ctrl;
    setTaskState({
      kind,
      progress: 25,
      label: onlySelected
        ? `Đang chuẩn bị ${selectedRows.length} hồ sơ đã chọn...`
        : `Đang tải toàn bộ ${total} hồ sơ theo bộ lọc...`,
    });

    try {
      const targetRows = onlySelected
        ? selectedRows
        : (await summaryApi.getDetails(mode, periodId, 1, total, filters, ctrl.signal)).items;
      if (ctrl.signal.aborted) return;

      if (targetRows.length === 0) {
        showToast("info", "Không có hồ sơ nào theo bộ lọc hiện tại.");
        setTaskState({ kind: null, progress: 0, label: "" });
        return;
      }

      if (kind === "select-all") {
        setSelectedMap(new Map(targetRows.map((r) => [String(r.evalId), r])));
        showToast("info", `Đã chọn toàn bộ ${targetRows.length} hồ sơ.`);
        setTaskState({ kind: null, progress: 0, label: "" });
        return;
      }

      if (kind === "approve-all") {
        setTaskState({ kind: null, progress: 0, label: "" });
        setReviewTarget({ kind: "approve", rows: targetRows, all: true });
        return;
      }

      const isDetailedZip =
        kind === "export-detail-selected" || kind === "export-detail-all";
      setTaskState({
        kind,
        progress: 70,
        label: isDetailedZip
          ? `Đang nén Excel chi tiết (${targetRows.length} hồ sơ)...`
          : `Đang tạo Excel tổng hợp (${targetRows.length} hồ sơ)...`,
      });

      const filename = isDetailedZip
        ? await summaryApi.exportDetailedZip(
            targetRows.map((r) => r.evalId),
            ctrl.signal,
          )
        : await summaryApi.exportSummaryExcel(targetRows, ctrl.signal);

      if (ctrl.signal.aborted) return;
      setTaskState({ kind, progress: 100, label: `Đã tải xuống ${filename}` });
      showToast(
        "success",
        `Đã xuất ${isDetailedZip ? "Excel chi tiết" : "Excel tổng hợp"} cho ${targetRows.length} hồ sơ.`,
      );
      window.setTimeout(() => setTaskState({ kind: null, progress: 0, label: "" }), 1400);
    } catch (err) {
      if (isAbortError(err)) {
        showToast("info", "Đã hủy thao tác.");
      } else {
        showToast("error", getErrorMessage(err, "Chưa hoàn tất thao tác. Vui lòng thử lại."));
      }
      setTaskState({ kind: null, progress: 0, label: "" });
    } finally {
      taskCtrlRef.current = null;
    }
  };

  const handleReset = () => {
    setSearchInput("");
    setFilters(initialFilters);
    setSelectedMap(new Map());
    setPage(1);
  };

  const companyDisplayName =
    filters.companyId === "-1"
      ? "Tất cả công ty"
      : companies.find((c) => c.id === filters.companyId)?.name ||
        contextRow?.companyName ||
        "Công ty theo kỳ đánh giá";

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.keyword) {
      chips.push({
        key: "keyword",
        label: `Từ khóa: ${filters.keyword}`,
        onRemove: () => {
          setSearchInput("");
          setFilters((p) => ({ ...p, keyword: "" }));
          setPage(1);
        },
      });
    }
    if (filters.status) {
      const label =
        EVALUATION_STATUS_REGISTRY[filters.status as EvaluationStatus]?.label ?? filters.status;
      chips.push({
        key: "status",
        label: `Trạng thái: ${label}`,
        onRemove: () => {
          setFilters((p) => ({ ...p, status: "" }));
          setPage(1);
        },
      });
    }
    if (filters.departmentId !== "-1") {
      const name =
        departments.find((d) => d.id === filters.departmentId)?.name ?? filters.departmentId;
      chips.push({
        key: "departmentId",
        label: `Phòng ban: ${name}`,
        onRemove: () => {
          setFilters((p) => ({ ...p, departmentId: "-1" }));
          setPage(1);
        },
      });
    }
    return chips;
  }, [departments, filters]);

  const columns = useMemo<TableColumn<SummaryDetail>[]>(
    () => [
      {
        key: "employee",
        header: "Nhân viên",
        width: proportional(2),
        renderCell: (row) => (
          <UserIdentityCell
            name={row.userName}
            code={row.userId}
            department={row.jobName}
          />
        ),
      },
      {
        key: "org",
        header: "Đơn vị / Phòng ban",
        width: proportional(1.6),
        renderCell: (row) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <CompanyChip companyCode={row.companyCode} companyName={row.companyName} />
            <span className="truncate text-xs text-secondary">{row.departmentName || "—"}</span>
          </div>
        ),
      },
      {
        key: "scores",
        header: "Điểm đánh giá",
        width: pixel(172),
        align: "center",
        renderCell: (row) => (
          <ScorePairCell
            primary={formatScore(row.score)}
            primaryLabel="Tự ĐG"
            secondary={formatScore(row.managerSocre)}
            secondaryLabel="Quản lý"
          />
        ),
      },
      {
        key: "completion",
        header: "Tỷ lệ R%",
        width: pixel(135),
        renderCell: (row) => {
          const pct = toCompletionPercent(row.rPercent);
          return (
            <div className="w-24">
              <ProgressBar
                label={`${Math.round(pct)}%`}
                value={pct}
                max={100}
                variant={pct >= 80 ? "success" : pct >= 50 ? "accent" : "error"}
              />
            </div>
          );
        },
      },
      {
        key: "band",
        header: "Xếp loại",
        width: pixel(114),
        align: "center",
        renderCell: (row) => <BandBadge band={row.band} />,
      },
      {
        key: "status",
        header: "Trạng thái",
        width: pixel(190),
        renderCell: (row) => (
          <div className="flex flex-col items-start gap-0.5">
            <EvaluationStatusBadge
              status={row.status}
              displayLabel={row.statusDisplay}
              isRejected={row.isReject}
              compact
            />
            {row.userDoing ? (
              <span className="truncate text-xs text-secondary">{row.userDoing}</span>
            ) : null}
            {!row.isCanApprove ? (
              <span className="text-[11px] font-medium text-status-warning">
                Không có quyền chuyển
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: "note",
        header: "Ý kiến BĐH",
        width: proportional(1.3, { minWidth: 150 }),
        renderCell: (row) => (
          <button
            type="button"
            onClick={() => {
              setNoteTarget(row);
              setNoteValue(row.note ?? "");
            }}
            className="flex max-w-full items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-left text-xs text-primary ds-interactive hover:border-border hover:bg-muted/60"
            title={row.note || "Nhấn để thêm ý kiến Ban điều hành"}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-secondary" />
            <span className="line-clamp-2">
              {row.note?.trim() || <span className="text-secondary">Thêm ý kiến...</span>}
            </span>
          </button>
        ),
      },
      {
        key: "actions",
        header: "Thao tác",
        width: pixel(108),
        align: "end",
        renderCell: (row) => (
          <RowActionMenu
            label={`Thao tác hồ sơ ${row.userName}`}
            items={[
              {
                id: "approve",
                label: "Gửi duyệt",
                icon: <Send className="h-4 w-4" />,
                onClick: () => setReviewTarget({ kind: "approve", rows: [row] }),
              },
              {
                id: "reject",
                label: "Trả về",
                icon: <RotateCcw className="h-4 w-4" />,
                variant: "destructive" as const,
                onClick: () => setReviewTarget({ kind: "reject", rows: [row] }),
              },
              {
                id: "note",
                label: "Ý kiến BĐH",
                icon: <MessageSquare className="h-4 w-4" />,
                onClick: () => {
                  setNoteTarget(row);
                  setNoteValue(row.note ?? "");
                },
              },
              {
                id: "history",
                label: "Lịch sử phê duyệt",
                icon: <History className="h-4 w-4" />,
                onClick: () => setHistoryRow(row),
              },
              {
                id: "approvers",
                label: "Người đang duyệt",
                icon: <UserCheck className="h-4 w-4" />,
                onClick: () => setApproversRow(row),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageFrame>
      <div>
        <AppButton
          label="Quay lại danh sách tổng hợp"
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="h-4 w-4" />}
          href={`/summary/summary-list/${mode}`}
        />
      </div>

      <PageHeader
        artwork="summary"
        icon={<FileSpreadsheet className="h-5 w-5" />}
        eyebrow={isHrSummary ? "HR tổng hợp" : "Tổng hợp cấp cao"}
        title={contextRow?.periodName || `Tổng hợp kỳ đánh giá #${periodId}`}
        description={
          contextRow
            ? `${companyDisplayName} · ${formatDate(contextRow.startDate)} — ${formatDate(contextRow.endDate)}`
            : companyDisplayName
        }
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-subtle px-2.5 py-0.5 text-xs font-medium text-blue-vivid">
            <Calendar className="h-3.5 w-3.5" />
            {total} hồ sơ
          </span>
        }
        actions={
          <>
            <AppButton
              label={`Chọn tất cả (${total})`}
              variant="secondary"
              size="sm"
              icon={<CheckSquare className="h-4 w-4" />}
              isDisabled={isLoading || total === 0 || Boolean(taskState.kind)}
              onClick={() => void runBatchTask("select-all")}
            />
            <AppButton
              label="Duyệt tất cả"
              variant="primary"
              size="sm"
              icon={<Send className="h-4 w-4" />}
              isDisabled={isLoading || total === 0 || Boolean(taskState.kind)}
              onClick={() => void runBatchTask("approve-all")}
            />
            <AppButton
              label="Excel tổng hợp tất cả"
              variant="secondary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              isDisabled={isLoading || total === 0 || Boolean(taskState.kind)}
              onClick={() => void runBatchTask("export-all")}
            />
            <AppButton
              label="Excel chi tiết tất cả"
              variant="secondary"
              size="sm"
              icon={<FileArchive className="h-4 w-4" />}
              isDisabled={isLoading || total === 0 || Boolean(taskState.kind)}
              onClick={() => void runBatchTask("export-detail-all")}
            />
            <AppButton
              label="Làm mới"
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                setSelectedMap(new Map());
                setReloadTick((t) => t + 1);
              }}
            />
          </>
        }
      />

      {taskState.kind ? (
        <ExportProgressBar
          label={taskState.label}
          value={taskState.progress}
          onCancel={() => taskCtrlRef.current?.abort()}
        />
      ) : null}

      <FilterBar
        primaryControls={
          <>
            <div className="min-w-[200px] flex-1">
              <AppTextInput
                label="Tìm kiếm"
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Tên nhân viên, mã nhân viên, chức danh..."
                startIcon="search"
                hasClear
              />
            </div>
            <div className="w-full sm:w-[210px]">
              <AppSelect
                label="Công ty"
                value={filters.companyId === "-1" ? "" : filters.companyId}
                onChange={(val) => {
                  setFilters((p) => ({
                    ...p,
                    companyId: val || "-1",
                    departmentId: "-1",
                  }));
                  setSelectedMap(new Map());
                  setPage(1);
                }}
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Tất cả công ty"
              />
            </div>
            <div className="w-full sm:w-[210px]">
              <AppSelect
                label="Phòng ban"
                value={filters.departmentId === "-1" ? "" : filters.departmentId}
                onChange={(val) => {
                  setFilters((p) => ({ ...p, departmentId: val || "-1" }));
                  setSelectedMap(new Map());
                  setPage(1);
                }}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="Tất cả phòng ban"
              />
            </div>
            <div className="w-full sm:w-[210px]">
              <AppSelect
                label="Trạng thái"
                value={filters.status}
                onChange={(status) => {
                  setFilters((p) => ({ ...p, status }));
                  setSelectedMap(new Map());
                  setPage(1);
                }}
                options={ALL_STATUS_OPTIONS}
                placeholder="Tất cả trạng thái"
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
        idKey={(row) => String(row.evalId)}
        isLoading={isLoading}
        error={error}
        isUnauthorized={isUnauthorized}
        loginNextPath={routePath}
        onRetry={() => setReloadTick((t) => t + 1)}
        emptyTitle="Chưa có hồ sơ chi tiết"
        emptyDescription="Không tìm thấy hồ sơ đánh giá nào trong kỳ này với bộ lọc hiện tại."
        selection={{
          selectedKeys,
          onSelectedKeysChange: handleSelectedKeysChange,
          actions: (
            <>
              <AppButton
                label={`Gửi duyệt (${selectedRows.length})`}
                variant="primary"
                size="sm"
                icon={<Send className="h-3.5 w-3.5" />}
                isDisabled={selectedRows.length === 0 || Boolean(taskState.kind)}
                onClick={() =>
                  setReviewTarget({ kind: "approve", rows: selectedRows })
                }
              />
              <AppButton
                label={`Trả về (${selectedRows.length})`}
                variant="destructive"
                size="sm"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                isDisabled={selectedRows.length === 0 || Boolean(taskState.kind)}
                onClick={() =>
                  setReviewTarget({ kind: "reject", rows: selectedRows })
                }
              />
              <AppButton
                label="Excel tổng hợp"
                variant="secondary"
                size="sm"
                icon={<Download className="h-3.5 w-3.5" />}
                isDisabled={selectedRows.length === 0 || Boolean(taskState.kind)}
                onClick={() => void runBatchTask("export-selected")}
              />
              <AppButton
                label="Excel chi tiết"
                variant="secondary"
                size="sm"
                icon={<FileArchive className="h-3.5 w-3.5" />}
                isDisabled={selectedRows.length === 0 || Boolean(taskState.kind)}
                onClick={() => void runBatchTask("export-detail-selected")}
              />
            </>
          ),
        }}
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

      <SummaryReviewDialog
        target={reviewTarget}
        level={reviewLevel}
        onClose={() => setReviewTarget(null)}
        onProcessed={(processedIds) => {
          const doneSet = new Set(processedIds.map(String));
          setSelectedMap((prev) => {
            const next = new Map(prev);
            for (const key of doneSet) next.delete(key);
            return next;
          });
          setReloadTick((t) => t + 1);
        }}
      />

      <FormDialog
        isOpen={Boolean(noteTarget)}
        onOpenChange={(open) => {
          if (!open) setNoteTarget(null);
        }}
        title="Ý kiến Ban điều hành"
        subtitle={
          noteTarget ? `${noteTarget.userName} (${noteTarget.userId}) · ${noteTarget.companyCode}` : undefined
        }
        isDirty={Boolean(noteTarget && noteValue !== (noteTarget.note ?? ""))}
        isSubmitting={isSavingNote}
        submitLabel="Lưu ý kiến"
        onSubmit={handleSaveNote}
      >
        <AppForm>
          <AppTextArea
            label="Nội dung ý kiến"
            value={noteValue}
            onChange={setNoteValue}
            placeholder="Nhập ghi chú, ý kiến nhận xét của Ban điều hành..."
            rows={5}
            isDisabled={isSavingNote}
          />
        </AppForm>
      </FormDialog>

      <EvaluationHistoryDialog
        evaluation={historyRow ? asGeneralHrStub(historyRow) : null}
        onClose={() => setHistoryRow(null)}
      />
      <EvaluationApproversDialog
        evaluation={approversRow ? asGeneralHrStub(approversRow) : null}
        onClose={() => setApproversRow(null)}
      />
    </PageFrame>
  );
}
