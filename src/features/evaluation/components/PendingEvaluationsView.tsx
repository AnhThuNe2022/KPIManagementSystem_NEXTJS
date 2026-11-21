"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { ClipboardList, Eye, RefreshCw, XCircle } from "lucide-react";
import {
  AppButton,
  AppForm,
  ApproverTimeCell,
  AppSelect,
  AppTextArea,
  AppTextInput,
  CompanyChip,
  DataTable,
  DetailDialog,
  EvaluationStatusBadge,
  FilterBar,
  FormDialog,
  PageFrame,
  PageHeader,
  PeriodBadgeCell,
  ScorePairCell,
  UserIdentityCell,
  pixel,
  proportional,
  useAppToast,
  type ActiveFilterChip,
  type SelectOption,
  type TableColumn,
} from "@/components/ds";
import { UserRoleSystem, type ReviewRole } from "@/features/auth/types";
import { formatDateTime, formatScore } from "@/lib/format/formatters";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import { pendingEvaluationApi } from "../services/pendingEvaluationApi";
import type {
  EvaluationTypeOption,
  LookupOption,
  PendingEvaluationDto,
  PendingEvaluationFilters,
} from "../types";

type PendingRow = PendingEvaluationDto & Record<string, unknown>;

const EMPTY_FILTERS: PendingEvaluationFilters = {
  keyword: "",
  companyId: "",
  departmentId: "",
  typeId: "",
  periodId: "",
};

const SORT_OPTIONS: SelectOption[] = [
  { value: "submittedDate_desc", label: "Ngày nộp: Mới nhất" },
  { value: "submittedDate_asc", label: "Ngày nộp: Cũ nhất" },
  { value: "employee_asc", label: "Nhân viên: A → Z" },
  { value: "employee_desc", label: "Nhân viên: Z → A" },
];

function rowSelectionKey(item: PendingEvaluationDto): string {
  return `${item.id}:${item.stepId}`;
}

