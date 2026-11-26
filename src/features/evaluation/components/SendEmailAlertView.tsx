"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { CheckSquare, Mail, RefreshCw, Send } from "lucide-react";
import {
  AppButton,
  AppCheckbox,
  AppEmptyState,
  AppSelect,
  CompanyChip,
  DataTable,
  EvaluationStatusBadge,
  FilterBar,
  InlineErrorBanner,
  PageFrame,
  PageHeader,
  PeriodBadgeCell,
  UserIdentityCell,
  proportional,
  useAppToast,
  type ActiveFilterChip,
  type SelectOption,
  type TableColumn,
} from "@/components/ds";
import { formatEvaluationStatusLabel } from "@/design-system/registries";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import type { PagedResult } from "@/server/api/types";
import {
  emailAlertApi,
  type EmailAlertItem,
  type EmailAlertRecipient,
} from "../services/emailAlertApi";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import type { EvaluationTypeOption } from "../types";

interface AppliedEmailAlertQuery {
  evaluationTypeId: number;
  periodId: number;
  status: number;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

function RecipientChipList({ recipients }: { recipients: EmailAlertRecipient[] }) {
  if (recipients.length === 0) {
    return <span className="text-xs text-secondary">—</span>;
  }

  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Người nhận email">
      {recipients.map((recipient) => {
        const displayName = recipient.userName || recipient.fullName || recipient.userIdStr;
        const tooltip = [
          displayName,
          recipient.systemCode && `(${recipient.systemCode})`,
          recipient.status && `· ${formatEvaluationStatusLabel(recipient.status, " / ")}`,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <li key={recipient.id} className="max-w-full">
            <span className="ds-recipient-chip" title={tooltip || undefined}>
              <Mail className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
              <span className="truncate">{displayName}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SendEmailAlertView() {
  const showToast = useAppToast();

  const [isMobile, setIsMobile] = useState(false);
  const [types, setTypes] = useState<EvaluationTypeOption[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [typesRevision, setTypesRevision] = useState(0);

  const [typeId, setTypeId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [status, setStatus] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const [statusCodes, setStatusCodes] = useState<number[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusesError, setStatusesError] = useState<string | null>(null);
  const [statusesRevision, setStatusesRevision] = useState(0);

  const [applied, setApplied] = useState<AppliedEmailAlertQuery | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listRevision, setListRevision] = useState(0);

  const [result, setResult] = useState<PagedResult<EmailAlertItem> | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Cross-page selection keyed by String(row.id)
  const [selectedMap, setSelectedMap] = useState<Map<string, EmailAlertItem>>(() => new Map());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // 1. Load evaluation types & nested periods
  useEffect(() => {
    const ctrl = new AbortController();
    setTypesLoading(true);
    setTypesError(null);
    evaluationLookupApi
      .getTypes(ctrl.signal)
      .then((rows) => {
        if (!ctrl.signal.aborted) setTypes(rows);
      })
      .catch((cause: unknown) => {
        if (!isAbortError(cause) && !ctrl.signal.aborted) {
          setTypesError(getErrorMessage(cause, "Không tải được danh sách loại đánh giá."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setTypesLoading(false);
      });
    return () => ctrl.abort();
  }, [typesRevision]);

  const selectedType = useMemo(
    () => types.find((item) => item.id === typeId),
    [typeId, types],
  );
  const periods = useMemo(() => selectedType?.periods ?? [], [selectedType]);
  const selectedPeriod = useMemo(
    () => periods.find((item) => item.id === periodId),
    [periodId, periods],
  );

  // 2. Load active workflow statuses for selected period's active templates
  useEffect(() => {
    setStatusesError(null);
    const templateIds = (selectedPeriod?.templatePeriodDtos ?? [])
      .filter((item) => Boolean(item.isActive))
      .map((item) => item.templateId);

    if (!periodId || templateIds.length === 0) {
      setStatusCodes([]);
      setStatusesLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setStatusesLoading(true);
    emailAlertApi
      .getActiveStatuses(templateIds, ctrl.signal)
      .then((codes) => {
        if (!ctrl.signal.aborted) setStatusCodes(codes);
      })
      .catch((cause: unknown) => {
        if (!isAbortError(cause) && !ctrl.signal.aborted) {
          setStatusCodes([]);
          setStatusesError(getErrorMessage(cause, "Không tải được danh sách trạng thái."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setStatusesLoading(false);
      });
    return () => ctrl.abort();
  }, [periodId, selectedPeriod, statusesRevision]);

  // 3. Load paged email-alert items once filter query is applied
  useEffect(() => {
    if (!applied) return;
    const ctrl = new AbortController();
    setListLoading(true);
    setListError(null);
    setIsUnauthorized(false);

    emailAlertApi
      .getList(
        {
          EvaluationTypeId: applied.evaluationTypeId,
          PeriodId: applied.periodId,
          Statuses: [applied.status],
          PageNumber: page,
          PageSize: pageSize,
        },
        ctrl.signal,
      )
      .then((data) => {
        if (ctrl.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
        if (page > lastPage && data.total > 0) {
          setPage(lastPage);
          return;
        }
        setResult(data);
        setSelectedMap((prev) => {
          if (prev.size === 0) return prev;
          const next = new Map(prev);
          for (const row of data.items) {
            const key = String(row.id);
            if (next.has(key)) next.set(key, row);
          }
          return next;
        });
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause) || ctrl.signal.aborted) return;
        setResult(null);
        setListError(getErrorMessage(cause, "Không tải được danh sách bản đánh giá."));
        setIsUnauthorized(cause instanceof ApiRequestError && cause.status === 401);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setListLoading(false);
      });

    return () => ctrl.abort();
  }, [applied, page, pageSize, listRevision]);

  const items = useMemo(() => result?.items ?? [], [result]);
  const total = result?.total ?? 0;

  const selectedKeys = useMemo(() => new Set(selectedMap.keys()), [selectedMap]);
  const selectedItems = useMemo(() => Array.from(selectedMap.values()), [selectedMap]);
  const selectedCount = selectedItems.length;

  const allPageSelected =
    items.length > 0 && items.every((row) => selectedMap.has(String(row.id)));

  const sendLabel = sending
    ? "Đang gửi..."
    : selectedCount > 0
      ? `Gửi email (${numberFormat.format(selectedCount)})`
      : "Gửi email";

  const typeOptions = useMemo<SelectOption[]>(
    () => types.map((t) => ({ value: t.id, label: t.name })),
    [types],
  );
  const periodOptions = useMemo<SelectOption[]>(
    () => periods.map((p) => ({ value: p.id, label: p.name })),
    [periods],
  );
  const statusOptions = useMemo<SelectOption[]>(
    () =>
      statusCodes.map((code) => ({
        value: String(code),
        label: formatEvaluationStatusLabel(code, " / "),
      })),
    [statusCodes],
  );

  const isFilterDirty = Boolean(
    applied &&
      (String(applied.evaluationTypeId) !== typeId ||
        String(applied.periodId) !== periodId ||
        String(applied.status) !== status),
  );

  const hasAnyFilterState = Boolean(
    typeId || periodId || status || applied || typesError || statusesError,
  );

  const appliedChips = useMemo<ActiveFilterChip[]>(() => {
    if (!applied) return [];
    const appliedType = types.find((t) => Number(t.id) === applied.evaluationTypeId);
    const appliedPeriod = appliedType?.periods.find((p) => Number(p.id) === applied.periodId);
    return [
      {
        key: "query",
        label: [
          appliedType?.name || `Loại #${applied.evaluationTypeId}`,
          appliedPeriod?.name || `Kỳ #${applied.periodId}`,
          formatEvaluationStatusLabel(applied.status, " / "),
        ].join(" · "),
        onRemove: () => {
          setApplied(null);
          setResult(null);
          setListError(null);
          setIsUnauthorized(false);
          setSelectedMap(new Map());
          setPage(1);
        },
      },
    ];
  }, [applied, types]);

  const handleTypeChange = (nextTypeId: string) => {
    setTypeId(nextTypeId);
    setStatus("");
    setShowValidation(false);
    const nextPeriods = types.find((item) => item.id === nextTypeId)?.periods ?? [];
    setPeriodId(nextPeriods.length === 1 ? nextPeriods[0].id : "");
  };

  const handleSearch = () => {
    if (!typeId || !periodId || !status) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setSelectedMap(new Map());
    setPage(1);
    setApplied({
      evaluationTypeId: Number(typeId),
      periodId: Number(periodId),
      status: Number(status),
    });
    setListRevision((v) => v + 1);
  };

  const handleReset = () => {
    setTypeId("");
    setPeriodId("");
    setStatus("");
    setStatusCodes([]);
    setStatusesError(null);
    setShowValidation(false);
    setApplied(null);
    setResult(null);
    setListError(null);
    setIsUnauthorized(false);
    setSelectedMap(new Map());
    setPage(1);
    if (typesError) setTypesRevision((v) => v + 1);
  };

  const handleSelectedKeysChange: React.Dispatch<React.SetStateAction<Set<string>>> = (
    updater,
  ) => {
    if (sending) return;
    setSelectedMap((prev) => {
      const prevKeys = new Set(prev.keys());
      const nextKeys = typeof updater === "function" ? updater(prevKeys) : updater;
      const pageLookup = new Map(items.map((row) => [String(row.id), row]));
      const nextMap = new Map<string, EmailAlertItem>();

      for (const key of nextKeys) {
        const resolved = pageLookup.get(key) ?? prev.get(key);
        if (resolved) nextMap.set(key, resolved);
      }
      return nextMap;
    });
  };

  const toggleSingleRow = (row: EmailAlertItem) => {
    if (sending) return;
    const key = String(row.id);
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, row);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    if (sending || items.length === 0) return;
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (allPageSelected) {
        for (const row of items) next.delete(String(row.id));
      } else {
        for (const row of items) next.set(String(row.id), row);
      }
      return next;
    });
  };

  const handleSendEmails = async () => {
    if (sending || selectedCount === 0) return;
    setSending(true);
    try {
      const response = await emailAlertApi.send(selectedItems);
      if (response.failedCount === 0) {
        showToast(
          "success",
          `Đã gửi email thông báo thành công cho ${response.successCount}/${response.total} bản đánh giá.`,
        );
        setSelectedMap(new Map());
      } else {
        const failedIds = new Set(response.failedEvaluationIds.map(String));
        setSelectedMap((prev) => {
          const next = new Map<string, EmailAlertItem>();
          for (const [key, item] of prev.entries()) {
            if (failedIds.has(key) || failedIds.has(String(item.id))) {
              next.set(key, item);
            }
          }
          return next;
        });
        const detail = response.errors[0] ? ` (${response.errors[0]})` : "";
        showToast(
          response.successCount > 0 ? "warning" : "error",
          `Gửi thành công ${response.successCount}/${response.total}, thất bại ${response.failedCount}${detail}.`,
        );
      }
    } catch (cause: unknown) {
      showToast(
        "error",
        getErrorMessage(cause, "Không gửi được email thông báo. Vui lòng thử lại."),
      );
    } finally {
      setSending(false);
    }
  };

  const columns = useMemo<TableColumn<EmailAlertItem>[]>(
    () => [
      {
        key: "employee",
        header: "Nhân viên",
        width: proportional(1.5, { minWidth: 210 }),
        renderCell: (row) => (
          <UserIdentityCell
            name={row.userFullName}
            code={row.systemCode || "—"}
          />
        ),
      },
      {
        key: "company",
        header: "Đơn vị",
        width: proportional(1.6, { minWidth: 220 }),
        renderCell: (row) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <CompanyChip companyCode={row.companyCode} />
            <span
              className="truncate text-xs text-secondary"
              title={row.departmentName ?? undefined}
            >
              {row.departmentName || "—"}
            </span>
          </div>
        ),
      },
      {
        key: "jobPosition",
        header: "Chức vụ",
        width: proportional(1.1, { minWidth: 150 }),
        renderCell: (row) => (
          <span
            className="line-clamp-2 text-sm text-primary"
            title={row.jobPositionName ?? undefined}
          >
            {row.jobPositionName || "—"}
          </span>
        ),
      },
      {
        key: "period",
        header: "Kỳ đánh giá",
        width: proportional(1.1, { minWidth: 155 }),
        renderCell: (row) => (
          <PeriodBadgeCell
            label={row.period}
            sublabel={row.year ? `Năm ${row.year}` : undefined}
          />
        ),
      },
      {
        key: "recipients",
        header: "Người nhận email",
        headerIcon: <Mail className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />,
        width: proportional(1.8, { minWidth: 240 }),
        renderCell: (row) => <RecipientChipList recipients={row.emailRecipients} />,
      },
    ],
    [],
  );

  // Only surface validation on enabled fields to avoid styling disabled selects with overlapping errors.
  const typeError =
    showValidation && !typeId ? "Vui lòng chọn tên bản đánh giá" : undefined;
  const periodError =
    showValidation && Boolean(typeId) && !periodId ? "Vui lòng chọn kỳ đánh giá" : undefined;
  const statusError =
    showValidation && Boolean(typeId) && Boolean(periodId) && !status && !statusesLoading
      ? "Vui lòng chọn trạng thái"
      : undefined;

  const listHeaderSlot = applied ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-semibold text-primary">Danh sách bản đánh giá</span>
        {result ? (
          <span className="ds-count-pill">{numberFormat.format(total)}</span>
        ) : null}
        <EvaluationStatusBadge status={applied.status} compact />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {result ? (
          <span className="text-xs font-medium text-secondary" role="status" aria-live="polite">
            {selectedCount > 0
              ? `Đã chọn ${numberFormat.format(selectedCount)} / ${numberFormat.format(total)}`
              : `${numberFormat.format(items.length)} bản đánh giá đang hiển thị`}
          </span>
        ) : null}

        {isMobile && items.length > 0 ? (
          <AppButton
            label={allPageSelected ? "Bỏ chọn trang" : "Chọn cả trang"}
            variant="secondary"
            size="sm"
            icon={<CheckSquare className="h-3.5 w-3.5" />}
            isDisabled={sending || listLoading}
            onClick={toggleAllOnPage}
          />
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <PageFrame>
      <PageHeader
        artwork="evaluation"
        icon={<Mail className="h-5 w-5" />}
        eyebrow="Quản trị · Gửi email nhắc duyệt theo trạng thái"
        title="Gửi email thông báo"
        description="Lọc đúng kỳ duyệt và trạng thái hồ sơ để gửi email nhắc nhở tới đúng người nhận."
        badge={
          applied && result ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-subtle px-2.5 py-0.5 text-xs font-semibold text-blue-vivid">
              <Mail className="h-3.5 w-3.5" />
              {numberFormat.format(total)} bản đánh giá
            </span>
          ) : undefined
        }
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              isDisabled={typesLoading || listLoading || sending}
              onClick={() => {
                if (applied) {
                  setListRevision((v) => v + 1);
                } else {
                  setTypesRevision((v) => v + 1);
                }
              }}
            />
            <AppButton
              label={sendLabel}
              variant="primary"
              icon={<Send className="h-4 w-4" />}
              isLoading={sending}
              isDisabled={sending || selectedCount === 0}
              onClick={() => void handleSendEmails()}
            />
          </>
        }
      />

      <FilterBar
        primaryControls={
          <>
            <div className="w-full sm:min-w-[220px] sm:flex-1">
              <AppSelect
                label="Tên bản đánh giá"
                value={typeId}
                onChange={handleTypeChange}
                options={typeOptions}
                placeholder={typesLoading ? "Đang tải loại đánh giá..." : "Chọn tên bản đánh giá"}
                isRequired
                isDisabled={typesLoading || sending}
                error={typeError}
              />
            </div>

            <div className="w-full sm:min-w-[200px] sm:flex-1">
              <AppSelect
                label="Kỳ đánh giá"
                value={periodId}
                onChange={(val) => {
                  setPeriodId(val);
                  setStatus("");
                  setShowValidation(false);
                }}
                options={periodOptions}
                placeholder={typeId ? "Chọn kỳ đánh giá" : "Chọn bản đánh giá trước"}
                isRequired
                isDisabled={!typeId || sending}
                disabledMessage="Chọn tên bản đánh giá trước"
                error={periodError}
              />
            </div>

            <div className="w-full sm:min-w-[220px] sm:flex-1">
              <AppSelect
                label="Trạng thái"
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  setShowValidation(false);
                }}
                options={statusOptions}
                placeholder={
                  statusesLoading
                    ? "Đang tải trạng thái..."
                    : !periodId
                      ? "Chọn kỳ đánh giá trước"
                      : statusCodes.length === 0 && !statusesError
                        ? "Chưa có trạng thái hoạt động"
                        : "Chọn trạng thái"
                }
                isRequired
                isDisabled={!periodId || statusesLoading || sending}
                disabledMessage={!periodId ? "Chọn kỳ đánh giá trước" : undefined}
                error={statusError}
              />
            </div>
          </>
        }
        applyLabel={listLoading ? "Đang tải..." : "Xem danh sách"}
        onApply={handleSearch}
        onReset={hasAnyFilterState ? handleReset : undefined}
        isApplyDisabled={typesLoading || statusesLoading || listLoading || sending}
        isDirty={isFilterDirty && !showValidation}
        chips={appliedChips}
      />

      {typesError ? (
        <InlineErrorBanner
          message={typesError}
          onRetry={() => setTypesRevision((v) => v + 1)}
        />
      ) : null}

      {statusesError ? (
        <InlineErrorBanner
          message={statusesError}
          onRetry={() => setStatusesRevision((v) => v + 1)}
        />
      ) : null}

      {!applied ? (
        <Card padding={6} elevation="low">
          <AppEmptyState
            icon={<Mail className="h-6 w-6" />}
            title="Chọn điều kiện để xem danh sách"
            description="Chọn tên bản đánh giá, kỳ đánh giá và trạng thái phía trên rồi bấm Xem danh sách."
          />
        </Card>
      ) : (
        <DataTable
          data={items}
          columns={columns}
          idKey={(row) => String(row.id)}
          viewMode={isMobile ? "grid" : "table"}
          isLoading={listLoading}
          error={listError}
          isUnauthorized={isUnauthorized}
          loginNextPath="/admin/sendEmailAlert"
          onRetry={() => setListRevision((v) => v + 1)}
          emptyTitle="Chưa có bản đánh giá phù hợp"
          emptyDescription="Không tìm thấy bản đánh giá cần gửi email thông báo ở trạng thái đã chọn."
          headerSlot={listHeaderSlot}
          renderCard={(row) => {
            const checked = selectedMap.has(String(row.id));
            const employeeName = row.userFullName || "—";
            return (
              <Card padding={4} elevation="low">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2.5 border-b border-border pb-3">
                    <div className="min-w-0 flex-1">
                      <UserIdentityCell name={employeeName} code={row.systemCode || "—"} />
                    </div>
                    <AppCheckbox
                      label={`Chọn bản đánh giá của ${employeeName}`}
                      isLabelHidden
                      value={checked}
                      isDisabled={sending}
                      onChange={() => toggleSingleRow(row)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <CompanyChip companyCode={row.companyCode} />
                      <span className="break-words text-xs text-secondary">
                        {row.departmentName || "—"}
                      </span>
                      {row.jobPositionName ? (
                        <span className="text-xs font-medium text-primary">
                          {row.jobPositionName}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <PeriodBadgeCell
                        label={row.period}
                        sublabel={row.year ? `Năm ${row.year}` : undefined}
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-2.5">
                    <div className="mb-1.5 text-xs font-semibold text-secondary">
                      Người nhận email
                    </div>
                    <RecipientChipList recipients={row.emailRecipients} />
                  </div>
                </div>
              </Card>
            );
          }}
          selection={{
            selectedKeys,
            onSelectedKeysChange: handleSelectedKeysChange,
            getIsItemEnabled: () => !sending,
            selectionLabel: () => "bản đánh giá đã chọn",
            actions: (
              <>
                {!allPageSelected && items.length > 0 ? (
                  <AppButton
                    label="Chọn cả trang"
                    variant="secondary"
                    size="sm"
                    icon={<CheckSquare className="h-3.5 w-3.5" />}
                    isDisabled={sending}
                    onClick={toggleAllOnPage}
                  />
                ) : null}
                <AppButton
                  label={sendLabel}
                  variant="primary"
                  size="sm"
                  icon={<Send className="h-3.5 w-3.5" />}
                  isLoading={sending}
                  isDisabled={sending || selectedCount === 0}
                  onClick={() => void handleSendEmails()}
                />
              </>
            ),
          }}
          pagination={{
            page,
            pageSize,
            totalItems: total,
            pageSizeOptions: [10, 20, 50],
            onPageChange: setPage,
            onPageSizeChange: (nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            },
            itemLabel: "bản đánh giá",
          }}
        />
      )}
    </PageFrame>
  );
}
