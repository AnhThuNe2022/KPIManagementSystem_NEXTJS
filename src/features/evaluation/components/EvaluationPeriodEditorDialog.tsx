"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Calendar, Clock, FileText, Layers, X } from "lucide-react";
import {
  ActiveStatus,
  AppDateInput,
  AppForm,
  AppIconButton,
  AppMultiSelect,
  AppNumberInput,
  AppSelect,
  AppSwitch,
  AppTextInput,
  FormDialog,
  LoadingOverlay,
  PeriodTypeBadge,
  TagBadge,
  useAppToast,
  type SelectOption,
} from "@/components/ds";
import {
  PERIOD_STATUS_REGISTRY,
  PERIOD_TYPE_REGISTRY,
  normalizePeriodType,
} from "@/design-system/registries";
import { toDateInputValue } from "@/lib/format/formatters";
import { getErrorMessage, isAbortError } from "@/lib/http/request";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import {
  evaluationPeriodApi,
  type EvaluationPeriodDraft,
} from "../services/evaluationPeriodApi";
import type { EvaluationPeriodDto, EvaluationTemplateDto, EvaluationTypeOption } from "../types";

const PERIOD_TYPE_OPTIONS: SelectOption[] = [
  { value: "Month", label: PERIOD_TYPE_REGISTRY.Month.label },
  { value: "Quarter", label: PERIOD_TYPE_REGISTRY.Quarter.label },
  { value: "HaftYear", label: PERIOD_TYPE_REGISTRY.HaftYear.label },
  { value: "Year", label: PERIOD_TYPE_REGISTRY.Year.label },
  { value: "None", label: PERIOD_TYPE_REGISTRY.None.label },
];

const STATUS_PERIOD_OPTIONS: SelectOption[] = Object.entries(PERIOD_STATUS_REGISTRY).map(
  ([key, spec]) => ({
    value: key,
    label: spec.label,
  }),
);

function parseStatusPeriodCode(raw: number | string | null | undefined): number {
  if (typeof raw === "number" && raw in PERIOD_STATUS_REGISTRY) return raw;
  const lower = String(raw ?? "").trim().toLowerCase();
  if (lower === "open" || lower === "active" || lower === "1") return 1;
  if (lower === "locked" || lower === "2") return 2;
  if (lower === "closed" || lower === "3") return 3;
  return 0;
}

function createInitialDraft(period?: EvaluationPeriodDto | null): EvaluationPeriodDraft {
  const nowYear = new Date().getFullYear();
  if (!period) {
    return {
      name: "",
      periodType: "Month",
      evaluationTypeId: null,
      year: nowYear,
      month: new Date().getMonth() + 1,
      quarter: null,
      startDate: null,
      endDate: null,
      statusPeriod: 1,
      isActive: true,
      templateIds: [],
    };
  }

  const fromDtos = Array.isArray(period.templatePeriodDtos)
    ? period.templatePeriodDtos.map((d) => d.templateId)
    : [];
  const fromList = Array.isArray(period.listTemplateId) ? period.listTemplateId : [];
  const templateIds =
    fromDtos.length > 0
      ? fromDtos
      : fromList.length > 0
        ? fromList
        : period.templateId
          ? [period.templateId]
          : [];

  return {
    id: period.id,
    name: period.name ?? "",
    periodType: normalizePeriodType(period.periodType),
    evaluationTypeId: period.evaluationTypeId ?? null,
    year: period.year ?? nowYear,
    month: period.month ?? null,
    quarter: period.quarter ?? null,
    startDate: toDateInputValue(period.startDate) || null,
    endDate: toDateInputValue(period.endDate) || null,
    statusPeriod: parseStatusPeriodCode(period.statusPeriod),
    isActive: period.isActive ?? true,
    templateIds: Array.from(new Set(templateIds.map(Number).filter((n) => n > 0))),
  };
}