export function PendingEvaluationsView({ level }: { level: ReviewRole }) {
  const hr = level === UserRoleSystem.HR;
  const toast = useAppToast();

  const [filters, setFilters] = useState<PendingEvaluationFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<PendingEvaluationFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState("submittedDate_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [revision, setRevision] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [companies, setCompanies] = useState<LookupOption[]>([]);
  const [departments, setDepartments] = useState<LookupOption[]>([]);
  const [periods, setPeriods] = useState<LookupOption[]>([]);
  const [evaluationTypes, setEvaluationTypes] = useState<EvaluationTypeOption[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [deptLoading, setDeptLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    items: PendingEvaluationDto[];
    total: number;
  } | null>(null);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [previewItem, setPreviewItem] = useState<PendingEvaluationDto | null>(null);
  const [rejectTargets, setRejectTargets] = useState<PendingEvaluationDto[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // Load companies, periods, and (HR only) types
  useEffect(() => {
    const ctrl = new AbortController();
    setLookupError(null);
    Promise.allSettled([
      evaluationLookupApi.getCompanies(level, ctrl.signal),
      evaluationLookupApi.getPeriods(ctrl.signal),
      hr ? evaluationLookupApi.getTypes(ctrl.signal) : Promise.resolve([]),
    ]).then(([compRes, periodRes, typeRes]) => {
      if (ctrl.signal.aborted) return;
      setCompanies(compRes.status === "fulfilled" ? compRes.value : []);
      setPeriods(periodRes.status === "fulfilled" ? periodRes.value : []);
      setEvaluationTypes(typeRes.status === "fulfilled" ? typeRes.value : []);
      const failed = [compRes, periodRes, typeRes].find((r) => r.status === "rejected");
      if (failed && failed.status === "rejected" && !isAbortError(failed.reason)) {
        setLookupError(getErrorMessage(failed.reason, "Chưa tải được đầy đủ bộ lọc."));
      }
    });
    return () => ctrl.abort();
  }, [hr, level]);

  // Load departments when companyId changes (with AbortController race guard)
  useEffect(() => {
    if (!filters.companyId) {
      setDepartments([]);
      setDeptLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setDeptLoading(true);
    evaluationLookupApi
      .getDepartments(filters.companyId, level, ctrl.signal)
      .then((list) => {
        if (!ctrl.signal.aborted) setDepartments(list);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setDepartments([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setDeptLoading(false);
      });
    return () => ctrl.abort();
  }, [filters.companyId, level]);

  const requestKey = JSON.stringify({ level, page, pageSize, sortBy, applied, revision });

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    setSelectedKeys(new Set());

    pendingEvaluationApi
      .get({
        page,
        pageSize,
        level,
        filters: applied,
        sortBy,
        signal: ctrl.signal,
      })
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
        setError(getErrorMessage(cause, "Không tải được danh sách hồ sơ chờ duyệt."));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [applied, level, page, pageSize, requestKey, sortBy]);

  const items = useMemo(
    () => (snapshot?.key === requestKey ? snapshot.items : []),
    [requestKey, snapshot],
  );
  const totalItems = snapshot?.key === requestKey ? snapshot.total : 0;

  // HR period filtering intersected with active periods when typeId chosen
  const availablePeriods = useMemo(() => {
    if (!hr || !filters.typeId) return periods;
    const selectedType = evaluationTypes.find((t) => t.id === filters.typeId);
    if (!selectedType) return periods;
    const activeIds = new Set(periods.map((p) => p.id));
    return selectedType.periods.filter((p) => activeIds.has(p.id));
  }, [evaluationTypes, filters.typeId, hr, periods]);

  const hrPeriodRequiredMissing = hr && Boolean(filters.typeId) && !filters.periodId;

  const handleApply = () => {
    if (hrPeriodRequiredMissing) {
      setAdvancedOpen(true);
      toast("warning", "Vui lòng chọn Kỳ đánh giá khi đã chọn Loại đánh giá.");
      return;
    }
    setPage(1);
    setApplied({ ...filters });
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
    setRevision((v) => v + 1);
  };

  // Both HR (Level 5) and Manager (Level 2) can reject — fixes legacy `if (hr) return;` bug!
  const openRejectDialog = (targets: PendingEvaluationDto[]) => {
    if (targets.length === 0) return;
    setPreviewItem(null);
    setRejectTargets(targets);
    setRejectReason("");
    setRejectError(null);
  };

  const handleSubmitReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError("Vui lòng nhập lý do từ chối.");
      return;
    }
    setRejectError(null);
    setRejecting(true);

    const remaining: PendingEvaluationDto[] = [];
    let completed = 0;
    let firstError: string | null = null;

    for (const target of rejectTargets) {
      try {
        await pendingEvaluationApi.rejectOne({
          id: target.id,
          stepId: target.stepId,
          level,
          comment: rejectReason,
        });
        completed += 1;
      } catch (cause) {
        remaining.push(target);
        if (!firstError) {
          firstError = getErrorMessage(cause, "Không thể từ chối hồ sơ.");
        }
      }
    }

    setRejecting(false);

    if (completed > 0) {
      setRevision((v) => v + 1);
      setSelectedKeys(new Set());
    }

    if (remaining.length === 0) {
      toast("success", `Đã từ chối ${completed} hồ sơ thành công.`);
      setRejectTargets([]);
      setRejectReason("");
    } else {
      setRejectTargets(remaining);
      setRejectError(
        `Đã xử lý ${completed}/${completed + remaining.length} hồ sơ. Còn ${remaining.length} hồ sơ lỗi: ${firstError ?? "Vui lòng thử lại."}`,
      );
    }
  };

  const selectedItems = useMemo(
    () => items.filter((item) => selectedKeys.has(rowSelectionKey(item))),
    [items, selectedKeys],
  );

  const isDirty = JSON.stringify(filters) !== JSON.stringify(applied);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (applied.keyword) {
      chips.push({
        key: "kw",
        label: `Từ khóa: ${applied.keyword}`,
        onRemove: () => {
          const next = { ...applied, keyword: "" };
          setFilters(next);
          setApplied(next);
          setPage(1);
        },
      });
    }
    if (applied.companyId) {
      const name = companies.find((c) => c.id === applied.companyId)?.name ?? applied.companyId;
      chips.push({
        key: "company",
        label: `Công ty: ${name}`,
        onRemove: () => {
          const next = { ...applied, companyId: "", departmentId: "" };
          setFilters(next);
          setApplied(next);
          setPage(1);
        },
      });
    }
    if (applied.departmentId) {
      const name = departments.find((d) => d.id === applied.departmentId)?.name ?? applied.departmentId;
      chips.push({
        key: "dept",
        label: `Phòng ban: ${name}`,
        onRemove: () => {
          const next = { ...applied, departmentId: "" };
          setFilters(next);
          setApplied(next);
          setPage(1);
        },
      });
    }
    if (applied.periodId) {
      const name = periods.find((p) => p.id === applied.periodId)?.name ?? applied.periodId;
      chips.push({
        key: "period",
        label: `Kỳ: ${name}`,
        onRemove: () => {
          const next = { ...applied, typeId: "", periodId: "" };
          setFilters(next);
          setApplied(next);
          setPage(1);
        },
      });
    }
    return chips;
  }, [applied, companies, departments, periods]);

  const columns: TableColumn<PendingRow>[] = [
    {
      key: "userName",
      header: "Nhân viên",
      width: proportional(1.8, { minWidth: 200 }),
      renderCell: (row) => (
        <UserIdentityCell
          name={row.userName}
          subtitle={row.sysTemCode || row.userCode || undefined}
        />
      ),
    },
    {
      key: "companyCode",
      header: "Đơn vị",
      width: proportional(1.5, { minWidth: 180 }),
      renderCell: (row) => (
        <div className="flex flex-col gap-0.5">
          <CompanyChip companyCode={row.companyCode} />
          {row.departmentName ? (
            <span className="truncate text-xs text-secondary">{row.departmentName}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "periodLabel",
      header: "Kỳ đánh giá",
      width: pixel(172),
      renderCell: (row) => <PeriodBadgeCell label={row.periodLabel} />,
    },
    {
      key: "submittedDate",
      header: "Ngày gửi",
      width: pixel(172),
      renderCell: (row) => <ApproverTimeCell timestamp={formatDateTime(row.submittedDate)} />,
    },
    {
      key: "selfScore",
      header: "Điểm tự chấm",
      align: "center",
      width: pixel(135),
      renderCell: (row) => (
        <ScorePairCell primary={formatScore(row.selfScore)} primaryLabel="Tự chấm" />
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      width: proportional(1.4, { minWidth: 185 }),
      renderCell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <EvaluationStatusBadge
            status={row.status}
            isRejected={row.isRejected}
            displayLabel={row.isRejected ? "Bị trả lại" : undefined}
          />
          {row.isRejected && row.reason ? (
            <span className="line-clamp-1 text-xs text-error" title={row.reason}>
              {row.reason}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "end",
      width: pixel(236),
      renderCell: (row) => (
        <div className="flex flex-nowrap items-center justify-end gap-1.5">
          <AppButton
            label="Xem"
            variant="secondary"
            size="sm"
            icon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => setPreviewItem(row)}
          />
          <AppButton
            label="Từ chối"
            variant="destructive"
            size="sm"
            icon={<XCircle className="h-3.5 w-3.5" />}
            onClick={() => openRejectDialog([row])}
          />
        </div>
      ),
    },
  ];

  const loginNextPath = hr ? "/hr/pending" : "/manager/pending";

  return (
    <PageFrame>
      <PageHeader
        artwork="evaluation"
        icon={<ClipboardList className="h-5 w-5" />}
        eyebrow={hr ? "Nhân sự rà soát" : "Đánh giá nhân sự"}
        title={hr ? "Danh sách chờ nhận xét" : "Danh sách NS chờ đánh giá"}
        description={
          hr
            ? "Rà soát hồ sơ KPI nhân sự đang chờ phòng Nhân sự kiểm tra hoặc yêu cầu bổ sung."
            : "Theo dõi và xử lý các hồ sơ KPI đang chờ quản lý đánh giá hoặc trả lại chỉnh sửa."
        }
        actions={
          <AppButton
            label="Làm mới"
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => setRevision((v) => v + 1)}
          />
        }
      />

      {lookupError ? (
        <Banner status="warning" title="Cảnh báo bộ lọc" description={lookupError} />
      ) : null}

      <FilterBar
        advancedOpen={advancedOpen}
        onAdvancedOpenChange={setAdvancedOpen}
        isDirty={isDirty}
        isApplyDisabled={hrPeriodRequiredMissing && availablePeriods.length === 0}
        onApply={handleApply}
        onReset={handleReset}
        chips={activeChips}
        advancedActiveCount={(filters.typeId ? 1 : 0) + (filters.periodId ? 1 : 0)}
        primaryControls={
          <>
            <div className="min-w-[220px] flex-1">
              <AppTextInput
                label="Tìm kiếm"
                type="search"
                startIcon="search"
                placeholder="Tên nhân viên, mã HT, phòng ban..."
                value={filters.keyword}
                onChange={(v) => setFilters((p) => ({ ...p, keyword: v }))}
                onEnter={handleApply}
                maxLength={200}
                hasClear
              />
            </div>
            <div className="w-full sm:w-48">
              <AppSelect
                label="Công ty"
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                value={filters.companyId}
                onChange={(v) => setFilters((p) => ({ ...p, companyId: v, departmentId: "" }))}
                placeholder="Tất cả công ty"
              />
            </div>
            <div className="w-full sm:w-48">
              <AppSelect
                label="Phòng ban"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                value={filters.departmentId}
                onChange={(v) => setFilters((p) => ({ ...p, departmentId: v }))}
                isDisabled={!filters.companyId || deptLoading}
                disabledMessage="Chọn công ty trước"
                placeholder={deptLoading ? "Đang tải..." : "Tất cả phòng ban"}
              />
            </div>
            <div className="w-full sm:w-44">
              <AppSelect
                label="Sắp xếp"
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={(v) => {
                  setSortBy(v || "submittedDate_desc");
                  setPage(1);
                }}
                hasClear={false}
                hasSearch={false}
              />
            </div>
          </>
        }
        advancedControls={
          <>
            {hr ? (
              <AppSelect
                label="Loại đánh giá"
                options={evaluationTypes.map((t) => ({ value: t.id, label: t.name }))}
                value={filters.typeId}
                onChange={(v) => setFilters((p) => ({ ...p, typeId: v, periodId: "" }))}
                placeholder="Tất cả loại"
              />
            ) : null}
            <AppSelect
              label="Kỳ đánh giá"
              options={availablePeriods.map((p) => ({ value: p.id, label: p.name }))}
              value={filters.periodId}
              onChange={(v) => setFilters((p) => ({ ...p, periodId: v }))}
              isRequired={hr && Boolean(filters.typeId)}
              placeholder="Tất cả kỳ"
              error={hrPeriodRequiredMissing ? "Cần chọn kỳ thuộc loại đánh giá đã chọn" : undefined}
            />
          </>
        }
      />

      <DataTable
        data={items as PendingRow[]}
        columns={columns}
        idKey={(row) => rowSelectionKey(row)}
        isLoading={loading}
        error={error}
        isUnauthorized={unauthorized}
        loginNextPath={loginNextPath}
        onRetry={() => setRevision((v) => v + 1)}
        emptyTitle="Không có hồ sơ đang chờ xử lý"
        emptyDescription="Tất cả hồ sơ trong bộ lọc hiện tại đã được xử lý."
        selection={{
          selectedKeys,
          onSelectedKeysChange: setSelectedKeys,
          actions: (
            <>
              {selectedItems.length === 1 ? (
                <AppButton
                  label="Xem bản đánh giá"
                  variant="secondary"
                  size="sm"
                  icon={<Eye className="h-3.5 w-3.5" />}
                  onClick={() => setPreviewItem(selectedItems[0])}
                />
              ) : null}
              <AppButton
                label={`Từ chối (${selectedItems.length})`}
                variant="destructive"
                size="sm"
                icon={<XCircle className="h-3.5 w-3.5" />}
                onClick={() => openRejectDialog(selectedItems)}
              />
            </>
          ),
        }}
        pagination={{
          page,
          pageSize,
          totalItems,
          pageSizeOptions: [10, 20, 50],
          onPageChange: setPage,
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
          itemLabel: "hồ sơ",
        }}
      />

      {/* Preview Dialog */}
      <DetailDialog
        isOpen={Boolean(previewItem)}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null);
        }}
        title={previewItem?.userName || "Chi tiết hồ sơ KPI"}
        subtitle={previewItem?.periodLabel || undefined}
        headerEndContent={
          previewItem ? (
            <EvaluationStatusBadge
              status={previewItem.status}
              isRejected={previewItem.isRejected}
            />
          ) : null
        }
        footer={
          previewItem ? (
            <>
              <AppButton label="Đóng" variant="secondary" onClick={() => setPreviewItem(null)} />
              <AppButton
                label="Từ chối hồ sơ"
                variant="destructive"
                icon={<XCircle className="h-4 w-4" />}
                onClick={() => openRejectDialog([previewItem])}
              />
            </>
          ) : null
        }
      >
        {previewItem ? (
          <MetadataList columns="multi">
            <MetadataListItem label="Mã nhân sự">
              {previewItem.sysTemCode || previewItem.userCode || "—"}
            </MetadataListItem>
            <MetadataListItem label="Công ty">
              <CompanyChip companyCode={previewItem.companyCode} />
            </MetadataListItem>
            <MetadataListItem label="Phòng ban">
              {previewItem.departmentName || "—"}
            </MetadataListItem>
            <MetadataListItem label="Kỳ đánh giá">
              {previewItem.periodLabel || "—"}
            </MetadataListItem>
            <MetadataListItem label="Ngày nộp">
              {formatDateTime(previewItem.submittedDate)}
            </MetadataListItem>
            <MetadataListItem label="Điểm tự đánh giá">
              {formatScore(previewItem.selfScore)}
            </MetadataListItem>
            {previewItem.reason ? (
              <MetadataListItem label="Lý do trả lại trước đó">
                {previewItem.reason}
              </MetadataListItem>
            ) : null}
          </MetadataList>
        ) : null}
      </DetailDialog>

      {/* Reject Dialog (works for both Manager & HR) */}
      <FormDialog
        isOpen={rejectTargets.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTargets([]);
            setRejectReason("");
            setRejectError(null);
          }
        }}
        title={
          rejectTargets.length === 1
            ? `Từ chối hồ sơ của ${rejectTargets[0].userName || "nhân viên"}`
            : `Từ chối ${rejectTargets.length} hồ sơ đã chọn`
        }
        subtitle={`Vai trò xử lý: ${hr ? "HR" : "Quản lý"}`}
        isDirty={Boolean(rejectReason.trim())}
        isSubmitting={rejecting}
        submitLabel="Xác nhận từ chối"
        onSubmit={handleSubmitReject}
      >
        <div className="flex flex-col gap-3">
          {rejectError ? (
            <Banner status="error" title="Không thể hoàn tất từ chối" description={rejectError} />
          ) : null}
          <AppForm>
            <AppTextArea
              label="Lý do từ chối"
              value={rejectReason}
              onChange={(v) => {
                setRejectReason(v);
                if (rejectError) setRejectError(null);
              }}
              placeholder="Nhập rõ nội dung cần nhân viên bổ sung hoặc chỉnh sửa..."
              rows={4}
              isRequired
            />
          </AppForm>
        </div>
      </FormDialog>
    </PageFrame>
  );
}
