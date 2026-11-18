"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  FileTextIcon,
  LayersIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import { isTechnicalError, requestMessage } from "../evaluationDisplay";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import {
  evaluationPeriodApi,
  getPeriodTypeMeta,
  normalizePeriodType,
  PERIOD_TYPE_OPTIONS,
  type EvaluationPeriod,
} from "../services/evaluationPeriodApi";

const inputClass =
  "mt-1 min-h-10 w-full rounded-[10px] border border-[rgb(var(--color-border)/0.45)] bg-[var(--panel-well)] px-3.5 text-sm text-[rgb(var(--color-text))] [box-shadow:var(--panel-recess)] transition placeholder:text-[var(--panel-muted)] focus:border-[rgb(var(--color-brand))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-brand)/0.2)] disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "block text-[13px] font-semibold text-[rgb(var(--color-text))]";

const dateInputValue = (date: string | null) =>
  date && !date.startsWith("0001-") ? date.slice(0, 10) : "";
const datePayload = (date: string) => (date ? date + "T00:00:00" : null);

function durationLabel(start: string, end: string): string | null {
  if (!start || !end) return null;
  const from = new Date(start + "T00:00:00");
  const to = new Date(end + "T00:00:00");
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (!Number.isFinite(days)) return null;
  if (days < 1) return "Ngày kết thúc không hợp lệ";
  return `${days} ngày áp dụng`;
}

function saveErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    if (cause.message === "PERIOD_UPDATE_REJECTED") {
      return "Hệ thống không chấp nhận cập nhật kỳ đánh giá này.";
    }
    if (cause.message === "PERIOD_UPDATE_UNCONFIRMED") {
      return "Chưa xác nhận được kết quả lưu. Hãy kiểm tra lại danh sách trước khi lưu lần nữa.";
    }
    const raw = cause.message.trim();
    if (
      raw &&
      raw !== "UNAUTHORIZED" &&
      raw !== "FORBIDDEN" &&
      raw !== "MISSING_TEMPLATES" &&
      !isTechnicalError(raw)
    ) {
      return raw;
    }
  }
  return requestMessage(cause, "Chưa lưu được kỳ đánh giá. Vui lòng thử lại.");
}

function extractPeriodState(source?: EvaluationPeriod) {
  const { listTemplateId, ...original } = source ?? {
    id: null,
    name: "",
    periodType: "Month",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    quarter: null,
    startDate: null,
    endDate: null,
    isActive: true,
    evaluationTypeId: null,
  };
  const kind = normalizePeriodType(original.periodType);
  const linkedIds =
    listTemplateId?.length
      ? listTemplateId
      : original.templatePeriodDtos?.length
        ? original.templatePeriodDtos.map((link) => link.templateId)
        : original.templateId == null
          ? []
          : [original.templateId];
  return {
    period: { ...original, periodType: kind },
    templateIds: [...new Set(linkedIds.filter((id) => id != null).map(String))],
  };
}

type Props = { period?: EvaluationPeriod; onClose: () => void; onSaved: () => void };