export function EvaluationPeriodEditorDialog({
  isOpen,
  editingId,
  fallbackPeriod,
  onOpenChange,
  onSaved,
}: {
  isOpen: boolean;
  editingId: number | null;
  fallbackPeriod: EvaluationPeriodDto | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [types, setTypes] = useState<EvaluationTypeOption[]>([]);
  const [templates, setTemplates] = useState<EvaluationTemplateDto[]>([]);
  const [attachedTemplates, setAttachedTemplates] = useState<
    Array<{ templateId: number; templateName: string }>
  >([]);
  const [draft, setDraft] = useState<EvaluationPeriodDraft>(() => createInitialDraft(null));
  const [initialSerialized, setInitialSerialized] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const ctrl = new AbortController();
    setLoading(true);
    setLoadError(null);
    setErrors({});

    Promise.all([
      evaluationLookupApi.getTypes(ctrl.signal),
      evaluationPeriodApi.getTemplates(ctrl.signal),
      editingId ? evaluationPeriodApi.getById(editingId, ctrl.signal) : Promise.resolve(null),
    ])
      .then(([typeList, templateList, detail]) => {
        if (ctrl.signal.aborted) return;
        setTypes(typeList);
        setTemplates(templateList);
        const source = detail ?? fallbackPeriod;
        setAttachedTemplates(source?.templatePeriodDtos ?? []);
        const nextDraft = createInitialDraft(source);
        setDraft(nextDraft);
        setInitialSerialized(JSON.stringify(nextDraft));
      })
      .catch((cause) => {
        if (!isAbortError(cause)) {
          setLoadError(getErrorMessage(cause, "Không tải được dữ liệu kỳ đánh giá."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [editingId, fallbackPeriod, isOpen]);

  const isDirty = useMemo(
    () => Boolean(initialSerialized) && JSON.stringify(draft) !== initialSerialized,
    [draft, initialSerialized],
  );

  const typeOptions = useMemo<SelectOption[]>(() => {
    const map = new Map<string, SelectOption>();
    for (const t of types) {
      map.set(t.id, { value: t.id, label: t.name });
    }
    if (draft.evaluationTypeId && !map.has(String(draft.evaluationTypeId))) {
      map.set(String(draft.evaluationTypeId), {
        value: String(draft.evaluationTypeId),
        label: `Loại đánh giá #${draft.evaluationTypeId}`,
      });
    }
    return Array.from(map.values());
  }, [draft.evaluationTypeId, types]);

  const templateOptions = useMemo<SelectOption[]>(() => {
    const map = new Map<string, SelectOption>();
    for (const tpl of templates) {
      map.set(String(tpl.id), {
        value: String(tpl.id),
        label: tpl.templateCode ? `${tpl.templateCode} — ${tpl.templateName}` : tpl.templateName,
      });
    }
    for (const att of attachedTemplates) {
      if (!map.has(String(att.templateId))) {
        map.set(String(att.templateId), {
          value: String(att.templateId),
          label: att.templateName || `Biểu mẫu #${att.templateId}`,
        });
      }
    }
    for (const tid of draft.templateIds) {
      if (!map.has(String(tid))) {
        map.set(String(tid), { value: String(tid), label: `Biểu mẫu #${tid}` });
      }
    }
    return Array.from(map.values());
  }, [attachedTemplates, draft.templateIds, templates]);

  const durationDays = useMemo(() => {
    if (!draft.startDate || !draft.endDate) return null;
    const start = new Date(`${draft.startDate}T00:00:00`);
    const end = new Date(`${draft.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [draft.endDate, draft.startDate]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = "Vui lòng nhập tên kỳ đánh giá.";
    if (!draft.periodType) next.periodType = "Vui lòng chọn loại kỳ.";
    if (!draft.evaluationTypeId) next.evaluationTypeId = "Vui lòng chọn loại đánh giá.";
    if (draft.year !== null && (draft.year < 1 || draft.year > 9999)) {
      next.year = "Năm phải từ 1 đến 9999.";
    }
    if (draft.periodType === "Month" && draft.month !== null && (draft.month < 1 || draft.month > 12)) {
      next.month = "Tháng phải từ 1 đến 12.";
    }
    if (draft.periodType === "Quarter" && draft.quarter !== null && (draft.quarter < 1 || draft.quarter > 4)) {
      next.quarter = "Quý phải từ 1 đến 4.";
    }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      next.endDate = "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.";
    }
    if (draft.templateIds.length === 0) {
      next.templateIds = "Vui lòng chọn ít nhất một biểu mẫu KPI.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await evaluationPeriodApi.save(draft);
      toast(
        "success",
        editingId ? "Cập nhật kỳ đánh giá thành công." : "Tạo mới kỳ đánh giá thành công.",
      );
      onSaved();
      onOpenChange(false);
    } catch (cause) {
      toast("error", getErrorMessage(cause, "Không thể lưu kỳ đánh giá."));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTemplateItems = useMemo(() => {
    const labelMap = new Map(templateOptions.map((opt) => [opt.value, opt.label]));
    return draft.templateIds.map((id) => ({
      id,
      label: labelMap.get(String(id)) ?? `Biểu mẫu #${id}`,
    }));
  }, [draft.templateIds, templateOptions]);

  const removeTemplateId = (idToRemove: number) => {
    setDraft((p) => ({
      ...p,
      templateIds: p.templateIds.filter((id) => id !== idToRemove),
    }));
  };

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="ds-section-icon" data-tone="blue" aria-hidden="true">
            <Calendar className="h-4 w-4" />
          </span>
          <span>{editingId ? "Chỉnh sửa kỳ đánh giá KPI" : "Thêm kỳ đánh giá mới"}</span>
          <PeriodTypeBadge periodType={draft.periodType} />
        </div>
      }
      subtitle={
        editingId
          ? `Mã kỳ #${editingId} · Thiết lập chu kỳ, thời gian hiệu lực và danh sách biểu mẫu áp dụng.`
          : "Thiết lập chu kỳ, thời gian hiệu lực và danh sách biểu mẫu áp dụng."
      }
      headerEndContent={<ActiveStatus isActive={draft.isActive} />}
      width={920}
      isDirty={isDirty}
      isSubmitting={submitting}
      submitLabel={editingId ? "Lưu thay đổi" : "Tạo kỳ đánh giá"}
      submitDisabled={loading || Boolean(loadError) || (Boolean(editingId) && !isDirty)}
      onSubmit={handleSubmit}
      extraFooter={
        <span className="hidden text-xs text-secondary sm:inline">
          Nhấn{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-primary">
            Esc
          </kbd>{" "}
          để đóng nhanh hộp thoại
        </span>
      }
    >
      {loading ? (
        <LoadingOverlay label="Đang tải cấu hình kỳ đánh giá..." />
      ) : loadError ? (
        <Banner status="error" title="Lỗi tải dữ liệu" description={loadError} />
      ) : (
        <AppForm>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            {/* LEFT COLUMN: General Info + Schedule */}
            <div className="flex flex-col gap-4">
              <section className="ds-form-section flex flex-col gap-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="ds-section-icon" data-tone="blue" aria-hidden="true">
                    <Layers className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-primary">Thông tin chung</h3>
                </div>

                <AppTextInput
                  label="Tên kỳ đánh giá"
                  value={draft.name}
                  onChange={(v) => setDraft((p) => ({ ...p, name: v }))}
                  placeholder="Ví dụ: Đánh giá mức độ hoàn thành công việc tháng 11/2026"
                  isRequired
                  error={errors.name}
                />

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <AppSelect
                    label="Loại kỳ"
                    options={PERIOD_TYPE_OPTIONS}
                    value={draft.periodType}
                    onChange={(v) =>
                      setDraft((p) => ({
                        ...p,
                        periodType: v || "Month",
                        month: v === "Month" ? (p.month ?? new Date().getMonth() + 1) : null,
                        quarter: v === "Quarter" ? (p.quarter ?? 1) : null,
                      }))
                    }
                    hasClear={false}
                    isRequired
                    error={errors.periodType}
                  />

                  <AppSelect
                    label="Loại đánh giá"
                    options={typeOptions}
                    value={draft.evaluationTypeId ? String(draft.evaluationTypeId) : ""}
                    onChange={(v) =>
                      setDraft((p) => ({ ...p, evaluationTypeId: v ? Number(v) : null }))
                    }
                    placeholder="Chọn loại đánh giá..."
                    isRequired
                    error={errors.evaluationTypeId}
                  />
                </div>
              </section>

              <section className="ds-form-section flex flex-col gap-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="ds-section-icon" data-tone="cyan" aria-hidden="true">
                      <Clock className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-bold text-primary">Chu kỳ & Thời gian hiệu lực</h3>
                  </div>
                  {durationDays !== null ? (
                    <TagBadge tone="blue" label={`${durationDays} ngày`} />
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <AppNumberInput
                    label="Năm"
                    value={draft.year}
                    onChange={(v) => setDraft((p) => ({ ...p, year: v }))}
                    min={1}
                    max={9999}
                    error={errors.year}
                  />

                  {draft.periodType === "Month" ? (
                    <AppNumberInput
                      label="Tháng"
                      value={draft.month}
                      onChange={(v) => setDraft((p) => ({ ...p, month: v }))}
                      min={1}
                      max={12}
                      error={errors.month}
                    />
                  ) : draft.periodType === "Quarter" ? (
                    <AppNumberInput
                      label="Quý"
                      value={draft.quarter}
                      onChange={(v) => setDraft((p) => ({ ...p, quarter: v }))}
                      min={1}
                      max={4}
                      error={errors.quarter}
                    />
                  ) : (
                    <AppSelect
                      label="Trạng thái kỳ đánh giá"
                      options={STATUS_PERIOD_OPTIONS}
                      value={String(draft.statusPeriod)}
                      onChange={(v) => setDraft((p) => ({ ...p, statusPeriod: Number(v || 0) }))}
                      hasClear={false}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <AppDateInput
                    label="Bắt đầu"
                    value={draft.startDate ?? ""}
                    onChange={(v) => setDraft((p) => ({ ...p, startDate: v || null }))}
                  />

                  <AppDateInput
                    label="Kết thúc"
                    value={draft.endDate ?? ""}
                    min={draft.startDate ?? undefined}
                    onChange={(v) => setDraft((p) => ({ ...p, endDate: v || null }))}
                    error={errors.endDate}
                  />
                </div>

                {draft.periodType === "Month" || draft.periodType === "Quarter" ? (
                  <AppSelect
                    label="Trạng thái kỳ đánh giá"
                    options={STATUS_PERIOD_OPTIONS}
                    value={String(draft.statusPeriod)}
                    onChange={(v) => setDraft((p) => ({ ...p, statusPeriod: Number(v || 0) }))}
                    hasClear={false}
                  />
                ) : null}
              </section>
            </div>

            {/* RIGHT COLUMN: Templates + Active Status */}
            <div className="flex flex-col gap-4">
              <section className="ds-form-section ds-form-section--tinted flex flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="ds-section-icon mt-0.5" data-tone="purple" aria-hidden="true">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-primary">
                        Biểu mẫu áp dụng <span className="text-error">*</span>
                      </h3>
                      <p className="text-xs text-secondary">
                        Chọn một hoặc nhiều mẫu KPI cho kỳ
                      </p>
                    </div>
                  </div>
                  <span className="ds-count-pill">{draft.templateIds.length} đã chọn</span>
                </div>

                <AppMultiSelect
                  label="Biểu mẫu KPI áp dụng"
                  isLabelHidden
                  options={templateOptions}
                  value={draft.templateIds.map(String)}
                  onChange={(vals) =>
                    setDraft((p) => ({
                      ...p,
                      templateIds: vals.map(Number).filter((n) => Number.isFinite(n) && n > 0),
                    }))
                  }
                  placeholder="Tìm & chọn biểu mẫu..."
                  isRequired
                  error={errors.templateIds}
                />

                {selectedTemplateItems.length === 0 ? (
                  <div className="ds-empty-dropzone">
                    <FileText className="h-5 w-5 text-secondary opacity-70" aria-hidden="true" />
                    <div className="text-xs font-semibold text-primary">
                      Chưa gắn biểu mẫu nào
                    </div>
                    <p className="max-w-[240px] text-xs text-secondary">
                      Chọn biểu mẫu ở ô phía trên để gắn vào kỳ đánh giá.
                    </p>
                  </div>
                ) : (
                  <div className="flex max-h-[210px] flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
                    {selectedTemplateItems.map((tpl, idx) => (
                      <div key={tpl.id} className="ds-attached-item">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="ds-company-pill tabular-nums">{idx + 1}</span>
                          <span className="truncate text-xs font-medium text-primary" title={tpl.label}>
                            {tpl.label}
                          </span>
                        </div>
                        <AppIconButton
                          label={`Bỏ biểu mẫu ${tpl.label}`}
                          variant="ghost"
                          size="sm"
                          icon={<X className="h-3.5 w-3.5" />}
                          onClick={() => removeTemplateId(tpl.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="ds-status-card"
                data-active={draft.isActive ? "true" : "false"}
              >
                <AppSwitch
                  label="Trạng thái hoạt động"
                  description={
                    draft.isActive
                      ? "Đang kích hoạt trong hệ thống."
                      : "Đang tạm ngưng áp dụng kỳ đánh giá này."
                  }
                  value={draft.isActive}
                  labelPosition="start"
                  labelSpacing="spread"
                  onChange={(checked) => setDraft((p) => ({ ...p, isActive: checked }))}
                />
              </section>
            </div>
          </div>
        </AppForm>
      )}
    </FormDialog>
  );
}
