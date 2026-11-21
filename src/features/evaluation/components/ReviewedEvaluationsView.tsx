"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import { Eye, ExternalLink, FileCheck2, RefreshCw } from "lucide-react";
import {
  AppButton,
  AppDateInput,
  ApproverTimeCell,
  AppSelect,
  AppTextInput,
  BandBadge,
  DataTable,
  DetailDialog,
  EvaluationStatusBadge,
  FilterBar,
  PageFrame,
  PageHeader,
  PeriodBadgeCell,
  ScorePairCell,
  StatusFilterTabs,
  UserIdentityCell,
  pixel,
  proportional,
  type ActiveFilterChip,
  type SelectOption,
  type TableColumn,
} from "@/components/ds";
import { UserRoleSystem, type ReviewRole } from "@/features/auth/types";
import { formatDateTime, formatScore } from "@/lib/format/formatters";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import { reviewedEvaluationApi } from "../services/reviewedEvaluationApi";
import type {
  EvaluationTypeOption,
  LookupOption,
  ReviewedEvaluationDto,
  ReviewedEvaluationFilters,
} from "../types";

const INITIAL_FILTERS: ReviewedEvaluationFilters = {
  keyword: "",
  companyId: "",
  departmentId: "",
  typeId: "",
  periodId: "",
  status: "",
  from: "",
  to: "",
};

const SORT_OPTIONS: SelectOption[] = [
  { value: "date_desc", label: "Ngày duyệt mới nhất" },
  { value: "date_asc", label: "Ngày duyệt cũ nhất" },
  { value: "employee_asc", label: "Nhân viên (A → Z)" },
  { value: "employee_desc", label: "Nhân viên (Z → A)" },
];

const STATUS_TAB_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Rejected", label: "Bị trả lại" },
];

function filtersEqual(a: ReviewedEvaluationFilters, b: ReviewedEvaluationFilters): boolean {
  return (
    a.keyword.trim() === b.keyword.trim() &&
    a.companyId === b.companyId &&
    a.departmentId === b.departmentId &&
    a.typeId === b.typeId &&
    a.periodId === b.periodId &&
    a.status === b.status &&
    a.from === b.from &&
    a.to === b.to
  );
}