export function EvaluationPeriodEditor({ period, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [options, setOptions] = useState<{
    types: SearchableSelectOption[];
    templates: SearchableSelectOption[];
  }>();
  const [detail, setDetail] = useState<EvaluationPeriod>();
  const [lookupError, setLookupError] = useState("");
  const [initial, setInitial] = useState(() => extractPeriodState(period));
  const [draft, setDraft] = useState(initial.period);
  const [templateIds, setTemplateIds] = useState(initial.templateIds);
  const editingId = period?.id ?? null;
  const editing = editingId != null;
  const ready = Boolean(options) && (!editing || detail != null);
  const active = draft.isActive === true;
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initial.period) ||
    templateIds.join(",") !== initial.templateIds.join(",");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      evaluationLookupApi.getTypes(controller.signal),
      evaluationPeriodApi.getTemplates(controller.signal),
      editingId != null ? evaluationPeriodApi.getById(editingId, controller.signal) : Promise.resolve(undefined),
    ])
      .then(([types, templates, loadedPeriod]) => {
        if (controller.signal.aborted) return;
        setOptions({
          types: types.map((type) => ({ id: String(type.id), name: type.name })),
          templates: templates.map((template) => ({
            id: String(template.id),
            name:
              [template.templateCode, template.templateName].filter(Boolean).join(" · ") ||
              `Biểu mẫu #${template.id}`,
          })),
        });
        if (loadedPeriod) {
          const next = extractPeriodState(loadedPeriod);
          setDetail(loadedPeriod);
          setInitial(next);
          setDraft(next.period);
          setTemplateIds(next.templateIds);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setLookupError(
            requestMessage(
              cause,
              editingId != null
                ? "Chưa tải được chi tiết kỳ đánh giá, loại đánh giá hoặc biểu mẫu."
                : "Chưa tải được loại đánh giá hoặc biểu mẫu.",
            ),
          );
        }
      });
    return () => controller.abort();
  }, [editingId, revision]);

  const sourcePeriod = detail ?? period;
  const types = options?.types ?? [];
  const templateOptions = [...(options?.templates ?? [])];
  for (const id of initial.templateIds) {
    if (!templateOptions.some((option) => option.id === id)) {
      const name = sourcePeriod?.templatePeriodDtos?.find((link) => String(link.templateId) === id)?.templateName;
      templateOptions.push({ id, name: name || `Biểu mẫu #${id} (đã gắn)` });
    }
  }
  const initialTypeId = initial.period.evaluationTypeId;
  const typeOptions =
    initialTypeId != null && !types.some((option) => option.id === String(initialTypeId))
      ? [...types, { id: String(initialTypeId), name: `Loại đánh giá #${initialTypeId}` }]
      : types;
  const kind = draft.periodType ?? "";
  const typeMeta = getPeriodTypeMeta(kind);
  const periodTypeOptions: SearchableSelectOption[] =
    kind && !PERIOD_TYPE_OPTIONS.some((option) => option.id === kind)
      ? [...PERIOD_TYPE_OPTIONS, { id: kind, name: typeMeta?.label ?? kind }]
      : [...PERIOD_TYPE_OPTIONS];
  const startValue = dateInputValue(draft.startDate);
  const endValue = dateInputValue(draft.endDate);
  const rangeSummary = durationLabel(startValue, endValue);
  const invalidRange = Boolean(startValue && endValue && endValue < startValue);

  function patch(fields: Partial<typeof draft>) {
    setError("");
    setDraft((current) => ({ ...current, ...fields }));
  }

  function close() {
    if (saving.current || (dirty && !window.confirm("Bỏ các thay đổi chưa lưu?"))) return;
    dialog.current?.close();
    onClose();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !ready || (editing && !dirty)) return;
    const name = draft.name?.trim();
    if (!name) {
      setError("Vui lòng nhập tên kỳ đánh giá.");
      return;
    }
    if (!kind) {
      setError("Vui lòng chọn loại kỳ.");
      return;
    }
    if (draft.evaluationTypeId == null) {
      setError("Vui lòng chọn loại đánh giá.");
      return;
    }
    if (templateIds.length === 0) {
      setError("Vui lòng chọn ít nhất một biểu mẫu áp dụng.");
      return;
    }
    if (invalidRange) {
      setError("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
      return;
    }

    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await evaluationPeriodApi.save({ ...draft, name }, templateIds.map(Number));
    } catch (cause) {
      setError(saveErrorMessage(cause));
      return;
    } finally {
      saving.current = false;
      setBusy(false);
    }
    dialog.current?.close();
    notify("success", editing ? "Đã cập nhật kỳ đánh giá." : "Đã tạo kỳ đánh giá.");
    onSaved();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="evaluation-period-editor-title"
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-2xl border border-[rgb(var(--color-border)/0.85)] bg-[rgb(var(--color-surface))] p-0 text-[rgb(var(--color-text))] shadow-[var(--shadow-card)] backdrop:bg-slate-950/70"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form onSubmit={save} aria-busy={busy} className="flex max-h-[calc(100dvh-1.5rem)] flex-col">
        <header className="relative overflow-hidden border-b border-[rgb(var(--color-border)/0.85)] bg-gradient-to-br from-[rgb(var(--color-surface))] via-[rgb(var(--color-brand)/0.045)] to-[rgb(var(--deoca-accent-rgb)/0.04)] px-6 py-5 [.dark_&]:via-[rgb(var(--color-brand)/0.12)] [.dark_&]:to-[rgb(var(--deoca-accent-rgb)/0.07)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 h-44 w-72 rounded-full bg-[radial-gradient(circle,rgb(var(--color-brand)/0.14),rgb(var(--deoca-accent-rgb)/0.06)_45%,transparent_72%)]"
          />
          <div className="relative z-10 flex items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[rgb(var(--color-brand)/0.22)] bg-[rgb(var(--color-brand)/0.1)] text-[rgb(var(--color-brand))] [.dark_&]:border-blue-400/25 [.dark_&]:bg-blue-500/15 [.dark_&]:text-blue-300">
              <CalendarIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="mb-1 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[rgb(var(--color-brand))] [.dark_&]:text-blue-300">
                <span className="h-0.5 w-4 rounded-full bg-[rgb(var(--deoca-accent-rgb))]" aria-hidden="true" />
                Danh mục kỳ KPI
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="evaluation-period-editor-title"
                  className="text-lg font-bold tracking-tight text-[rgb(var(--color-text))]"
                >
                  {editing ? "Chỉnh sửa kỳ đánh giá" : "Thêm kỳ đánh giá mới"}
                </h2>
                {typeMeta && (
                  <span className="period-type-badge" data-tone={typeMeta.tone}>
                    <i className="period-type-dot" aria-hidden="true" />
                    {typeMeta.label}
                  </span>
                )}
                <span className={"department-status " + (active ? "active" : "inactive")}>
                  <span className="department-dot" />
                  {active ? "Đang hoạt động" : "Tạm ngưng"}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-[var(--panel-muted)]">
                {editing
                  ? `Kỳ #${editingId} · ${draft.name?.trim() || sourcePeriod?.name || "Chưa đặt tên"}`
                  : "Thiết lập chu kỳ, thời gian hiệu lực và danh sách biểu mẫu áp dụng."}
              </p>
            </div>
            <button
              type="button"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-[rgb(var(--color-border)/0.75)] bg-[rgb(var(--color-surface)/0.7)] text-[var(--panel-muted)] transition hover:border-[rgb(var(--color-brand)/0.4)] hover:text-[rgb(var(--color-text))] disabled:opacity-50"
              aria-label="Đóng form"
              disabled={busy}
              onClick={close}
            >
              <Cross2Icon className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-5">
          <fieldset
            disabled={busy || (editing && !detail)}
            className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch"
          >
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
              <div className="rounded-2xl border border-[rgb(var(--color-border)/0.75)] bg-[rgb(var(--color-page)/0.38)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-[rgb(var(--color-brand)/0.14)] text-[rgb(var(--color-brand))]">
                    <LayersIcon className="size-3.5" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-bold text-[rgb(var(--color-text))]">
                    Thông tin chung
                  </h3>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <label className={labelClass + " sm:col-span-2"}>
                    Tên kỳ đánh giá <span className="text-[rgb(var(--color-accent))]">*</span>
                    <input
                      required
                      autoFocus
                      placeholder="Ví dụ: Đánh giá mức độ hoàn thành công việc tháng 11/2026"
                      className={inputClass}
                      value={draft.name ?? ""}
                      onChange={(event) => patch({ name: event.target.value })}
                    />
                  </label>

                  <div className="min-w-0">
                    <label htmlFor="period-editor-kind" className={labelClass + " mb-1"}>
                      Loại kỳ <span className="text-[rgb(var(--color-accent))]">*</span>
                    </label>
                    <SearchableSelect
                      id="period-editor-kind"
                      label="Loại kỳ"
                      placeholder="Chọn loại kỳ"
                      options={periodTypeOptions}
                      value={kind}
                      disabled={busy || (editing && !detail)}
                      onChange={(value) =>
                        patch({
                          periodType: value || null,
                          month: value === "Month" ? draft.month : null,
                          quarter: value === "Quarter" ? draft.quarter : null,
                        })
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="period-editor-evaluation-type" className={labelClass + " mb-1"}>
                      Loại đánh giá <span className="text-[rgb(var(--color-accent))]">*</span>
                    </label>
                    <SearchableSelect
                      id="period-editor-evaluation-type"
                      label="Loại đánh giá"
                      placeholder="Chọn loại đánh giá"
                      options={typeOptions}
                      value={draft.evaluationTypeId == null ? "" : String(draft.evaluationTypeId)}
                      disabled={busy || !ready}
                      loading={!ready && !lookupError}
                      onChange={(value) => patch({ evaluationTypeId: value ? Number(value) : null })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 rounded-2xl border border-[rgb(var(--color-border)/0.75)] bg-[rgb(var(--color-page)/0.38)] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-lg bg-sky-500/15 text-sky-600 [.dark_&]:text-sky-300">
                      <ClockIcon className="size-3.5" aria-hidden="true" />
                    </span>
                    <h3 className="text-sm font-bold text-[rgb(var(--color-text))]">
                      Chu kỳ &amp; Thời gian hiệu lực
                    </h3>
                  </div>
                  {rangeSummary && (
                    <span
                      className={
                        "rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
                        (invalidRange
                          ? "border-[rgb(var(--color-accent)/0.3)] bg-[rgb(var(--color-accent)/0.12)] text-[rgb(var(--color-accent))]"
                          : "border-sky-500/25 bg-sky-500/12 text-sky-700 [.dark_&]:text-sky-300")
                      }
                    >
                      {rangeSummary}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    Năm
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      placeholder="2026"
                      className={inputClass + " tabular-nums"}
                      value={draft.year ?? ""}
                      onChange={(event) => {
                        const next = event.target.valueAsNumber;
                        patch({ year: event.target.value && Number.isFinite(next) ? next : null });
                      }}
                    />
                  </label>

                  {kind === "Month" ? (
                    <label className={labelClass}>
                      Tháng
                      <input
                        type="number"
                        min={1}
                        max={12}
                        placeholder="1 - 12"
                        className={inputClass + " tabular-nums"}
                        value={draft.month ?? ""}
                        onChange={(event) => {
                          const next = event.target.valueAsNumber;
                          patch({ month: event.target.value && Number.isFinite(next) ? next : null });
                        }}
                      />
                    </label>
                  ) : kind === "Quarter" ? (
                    <label className={labelClass}>
                      Quý
                      <input
                        type="number"
                        min={1}
                        max={4}
                        placeholder="1 - 4"
                        className={inputClass + " tabular-nums"}
                        value={draft.quarter ?? ""}
                        onChange={(event) => {
                          const next = event.target.valueAsNumber;
                          patch({ quarter: event.target.value && Number.isFinite(next) ? next : null });
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex flex-col justify-end">
                      <div className="flex min-h-10 items-center rounded-[10px] border border-dashed border-[rgb(var(--color-border)/0.65)] bg-[rgb(var(--color-surface)/0.45)] px-3.5 text-xs text-[var(--panel-muted)]">
                        {typeMeta ? `${typeMeta.label} không cần nhập Tháng / Quý` : "Không áp dụng Tháng / Quý"}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <label className={labelClass}>
                    Bắt đầu
                    <input
                      type="date"
                      className={inputClass + " tabular-nums"}
                      value={startValue}
                      onChange={(event) => patch({ startDate: datePayload(event.target.value) })}
                    />
                  </label>

                  <label className={labelClass}>
                    Kết thúc
                    <input
                      type="date"
                      className={inputClass + " tabular-nums"}
                      value={endValue}
                      onChange={(event) => patch({ endDate: datePayload(event.target.value) })}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
              <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/[0.06] to-[rgb(var(--color-brand)/0.04)] p-4">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-lg bg-violet-500/15 text-violet-600 [.dark_&]:text-violet-300">
                      <FileTextIcon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <label
                        htmlFor="period-editor-templates"
                        className="block text-sm font-bold text-[rgb(var(--color-text))]"
                      >
                        Biểu mẫu áp dụng <span className="text-[rgb(var(--color-accent))]">*</span>
                      </label>
                      <span className="text-[11px] text-[var(--panel-muted)]">
                        Chọn một hoặc nhiều mẫu KPI cho kỳ
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/12 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-violet-700 [.dark_&]:text-violet-300">
                    {templateIds.length} đã chọn
                  </span>
                </div>

                <SearchableSelect
                  multiple
                  id="period-editor-templates"
                  label="Biểu mẫu"
                  placeholder="Tìm & chọn biểu mẫu…"
                  options={templateOptions}
                  value={templateIds}
                  onChange={(value) => {
                    setError("");
                    setTemplateIds(value);
                  }}
                  disabled={busy || !ready}
                  loading={!ready && !lookupError}
                />

                <div className="mt-3 h-44 overflow-y-auto rounded-xl border border-[rgb(var(--color-border)/0.7)] bg-[rgb(var(--color-surface)/0.75)] p-2">
                  {!ready && !lookupError ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[rgb(var(--color-border)/0.6)] px-4 text-center text-xs text-[var(--panel-muted)]">
                      <ReloadIcon className="size-4 animate-spin text-[rgb(var(--color-brand))]" aria-hidden="true" />
                      <p className="font-medium text-[rgb(var(--color-text)/0.85)]">Đang tải danh sách biểu mẫu…</p>
                    </div>
                  ) : templateIds.length > 0 ? (
                    <ul aria-label="Biểu mẫu đã chọn" className="space-y-1.5 text-xs">
                      {templateIds.map((id, index) => {
                        const label = templateOptions.find((option) => option.id === id)?.name ?? id;
                        return (
                          <li
                            key={id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[rgb(var(--color-brand)/0.22)] bg-[rgb(var(--color-brand)/0.06)] px-3 py-2 text-[rgb(var(--color-text))]"
                          >
                            <span className="grid size-5 shrink-0 place-items-center rounded-md bg-[rgb(var(--color-brand)/0.16)] font-mono text-[11px] font-bold text-[rgb(var(--color-brand))]">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 break-words font-medium leading-snug">
                              {label}
                            </span>
                            <button
                              type="button"
                              disabled={busy}
                              aria-label={`Bỏ chọn ${label}`}
                              onClick={() => {
                                setError("");
                                setTemplateIds((current) => current.filter((item) => item !== id));
                              }}
                              className="grid size-6 shrink-0 place-items-center rounded-md text-[var(--panel-muted)] transition hover:bg-[rgb(var(--color-accent)/0.14)] hover:text-[rgb(var(--color-accent))] disabled:opacity-50"
                            >
                              <Cross2Icon className="size-3.5" aria-hidden="true" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-[rgb(var(--color-border)/0.7)] px-4 text-center text-xs text-[var(--panel-muted)]">
                      <FileTextIcon className="mb-1.5 size-5 opacity-55" aria-hidden="true" />
                      <p className="font-medium text-[rgb(var(--color-text)/0.85)]">Chưa gắn biểu mẫu nào</p>
                      <p className="mt-0.5">Chọn biểu mẫu ở ô phía trên để gắn vào kỳ đánh giá.</p>
                    </div>
                  )}
                </div>

                {templateIds.length > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setTemplateIds([]);
                    }}
                    className="mt-2 self-end text-xs font-semibold text-[rgb(var(--color-accent))] underline underline-offset-4 transition hover:opacity-80 disabled:opacity-50"
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>

              <label
                className={
                  "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition-colors " +
                  (active
                    ? "border-emerald-500/35 bg-emerald-500/[0.08]"
                    : "border-amber-500/35 bg-amber-500/[0.07]")
                }
              >
                <span className="min-w-0">
                  <strong className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--color-text))]">
                    <span
                      className={
                        "size-2 rounded-full " +
                        (active ? "bg-emerald-500" : "bg-amber-500")
                      }
                      aria-hidden="true"
                    />
                    Trạng thái hoạt động
                  </strong>
                  <small className="mt-0.5 block text-xs text-[var(--panel-muted)]">
                    {active ? "Đang kích hoạt trong hệ thống." : "Đang tạm ngưng sử dụng."}
                  </small>
                </span>
                <span className="relative inline-flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={active}
                    onChange={(event) => patch({ isActive: event.target.checked })}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={
                      "h-6 w-11 rounded-full border transition-colors " +
                      (active
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-amber-500/50 bg-[rgb(var(--color-border)/0.5)]")
                    }
                  />
                  <span
                    aria-hidden="true"
                    className={
                      "pointer-events-none absolute left-0.5 grid size-5 place-items-center rounded-full bg-white shadow-sm transition-transform " +
                      (active ? "translate-x-5 text-emerald-600" : "translate-x-0 text-amber-600")
                    }
                  >
                    {active && <CheckIcon className="size-3.5" />}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {lookupError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-xl border border-[rgb(var(--color-accent)/0.25)] bg-[rgb(var(--color-accent)/0.08)] px-3.5 py-2.5 text-sm text-[rgb(var(--color-accent))]"
            >
              <ExclamationTriangleIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{lookupError}</span>
              <button
                type="button"
                className="shrink-0 font-semibold underline underline-offset-4"
                onClick={() => {
                  setLookupError("");
                  setRevision((current) => current + 1);
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-[rgb(var(--color-accent)/0.25)] bg-[rgb(var(--color-accent)/0.08)] px-3.5 py-2.5 text-sm text-[rgb(var(--color-accent))]"
            >
              <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--color-border)/0.85)] bg-[rgb(var(--color-page)/0.5)] px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs text-[var(--panel-muted)]">
            {!ready && !lookupError ? (
              <>
                <ReloadIcon className="size-3.5 animate-spin text-[rgb(var(--color-brand))]" aria-hidden="true" />
                <span>{editing ? "Đang tải chi tiết kỳ đánh giá…" : "Đang tải danh mục loại đánh giá & biểu mẫu…"}</span>
              </>
            ) : editing ? (
              <>
                <span
                  className={
                    "size-2 rounded-full " +
                    (dirty ? "bg-amber-500" : "bg-emerald-500/70")
                  }
                  aria-hidden="true"
                />
                <span>{dirty ? "Có thay đổi chưa lưu" : "Thông tin khớp với dữ liệu hệ thống"}</span>
              </>
            ) : (
              <span>Nhấn Esc để đóng nhanh hộp thoại</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className="min-h-10 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 text-sm font-semibold text-[rgb(var(--color-text))] transition hover:bg-[rgb(var(--color-brand)/0.07)] disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy || !ready || (editing && !dirty)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-[#df2626] to-[#b51515] px-5 text-sm font-semibold text-white shadow-md shadow-[rgb(var(--deoca-accent-rgb)/0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              {busy ? (
                <>
                  <ReloadIcon className="size-4 animate-spin" aria-hidden="true" />
                  Đang lưu…
                </>
              ) : (
                <>
                  <CheckIcon className="size-4" aria-hidden="true" />
                  {editing ? "Lưu thay đổi" : "Tạo kỳ đánh giá"}
                </>
              )}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
