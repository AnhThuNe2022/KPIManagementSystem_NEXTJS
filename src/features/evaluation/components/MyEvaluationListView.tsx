"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Eye, Pencil, Plus, RefreshCw } from "lucide-react";
import {
  AppButton,
  ApproverTimeCell,
  AppSearchInput,
  DataTable,
  EvaluationStatusBadge,
  PageFrame,
  PageHeader,
  PeriodBadgeCell,
  StatusFilterTabs,
  pixel,
  proportional,
  type TableColumn,
} from "@/components/ds";
import {
  isEditableEvaluationStatus,
  resolveEvaluationStatus,
} from "@/design-system/registries";
import { formatDate, normalizeVietnamese } from "@/lib/format/formatters";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { evaluationApi } from "../services/evaluationApi";
import type { EvaluationDto } from "../types";

type EvaluationRow = EvaluationDto & Record<string, unknown>;

export function MyEvaluationListView() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    items: EvaluationDto[];
    total: number;
  } | null>(null);

  const [statusGroup, setStatusGroup] = useState("all");
  const [search, setSearch] = useState("");

  const requestKey = `${page}:${pageSize}:${revision}`;

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    evaluationApi
      .getMyPaged({ page, pageSize, signal: ctrl.signal })
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
        setError(getErrorMessage(cause, "Không tải được danh sách bản đánh giá của bạn."));
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

  const groupCounts = useMemo(() => {
    const counts = { all: pageItems.length, waiting: 0, done: 0, other: 0 };
    for (const item of pageItems) {
      const group = resolveEvaluationStatus(item.status).group;
      if (group === "waiting") counts.waiting += 1;
      else if (group === "done") counts.done += 1;
      else counts.other += 1;
    }
    return counts;
  }, [pageItems]);

  const filteredItems = useMemo<EvaluationRow[]>(() => {
    const needle = normalizeVietnamese(search);
    return pageItems.filter((item) => {
      const spec = resolveEvaluationStatus(item.status);
      if (statusGroup === "waiting" && spec.group !== "waiting") return false;
      if (statusGroup === "done" && spec.group !== "done") return false;
      if (statusGroup === "other" && (spec.group === "waiting" || spec.group === "done")) return false;
      if (needle) {
        const hay = [item.templateName, item.period, spec.label]
          .map(normalizeVietnamese)
          .join(" ");
        if (!hay.includes(needle)) return false;
      }
      return true;
    }) as EvaluationRow[];
  }, [pageItems, search, statusGroup]);

  const columns: TableColumn<EvaluationRow>[] = [
    {
      key: "period",
      header: "Loại kỳ",
      width: pixel(170),
      renderCell: (row) => <PeriodBadgeCell label={row.period} />,
    },
    {
      key: "templateName",
      header: "Tên bản đánh giá",
      width: proportional(2.2, { minWidth: 220 }),
      renderCell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-primary">
            {row.templateName || `Phiếu đánh giá #${row.id}`}
          </span>
          {row.departmentName ? (
            <span className="text-xs text-secondary">{row.departmentName}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "submitDate",
      header: "Ngày nộp",
      width: pixel(160),
      renderCell: (row) => <ApproverTimeCell timestamp={formatDate(row.submitDate)} />,
    },
    {
      key: "status",
      header: "Trạng thái",
      width: proportional(1.4, { minWidth: 190 }),
      renderCell: (row) => <EvaluationStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "end",
      width: pixel(248),
      renderCell: (row) => (
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {/* Preserve exact legacy routes per user decision */}
          <AppButton
            label="Xem"
            variant="secondary"
            size="sm"
            icon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => router.push(`/evaluationDetail/${row.id}`)}
          />
          {isEditableEvaluationStatus(row.status) ? (
            <AppButton
              label="Cập nhật"
              variant="primary"
              size="sm"
              icon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() =>
                router.push(`/kpievaluation/${row.evalPeriodTemplateId ?? row.id}`)
              }
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <PageFrame>
      <PageHeader
        artwork="evaluation"
        icon={<ClipboardCheck className="h-5 w-5" />}
        eyebrow="Hồ sơ cá nhân"
        title="Đánh giá của tôi"
        description="Theo dõi tiến trình tự đánh giá KPI và trạng thái phê duyệt các kỳ của bạn."
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setRevision((v) => v + 1)}
            />
            <AppButton
              label="Tạo bản đánh giá"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/kpievaluation")}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-sm">
        <StatusFilterTabs
          label="Nhóm trạng thái"
          value={statusGroup}
          onChange={setStatusGroup}
          items={[
            { value: "all", label: "Tất cả", count: groupCounts.all },
            { value: "waiting", label: "Đang xử lý", count: groupCounts.waiting },
            { value: "done", label: "Hoàn thành", count: groupCounts.done },
            { value: "other", label: "Khác / Nháp", count: groupCounts.other },
          ]}
        />
        <div className="w-full sm:w-80">
          <AppSearchInput
            label="Tìm bản đánh giá"
            placeholder="Tìm theo kỳ, biểu mẫu hoặc trạng thái..."
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      <DataTable
        data={filteredItems}
        columns={columns}
        idKey={(row) => String(row.id)}
        isLoading={loading}
        error={error}
        isUnauthorized={unauthorized}
        loginNextPath="/my-evaluation"
        onRetry={() => setRevision((v) => v + 1)}
        emptyTitle="Chưa có bản đánh giá nào"
        emptyDescription="Bạn chưa có bản đánh giá KPI nào khớp với bộ lọc hiện tại."
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
          itemLabel: "bản đánh giá",
        }}
      />
    </PageFrame>
  );
}