export function ReviewedEvaluationsView({ level }: { level: ReviewRole }) {
  const isHr = level === UserRoleSystem.HR;
  const routePath = isHr ? "/hr/reviewed" : "/manager/reviewed";

  const [draft, setDraft] = useState<ReviewedEvaluationFilters>(INITIAL_FILTERS);
  const [applied, setApplied] = useState<ReviewedEvaluationFilters>(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [items, setItems] = useState<ReviewedEvaluationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [companies, setCompanies] = useState<LookupOption[]>([]);
  const [departments, setDepartments] = useState<LookupOption[]>([]);
  const [types, setTypes] = useState<EvaluationTypeOption[]>([]);
  const [fallbackPeriods, setFallbackPeriods] = useState<LookupOption[]>([]);

  const [selectedRow, setSelectedRow] = useState<ReviewedEvaluationDto | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const fetchCtrlRef = useRef<AbortController | null>(null);

  const dateRangeInvalid = Boolean(draft.from && draft.to && draft.from > draft.to);
  const isDirty = !filtersEqual(draft, applied);

  // Load initial lookups
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      evaluationLookupApi.getCompanies(level, ctrl.signal).catch(() => []),
      isHr ? evaluationLookupApi.getTypes(ctrl.signal).catch(() => []) : Promise.resolve([]),
      isHr ? evaluationLookupApi.getPeriods(ctrl.signal).catch(() => []) : Promise.resolve([]),
    ]).then(([companyList, typeList, periodList]) => {
      if (ctrl.signal.aborted) return;
      setCompanies(companyList);
      setTypes(typeList);
      setFallbackPeriods(periodList);
    });
    return () => ctrl.abort();
  }, [isHr, level]);

  // HR-only: load departments strictly when a company is chosen (fixes legacy always-load bug)
  useEffect(() => {
    if (!isHr || !draft.companyId) {
      setDepartments([]);
      return;
    }
    const ctrl = new AbortController();
    evaluationLookupApi
      .getDepartments(draft.companyId, level, ctrl.signal)
      .then((list) => {
        if (!ctrl.signal.aborted) setDepartments(list);
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) setDepartments([]);
      });
    return () => ctrl.abort();
  }, [draft.companyId, isHr, level]);

  const periodOptions = useMemo<SelectOption[]>(() => {
    if (draft.typeId) {
      const matched = types.find((t) => t.id === draft.typeId);
      if (matched && matched.periods.length > 0) {
        return matched.periods.map((p) => ({ value: p.id, label: p.name }));
      }
    }
    return fallbackPeriods.map((p) => ({ value: p.id, label: p.name }));
  }, [draft.typeId, fallbackPeriods, types]);

  const loadData = useCallback(async () => {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await reviewedEvaluationApi.get({
        page,
        pageSize,
        rolePage: level,
        filters: applied,
        sortBy,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Không thể tải danh sách hồ sơ đã duyệt."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [applied, level, page, pageSize, sortBy]);

  useEffect(() => {
    void loadData();
    return () => fetchCtrlRef.current?.abort();
  }, [loadData, reloadTick]);

  const handleApply = () => {
    if (dateRangeInvalid) return;
    setPage(1);
    setApplied({ ...draft });
  };

  const handleReset = () => {
    setDraft(INITIAL_FILTERS);
    setApplied(INITIAL_FILTERS);
    setPage(1);
  };

  const handleStatusTabChange = (nextStatus: string) => {
    setDraft((prev) => ({ ...prev, status: nextStatus }));
    setApplied((prev) => ({ ...prev, status: nextStatus }));
    setPage(1);
  };

  const advancedActiveCount = useMemo(() => {
    let count = 0;
    if (isHr && applied.departmentId) count++;
    if (isHr && applied.typeId) count++;
    if (isHr && applied.periodId) count++;
    if (applied.from) count++;
    if (applied.to) count++;
    return count;
  }, [applied, isHr]);

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
    if (isHr && applied.departmentId) {
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
    if (isHr && applied.typeId) {
      const name = types.find((t) => t.id === applied.typeId)?.name ?? applied.typeId;
      chips.push({
        key: "typeId",
        label: `Loại đánh giá: ${name}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, typeId: "", periodId: "" }));
          setApplied((p) => ({ ...p, typeId: "", periodId: "" }));
          setPage(1);
        },
      });
    }
    if (isHr && applied.periodId) {
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
    if (applied.from) {
      chips.push({
        key: "from",
        label: `Từ: ${applied.from}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, from: "" }));
          setApplied((p) => ({ ...p, from: "" }));
          setPage(1);
        },
      });
    }
    if (applied.to) {
      chips.push({
        key: "to",
        label: `Đến: ${applied.to}`,
        onRemove: () => {
          setDraft((p) => ({ ...p, to: "" }));
          setApplied((p) => ({ ...p, to: "" }));
          setPage(1);
        },
      });
    }
    return chips;
  }, [applied, companies, departments, isHr, periodOptions, types]);

  const columns = useMemo<TableColumn<ReviewedEvaluationDto>[]>(
    () => [
      {
        key: "employee",
        header: "Nhân viên",
        width: proportional(2.1, { minWidth: 220 }),
        renderCell: (row) => (
          <UserIdentityCell
            name={row.employeeName}
            code={row.employeeCode}
            department={row.departmentName}
          />
        ),
      },
      {
        key: "period",
        header: "Kỳ đánh giá",
        width: proportional(1.25, { minWidth: 165 }),
        renderCell: (row) => <PeriodBadgeCell label={row.periodLabel} />,
      },
      {
        key: "status",
        header: "Trạng thái",
        width: pixel(192),
        renderCell: (row) => <EvaluationStatusBadge status={row.status} compact />,
      },
      {
        key: "approvedDate",
        header: "Người & Ngày xử lý",
        width: proportional(1.25, { minWidth: 170 }),
        renderCell: (row) => (
          <ApproverTimeCell
            name={row.approverName}
            timestamp={formatDateTime(row.approvedDate)}
          />
        ),
      },
      {
        key: "scores",
        header: "Điểm đánh giá",
        width: pixel(172),
        align: "center",
        renderCell: (row) => (
          <ScorePairCell
            primary={formatScore(row.totalScore)}
            primaryLabel="Tổng điểm"
            secondary={formatScore(row.managerSocre)}
            secondaryLabel="Quản lý"
          />
        ),
      },
      {
        key: "band",
        header: "Xếp loại",
        width: pixel(104),
        align: "center",
        renderCell: (row) => <BandBadge band={row.band} />,
      },
      {
        key: "actions",
        header: "Thao tác",
        width: pixel(114),
        align: "end",
        renderCell: (row) => (
          <AppButton
            label="Xem"
            variant="secondary"
            size="sm"
            icon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => setSelectedRow(row)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageFrame>
      <PageHeader
        artwork="evaluation"
        icon={<FileCheck2 className="h-5 w-5" />}
        eyebrow={isHr ? "Nhân sự (HR)" : "Quản lý trực tiếp"}
        title={isHr ? "Hồ sơ HR đã xử lý" : "Hồ sơ quản lý đã xử lý"}
        description="Tra cứu lịch sử các bản đánh giá KPI đã phê duyệt hoặc trả lại, kèm điểm số, xếp loại và lý do."
        actions={
          <AppButton
            label="Làm mới"
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => setReloadTick((t) => t + 1)}
          />
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilterTabs
          label="Lọc kết quả xử lý"
          items={STATUS_TAB_OPTIONS}
          value={applied.status}
          onChange={handleStatusTabChange}
        />
        <span className="text-sm text-secondary">
          Tổng số <strong className="font-semibold text-primary">{total}</strong> hồ sơ
        </span>
      </div>

      <FilterBar
        primaryControls={
          <>
            <div className="min-w-[220px] flex-1">
              <AppTextInput
                label="Tìm kiếm"
                value={draft.keyword}
                onChange={(keyword) => setDraft((p) => ({ ...p, keyword }))}
                placeholder="Tên nhân viên, mã nhân viên..."
                startIcon="search"
                hasClear
                onEnter={handleApply}
              />
            </div>
            <div className="w-full sm:w-[220px]">
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
            <div className="w-full sm:w-[200px]">
              <AppSelect
                label="Sắp xếp"
                value={sortBy}
                onChange={(next) => {
                  setSortBy(next || "date_desc");
                  setPage(1);
                }}
                options={SORT_OPTIONS}
                hasClear={false}
                hasSearch={false}
              />
            </div>
          </>
        }
        advancedControls={
          <>
            {isHr ? (
              <AppSelect
                label="Phòng ban"
                value={draft.departmentId}
                onChange={(departmentId) => setDraft((p) => ({ ...p, departmentId }))}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                placeholder={draft.companyId ? "Tất cả phòng ban" : "Chọn công ty trước"}
                isDisabled={!draft.companyId}
                disabledMessage="Vui lòng chọn công ty trước khi lọc phòng ban"
              />
            ) : null}
            {isHr ? (
              <AppSelect
                label="Loại đánh giá"
                value={draft.typeId}
                onChange={(typeId) => setDraft((p) => ({ ...p, typeId, periodId: "" }))}
                options={types.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Tất cả loại đánh giá"
              />
            ) : null}
            {isHr ? (
              <AppSelect
                label="Kỳ đánh giá"
                value={draft.periodId}
                onChange={(periodId) => setDraft((p) => ({ ...p, periodId }))}
                options={periodOptions}
                placeholder="Tất cả kỳ đánh giá"
              />
            ) : null}
            <AppDateInput
              label="Từ ngày"
              value={draft.from}
              onChange={(from) => setDraft((p) => ({ ...p, from }))}
              max={draft.to || undefined}
              error={dateRangeInvalid ? "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc." : undefined}
            />
            <AppDateInput
              label="Đến ngày"
              value={draft.to}
              onChange={(to) => setDraft((p) => ({ ...p, to }))}
              min={draft.from || undefined}
            />
          </>
        }
        advancedActiveCount={advancedActiveCount}
        chips={activeChips}
        onApply={handleApply}
        onReset={handleReset}
        isDirty={isDirty}
        isApplyDisabled={dateRangeInvalid}
      />

      <DataTable
        data={items}
        columns={columns}
        idKey={(row) => String(row.id)}
        isLoading={isLoading}
        error={error}
        isUnauthorized={isUnauthorized}
        loginNextPath={routePath}
        onRetry={() => setReloadTick((t) => t + 1)}
        emptyTitle="Chưa có hồ sơ đã xử lý"
        emptyDescription="Không tìm thấy bản đánh giá nào khớp với điều kiện lọc hiện tại."
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

      <DetailDialog
        isOpen={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
        title={selectedRow?.employeeName || "Chi tiết hồ sơ đã xử lý"}
        subtitle={
          selectedRow
            ? `${selectedRow.employeeCode ?? "—"} · ${selectedRow.periodLabel ?? "—"}`
            : undefined
        }
        headerEndContent={
          selectedRow ? <EvaluationStatusBadge status={selectedRow.status} /> : undefined
        }
        footer={
          selectedRow ? (
            <>
              <AppButton
                label="Mở bản đánh giá"
                variant="secondary"
                icon={<ExternalLink className="h-4 w-4" />}
                href={`/evaluationDetail/${selectedRow.evalid ?? selectedRow.id}`}
              />
              <AppButton
                label="Đóng"
                variant="primary"
                onClick={() => setSelectedRow(null)}
              />
            </>
          ) : undefined
        }
      >
        {selectedRow ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2">
              <div>
                <Text type="supporting">Phòng ban</Text>
                <div className="mt-0.5 text-sm font-medium text-primary">
                  {selectedRow.departmentName || "—"}
                </div>
              </div>
              <div>
                <Text type="supporting">Người xử lý</Text>
                <div className="mt-0.5 text-sm font-medium text-primary">
                  {selectedRow.approverName || "—"}
                </div>
              </div>
              <div>
                <Text type="supporting">Điểm tự đánh giá</Text>
                <div className="mt-0.5 text-sm font-semibold text-primary">
                  {formatScore(selectedRow.totalScore)}
                </div>
              </div>
              <div>
                <Text type="supporting">Điểm quản lý</Text>
                <div className="mt-0.5 text-sm font-semibold text-primary">
                  {formatScore(selectedRow.managerSocre)}
                </div>
              </div>
              <div>
                <Text type="supporting">Xếp loại (Band)</Text>
                <div className="mt-1">
                  <BandBadge band={selectedRow.band} />
                </div>
              </div>
              <div>
                <Text type="supporting">Thời gian xử lý</Text>
                <div className="mt-0.5 text-sm font-medium text-primary">
                  {formatDateTime(selectedRow.approvedDate)}
                </div>
              </div>
            </div>

            {selectedRow.rejectedReason ? (
              <div className="rounded-lg border border-border bg-red-subtle/40 p-3.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-error">
                  Lý do trả lại
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-primary">
                  {selectedRow.rejectedReason}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </DetailDialog>
    </PageFrame>
  );
}
