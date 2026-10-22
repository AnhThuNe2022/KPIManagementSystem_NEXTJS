"use client";

import Image from "next/image";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ActivityLogIcon, ArrowRightIcon, CheckIcon, ClockIcon, ChevronDownIcon, Cross2Icon, DotsHorizontalIcon, DownloadIcon, ExclamationTriangleIcon, EyeOpenIcon, FileTextIcon, MagnifyingGlassIcon, MixerHorizontalIcon, PersonIcon, ReloadIcon, ResetIcon, TrashIcon, UpdateIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { generalHrEvaluationApi as api } from "../services/generalHrEvaluationApi";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import { generalHrStatusOptions, EvaluationStatus, UserRoleSystem, type ApprovalHistoryEntry, type EvaluationApprover, type EvaluationFilterOption, type EvaluationTypeOption, type GeneralHrEvaluationDto, type GeneralHrEvaluationRequest, type PagedResult } from "@/types/evaluation";
import { formatEvaluationDate, requestMessage } from "../evaluationDisplay";
import { EvaluationPagination } from "./EvaluationPagination";
import s from "../general-hr-evaluations.module.css";

const labels: Record<string, string> = {
  Unknown: "Không xác định", Drafted: "Lưu nháp", Submitted: "Đã gửi",
  DirectManagerReviewing: "Quản lý trực tiếp đang duyệt", ManagerMidReviewing: "Quản lý cấp trung đang duyệt",
  HRReviewing: "HR đang duyệt", ManagerSeniorReviewing: "Quản lý cấp cao đang duyệt",
  ChairManReviewing: "Chủ tịch đang duyệt", Rejected: "Bị từ chối", SentHR: "QLCC đã duyệt",
  CompileHRList: "Đã đánh giá xong", DirectorReviewCompileHRList: "Giám đốc duyệt tổng hợp HR",
  CompileChiefOfStaffList: "Tổng hợp văn phòng", ChairManReviewCompile: "Chủ tịch duyệt tổng hợp",
  DepartmentHeadReviewing: "Trưởng phòng đang duyệt", DirectorReviewing: "Giám đốc đang duyệt",
  Imported: "Đã được import", DeputyDirector: "Phó giám đốc", DepartmentDirector: "Giám đốc bộ phận", Over: "Hoàn tất",
};

// The BE Status enum is numeric; preserve its values when rendering template transitions.
const codes = Object.values(EvaluationStatus);
function statusKey(value: string | number) {
  return typeof value === "number" ? codes[value] ?? "Unknown" : value;
}
function hrStatusLabel(value: string | number) {
  const key = statusKey(value);
  if (key.includes(";")) return key.split(";").filter(Boolean).map((part) => labels[part] ?? part).join(" / ");
  return labels[key] ?? key;
}
function statusTone(value: string | number) {
  const key = statusKey(value);
  if (key === "Rejected") return "danger";
  if (["CompileHRList", "SentHR", "Over"].includes(key)) return "success";
  if (["Drafted", "Unknown", "Imported"].includes(key)) return "neutral";
  return "progress";
}
function reviewerRole(value?: string | null) {
  return ({ManagerMid: "Quản lý trực tiếp", ManagerSenior: "Quản lý cấp cao", HR: "Nhân sự", Employee: "Nhân viên", ChairMan: "Chủ tịch", HRSummary: "HR tổng hợp"} as Record<string, string>)[value ?? ""] ?? value ?? "Người xử lý";
}

type Filters = { keyword: string; companyId: string; departmentId: string; reviewerId: string; typeId: string; periodId: string; statuses: string[]; order: "asc" | "desc" };
const emptyFilters: Filters = { keyword: "", companyId: "", departmentId: "", reviewerId: "", typeId: "", periodId: "", statuses: [], order: "desc" };

function StatusFilter({ selected, onChange }: { selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className={s.statusField} ref={ref} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span id="hr-status-label" className={s.fieldLabel}>Trạng thái</span>
    <button ref={trigger} type="button" className={s.selectButton} aria-labelledby="hr-status-label hr-status-value" aria-expanded={open} aria-controls="hr-status-options" onClick={() => setOpen(!open)}>
      <span id="hr-status-value">{selected.length ? `${selected.length} trạng thái đã chọn` : "Tất cả trạng thái"}</span><ChevronDownIcon aria-hidden="true" />
    </button>
    {open && <div id="hr-status-options" className={s.statusOptions}>
      <label className={s.allStatuses}><input type="checkbox" checked={!selected.length} onChange={() => onChange([])} /><span>Tất cả trạng thái</span></label>
      {generalHrStatusOptions.map((option) => <label key={option.value}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => onChange(selected.includes(option.value) ? selected.filter((value) => value !== option.value) : [...selected, option.value])} /><span>{option.label}</span></label>)}
      <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Xong<ChevronDownIcon aria-hidden="true" /></button>
    </div>}
  </div>;
}

function SelectField({ label, value, options, placeholder, disabled, onChange }: { label: string; value: string; options: EvaluationFilterOption[]; placeholder: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className={s.field}><span>{label}</span><div className={s.selectWrap}><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select><ChevronDownIcon aria-hidden="true" /></div></label>;
}

export function GeneralHrEvaluations() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0), [lookupRevision, setLookupRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{ key: string; data: PagedResult<GeneralHrEvaluationDto> } | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [companies, setCompanies] = useState<EvaluationFilterOption[]>([]);
  const [departments, setDepartments] = useState<EvaluationFilterOption[]>([]);
  const [types, setTypes] = useState<EvaluationTypeOption[]>([]);
  const [reviewers, setReviewers] = useState<EvaluationFilterOption[]>([]);
  const [lookupBusy, setLookupBusy] = useState(true), [departmentBusy, setDepartmentBusy] = useState(true);
  const [lookupError, setLookupError] = useState(""), [departmentError, setDepartmentError] = useState("");
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "complete">("idle");
  const [exportProgress, setExportProgress] = useState({ loaded: 0, total: 0, percent: 0 });
  const exporting = exportStatus !== "idle";
  const exportController = useRef<AbortController | null>(null);
  const exportButton = useRef<HTMLButtonElement>(null), exportCancelButton = useRef<HTMLButtonElement>(null);
  const [dialog, setDialog] = useState<{ mode: HrDialogMode; row: GeneralHrEvaluationDto } | null>(null);
  const [trackedId, setTrackedId] = useState<number | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(true);
  const requestBody = useMemo<GeneralHrEvaluationRequest>(() => ({ Page: page, PageSize: pageSize, Filters: { keyword: applied.keyword, companyid: applied.companyId, departmentid: applied.departmentId, evaluationtypeid: applied.typeId, periodid: applied.periodId, userapprove: applied.reviewerId, status: applied.statuses.join(";"), sortBy: "Id", sortOrder: applied.order } }), [applied, page, pageSize]);
  const requestKey = JSON.stringify(requestBody);
  const data = snapshot?.key === requestKey ? snapshot.data : null;
  const trackedRow = trackingOpen ? data?.items.find((row) => row.id === trackedId) ?? data?.items[0] : undefined;
  const dirty = JSON.stringify(filters) !== JSON.stringify(applied);
  const filterCount = [applied.keyword, applied.companyId, applied.departmentId, applied.reviewerId, applied.typeId, applied.periodId, applied.statuses.length > 0].filter(Boolean).length;
  const advancedCount = [applied.typeId, applied.periodId, applied.statuses.length > 0, applied.order !== "desc"].filter(Boolean).length;
  const periods = useMemo(() => types.find((type) => type.id === filters.typeId)?.periods ?? [], [types, filters.typeId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    api.getPaged(requestBody, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      const last = Math.max(1, Math.ceil(result.total / pageSize));
      if (page > last) { setPage(last); return; }
      setSnapshot({ key: requestKey, data: result });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(requestMessage(cause, "Chưa tải được hồ sơ. Vui lòng thử tải lại.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestBody, requestKey, page, pageSize, revision]);

  useEffect(() => {
    const controller = new AbortController(); setLookupBusy(true); setLookupError("");
    Promise.allSettled([api.getCompanies(controller.signal), api.getTypes(controller.signal), api.getReviewerOptions(controller.signal)]).then(([companyResult, typeResult, reviewerResult]) => {
      if (controller.signal.aborted) return;
      setCompanies(companyResult.status === "fulfilled" ? companyResult.value : []);
      setTypes(typeResult.status === "fulfilled" ? typeResult.value : []);
      setReviewers(reviewerResult.status === "fulfilled" ? reviewerResult.value.map((reviewer) => ({ id: reviewer.id, name: `${reviewer.name}${reviewer.code ? ` · ${reviewer.code}` : ""}` })) : []);
      const failed = [companyResult, typeResult, reviewerResult].find((result) => result.status === "rejected");
      if (failed?.status === "rejected") setLookupError(requestMessage(failed.reason, "Một số lựa chọn bộ lọc chưa tải được."));
      setLookupBusy(false);
    });
    return () => controller.abort();
  }, [lookupRevision]);

  useEffect(() => {
    setDepartments([]); setDepartmentError("");
    if (!filters.companyId) { setDepartmentBusy(false); return; }
    const controller = new AbortController(); setDepartmentBusy(true); setDepartmentError("");
    evaluationLookupApi.getDepartments(filters.companyId, UserRoleSystem.HR, controller.signal).then((result) => { if (!controller.signal.aborted) setDepartments(result); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setDepartments([]); setDepartmentError(requestMessage(cause, "Chưa tải được phòng ban.")); } })
      .finally(() => { if (!controller.signal.aborted) setDepartmentBusy(false); });
    return () => controller.abort();
  }, [filters.companyId, lookupRevision]);
  useEffect(() => () => { exportController.current?.abort(); exportController.current = null; }, []);

  function applyFilters(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const next = { ...filters, keyword: filters.keyword.trim() }; setFilters(next); setApplied(next); setPage(1); setAdvancedOpen(false); }
  function clearFilters() { setAdvancedOpen(false); setFilters(emptyFilters); setApplied(emptyFilters); setPage(1); setRevision((value) => value + 1); }
  function updateFilter(key: keyof Omit<Filters, "statuses">, value: string) { setFilters((current) => ({ ...current, [key]: value })); }
  function openDialog(mode: HrDialogMode, row: GeneralHrEvaluationDto) { setDialog({ mode, row }); }

  function cancelExport() {
    exportController.current?.abort(); exportController.current = null; setExportStatus("idle");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(() => exportButton.current?.focus({ preventScroll: true }));
  }

  async function exportExcel() {
    if (!data?.total || exportController.current) return;
    const controller = new AbortController(); exportController.current = controller;
    setExportProgress({ loaded: 0, total: data.total, percent: 0 }); setExportStatus("loading");
    requestAnimationFrame(() => exportCancelButton.current?.focus({ preventScroll: true }));
    try {
      const result = await api.getForExport(requestBody, data.total, controller.signal, (loaded, total) => {
        if (exportController.current === controller) setExportProgress({ loaded, total, percent: total ? Math.round(loaded / total * 100) : 0 });
      });
      controller.signal.throwIfAborted();
      if (!result.total || result.items.length !== result.total) throw new Error("INCOMPLETE_EXPORT");
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      controller.signal.throwIfAborted();
      const bytes = createGeneralHrWorkbook(result.items);
      const url = URL.createObjectURL(new Blob([bytes.buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a"); link.href = url; link.download = `danh-gia-kpi-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus("complete");
      toast.success(`Đã xuất ${result.total} bản đánh giá.`);
      await new Promise<void>((resolve) => setTimeout(resolve, 240));
    } catch (cause) {
      if (!controller.signal.aborted) toast.error(requestMessage(cause, "Chưa xuất được đầy đủ dữ liệu. Vui lòng thử lại."));
    } finally {
      if (exportController.current === controller) {
        exportController.current = null; setExportStatus("idle");
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(() => exportButton.current?.focus({ preventScroll: true }));
      }
    }
  }

  return <section className={s.page} aria-labelledby="general-hr-title">
    <header className={s.hero} data-exporting={exporting}>
        <div className={s.heroCopy}><h1 id="general-hr-title">Theo dõi đánh giá<span>.</span></h1><p>Nắm rõ tiến trình. Theo sát người duyệt.</p><span className={s.heroScope}><PersonIcon aria-hidden="true" />HR tổng hợp · Công ty theo quyền của bạn</span></div>
        <Image className={s.heroArtwork} src="/images/hr-collaboration.svg" alt="" width={260} height={160} aria-hidden="true" />
        <div className={s.heroActions}>
          <div className={s.exportControl} data-active={exporting}>
            <span className={s.exportSurface} aria-hidden="true" onTransitionEnd={(event) => { if (event.propertyName === "clip-path" && !exportController.current) exportButton.current?.focus({ preventScroll: true }); }} />
            <button ref={exportButton} type="button" className={s.exportButton} aria-label="Xuất Excel" aria-hidden={exporting || undefined} tabIndex={exporting ? -1 : 0} onClick={exportExcel} disabled={loading || !!error || !data?.total || exporting}><DownloadIcon aria-hidden="true" /><span>Xuất Excel</span></button>
            <div className={s.exportProgress} aria-hidden={!exporting} inert={!exporting}>
              <div><div className={s.exportProgressLabel}><span id="hr-export-label">{exportStatus === "complete" ? "Đã xuất Excel" : "Đang xuất Excel"}</span><strong>{exportProgress.percent}%</strong></div><div className={s.exportTrack} role="progressbar" aria-labelledby="hr-export-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={exportProgress.percent} aria-valuetext={`${exportProgress.loaded} / ${exportProgress.total} hồ sơ`}><span style={{ transform: `scaleX(${exportProgress.percent / 100})` }} /></div></div>
              <button ref={exportCancelButton} type="button" className={s.exportCancel} aria-label={exportStatus === "complete" ? "Đã xuất Excel" : "Hủy xuất Excel"} disabled={exportStatus === "complete"} onClick={cancelExport}>{exportStatus === "complete" ? <CheckIcon aria-hidden="true" /> : <Cross2Icon aria-hidden="true" />}</button>
            </div>
          </div>
          <span role="status">{exporting ? `${exportProgress.loaded} / ${exportProgress.total} hồ sơ` : ""}</span>
        </div>
    </header>
    <div className={s.workspace}>
      <form className={s.filters} aria-label="Lọc hồ sơ đánh giá" data-expanded={advancedOpen} onSubmit={applyFilters}>
        <div className={s.searchRow}>
          <label className={s.field + " " + s.search}><span>Nhân viên</span><div className={s.inputWrap}><MagnifyingGlassIcon aria-hidden="true" /><input type="search" placeholder="Tìm tên hoặc mã nhân viên…" value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} /></div></label>
          <SelectField label="Công ty" value={filters.companyId} options={companies} placeholder="Tất cả công ty" disabled={lookupBusy || !companies.length} onChange={(value) => setFilters((current) => ({ ...current, companyId: value, departmentId: "" }))} />
          <SelectField label="Phòng ban" value={filters.departmentId} options={departments} placeholder={filters.companyId ? "Tất cả phòng ban" : "Chọn công ty trước"} disabled={!filters.companyId || departmentBusy || !departments.length} onChange={(value) => updateFilter("departmentId", value)} />
          <SelectField label="Người đang duyệt" value={filters.reviewerId} options={reviewers} placeholder="Tất cả người duyệt" disabled={lookupBusy || !reviewers.length} onChange={(value) => updateFilter("reviewerId", value)} />
          <div className={s.filterActions}>
            <button className={s.moreFilters} type="button" data-active={advancedCount > 0} aria-expanded={advancedOpen} aria-controls="hr-extra-filters" onClick={() => setAdvancedOpen(!advancedOpen)}><MixerHorizontalIcon aria-hidden="true" /><span>Lọc thêm</span>{advancedCount > 0 && <b>{advancedCount}</b>}<ChevronDownIcon aria-hidden="true" /></button>
            <button type="button" className={s.iconButton} aria-label="Xóa tất cả bộ lọc" title="Xóa tất cả bộ lọc" onClick={clearFilters}><ResetIcon aria-hidden="true" /></button>
            <button type="submit" className={s.button + " " + s.primary}><MagnifyingGlassIcon aria-hidden="true" />Áp dụng</button>
          </div>
        </div>
        <div className={s.filterRow} id="hr-extra-filters" hidden={!advancedOpen}>
          <SelectField label="Loại đánh giá" value={filters.typeId} options={types} placeholder="Tất cả loại đánh giá" disabled={lookupBusy || !types.length} onChange={(value) => setFilters((current) => ({ ...current, typeId: value, periodId: "" }))} />
          <SelectField label="Kỳ đánh giá" value={filters.periodId} options={periods} placeholder={filters.typeId ? "Tất cả kỳ đánh giá" : "Chọn loại đánh giá trước"} disabled={!filters.typeId || lookupBusy || !periods.length} onChange={(value) => updateFilter("periodId", value)} />
          <StatusFilter selected={filters.statuses} onChange={(statuses) => setFilters((current) => ({ ...current, statuses }))} />
          <label className={s.field}><span>Sắp xếp</span><div className={s.selectWrap}><select value={filters.order} onChange={(event) => updateFilter("order", event.target.value)}><option value="desc">Hồ sơ mới trước</option><option value="asc">Hồ sơ cũ trước</option></select><ChevronDownIcon aria-hidden="true" /></div></label>
        </div>
        {(lookupError || departmentError) && <div className={s.notice} role="alert"><span>{lookupError || departmentError}</span><button type="button" onClick={() => setLookupRevision((value) => value + 1)}>Thử lại</button></div>}
        <p className={s.filterHint} role="status">{dirty ? "Có thay đổi chưa áp dụng. Nhấn Áp dụng để cập nhật danh sách." : ""}</p>
      </form>
    </div>

    <div className={s.recordsLayout} data-tracking={!!trackedRow}>
    <div className={s.records}>
      <header className={s.recordsHeader}><div><FileTextIcon aria-hidden="true" /><h2>Hồ sơ đánh giá</h2><span className={s.count}>{loading ? "…" : error ? "—" : (data?.total ?? 0).toLocaleString("vi-VN")}</span>{filterCount > 0 && <span className={s.appliedCount}>{filterCount} bộ lọc</span>}</div><div className={s.recordsTools}>{data && !loading && !error && <span>{data.items.length} hồ sơ đang hiển thị</span>}<button type="button" className={s.iconButton} aria-label="Tải lại danh sách" onClick={() => setRevision((value) => value + 1)} disabled={loading}><ReloadIcon aria-hidden="true" /></button></div></header>
      <div aria-busy={loading}>
        {loading ? <div className={s.skeletons} role="status"><span className={s.srOnly}>Đang tải hồ sơ đánh giá…</span>{Array.from({ length: 5 }, (_, i) => <div key={i} className={s.skeleton} aria-hidden="true"><i /><div><i /><i /></div><i /><i /></div>)}</div>
          : error ? <div className={s.empty} role="alert"><span className={s.emptyIcon}><FileTextIcon aria-hidden="true" /></span><h3>Chưa thể mở danh sách</h3><p>{error}</p><button className={`${s.button} ${s.primary}`} onClick={() => setRevision((value) => value + 1)}>Tải lại hồ sơ</button>{error.includes("đăng nhập") && <a href="/login?next=/hr/evaluations">Đăng nhập lại</a>}</div>
          : !data?.items.length ? <div className={s.empty}><span className={s.emptyIcon}><MagnifyingGlassIcon aria-hidden="true" /></span><h3>Chưa có hồ sơ phù hợp</h3><p>Thử chọn người duyệt hoặc kỳ đánh giá khác, hoặc xóa bộ lọc để xem lại danh sách.</p><button className={s.button} onClick={clearFilters}>Xóa bộ lọc</button></div>
          : <div className={s.tableWrap}><table className={s.table}><caption className={s.srOnly}>Danh sách bản đánh giá và tiến trình xử lý</caption><colgroup><col className={s.employeeCol} /><col className={s.evaluationCol} /><col className={s.organizationCol} /><col className={s.progressCol} /><col className={s.actionCol} /></colgroup><thead><tr><th scope="col">Nhân viên</th><th scope="col">Hồ sơ / kỳ đánh giá</th><th scope="col" className={s.organizationHeading}>Đơn vị</th><th scope="col">Tiến trình xử lý</th><th scope="col"><span className={s.srOnly}>Thao tác</span></th></tr></thead><tbody>{data.items.map((row) => {
            const actions = <><button type="button" onClick={(event) => { event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover(); openDialog("approvers", row); }}><PersonIcon aria-hidden="true" />Người đang duyệt</button><button type="button" disabled={!row.templateId} onClick={(event) => { event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover(); openDialog("status", row); }}><UpdateIcon aria-hidden="true" />Chuyển trạng thái</button><button type="button" disabled><EyeOpenIcon aria-hidden="true" />Xem bản đánh giá</button><button type="button" className={s.dangerMenuItem} onClick={(event) => { event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover(); openDialog("delete", row); }}><TrashIcon aria-hidden="true" />Xóa bản đánh giá</button></>;
            return <tr key={row.id} data-selected={trackedRow?.id === row.id || dialog?.row.id === row.id}>
            <td data-label="Nhân viên" className={s.employeeCell}><div className={s.employee}><span className={s.avatar}><PersonIcon aria-hidden="true" /></span><div><strong title={row.name}>{row.name}</strong><span title={row.systemCode || row.userId}>{row.systemCode || row.userId}</span></div></div></td>
            <td data-label="Hồ sơ / kỳ đánh giá" className={s.evaluationCell}><strong className={s.period}>{row.period || "Chưa có kỳ đánh giá"}</strong><span className={s.template}>{row.templateName || "Chưa có tên bản đánh giá"}</span></td>
            <td data-label="Đơn vị" className={s.organizationCell}><span className={s.companyIdentity} title={row.companyCode || "Chưa có đơn vị"}><Image className={s.companyLogo} src={companyLogos[row.companyCode?.trim().toUpperCase() ?? ""] ?? "/brand/deoca-icon.png"} alt="" width={32} height={32} /><span>{row.companyCode || "—"}</span></span><span className={s.department}>{row.departmentName || "Chưa có phòng ban"}</span></td>
            <td data-label="Tiến trình xử lý" className={s.progressCell}><HrStatus value={row.status} />{row.strDirectManager && row.status === "DirectManagerReviewing" ? <button type="button" className={s.reviewerLink} onClick={() => openDialog("approvers", row)}><PersonIcon aria-hidden="true" />{row.strDirectManager}</button> : /Reviewing$/.test(row.status) ? <button type="button" className={s.reviewerLink} onClick={() => openDialog("approvers", row)}><PersonIcon aria-hidden="true" />Xem người đang duyệt</button> : null}<span className={s.submitted}>{row.submitDate && new Date(row.submitDate).getFullYear() > 1900 ? <time dateTime={row.submitDate}>Nộp {formatEvaluationDate(row.submitDate)}</time> : "Chưa có ngày nộp"}</span></td>
            <td className={s.actionCell}><div className={s.rowActions}><button type="button" className={s.trackButton} data-track-id={row.id} data-active={trackedRow?.id === row.id} aria-expanded={trackedRow?.id === row.id} aria-controls={trackedRow?.id === row.id ? "hr-tracking-panel" : undefined} onClick={() => { setTrackedId(row.id); setTrackingOpen(true); }} aria-label={"Theo dõi hồ sơ của " + row.name}>{trackedRow?.id === row.id ? <ActivityLogIcon aria-hidden="true" /> : <ArrowRightIcon aria-hidden="true" />}<span>{trackedRow?.id === row.id ? "Đang xem" : "Theo dõi"}</span></button><button type="button" className={s.iconButton} onClick={() => openDialog("approvers", row)} aria-label={`Người đang duyệt hồ sơ ${row.id}`} aria-haspopup="dialog" title="Người đang duyệt"><PersonIcon aria-hidden="true" /></button><button type="button" className={s.iconButton} popoverTarget={`hr-actions-${row.id}`} style={{ anchorName: `--hr-actions-${row.id}` } as CSSProperties} aria-label={`Thao tác với hồ sơ ${row.id}`}><DotsHorizontalIcon aria-hidden="true" /></button></div><div id={`hr-actions-${row.id}`} popover="auto" className={s.actionMenu} style={{ positionAnchor: `--hr-actions-${row.id}` } as CSSProperties}>
              <p>Hồ sơ #{row.id}</p>{actions}
            </div><div className={s.mobileActions} role="group" aria-label={"Thao tác hồ sơ " + row.id}>{actions}</div></td>
          </tr>;
          })}</tbody></table></div>}
      </div>
      <div className={s.pagination}><EvaluationPagination page={page} pageSize={pageSize} total={data?.total ?? null} loading={loading} error={!!error} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>
    </div>
    {trackedRow && <HrTrackingPanel key={trackedRow.id + ":" + revision} row={trackedRow} onClose={() => { setTrackingOpen(false); document.querySelector<HTMLButtonElement>('[data-track-id="' + trackedRow.id + '"]')?.focus({ preventScroll: true }); }} onHistory={() => openDialog("history", trackedRow)} onApprovers={() => openDialog("approvers", trackedRow)} />}
    </div>
    <p className={s.pageNote}><PersonIcon aria-hidden="true" />Mở “Người đang duyệt” để biết ai đang xử lý từng hồ sơ.</p>
    {dialog && <GeneralHrEvaluationDialog mode={dialog.mode} row={dialog.row} onClose={() => setDialog(null)} onModeChange={(mode) => setDialog({ ...dialog, mode })} onMutated={() => { setDialog(null); setRevision((value) => value + 1); }} />}
  </section>;
}

function HrTrackingPanel({ row, onClose, onHistory, onApprovers }: { row: GeneralHrEvaluationDto; onClose: () => void; onHistory: () => void; onApprovers: () => void }) {
  const [details, setDetails] = useState<{ history: ApprovalHistoryEntry[]; approvers: EvaluationApprover[]; historyError: string; approversError: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const reviewing = row.status.split(";").some((status) => /Reviewing$/.test(status));
  useEffect(() => {
    const controller = new AbortController();
    setDetails(null);
    Promise.allSettled([api.getApprovalHistory(row.id, controller.signal), reviewing ? api.getApprovers(row.id, controller.signal) : Promise.resolve<EvaluationApprover[]>([])]).then(([history, approvers]) => {
      if (controller.signal.aborted) return;
      setDetails({
        history: history.status === "fulfilled" ? [...history.value].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [],
        approvers: approvers.status === "fulfilled" ? approvers.value.filter((person) => !person.isApprove) : [],
        historyError: history.status === "rejected" ? requestMessage(history.reason, "Chưa tải được lịch sử duyệt.") : "",
        approversError: approvers.status === "rejected" ? requestMessage(approvers.reason, "Chưa tải được người đang duyệt.") : "",
      });
    });
    return () => controller.abort();
  }, [row.id, reviewing, revision]);
  const history = details?.history.slice(-3) ?? [];
  return <aside id="hr-tracking-panel" className={s.trackingPanel} aria-labelledby="hr-tracking-title">
    <header className={s.trackingHeader}><h2 id="hr-tracking-title"><ActivityLogIcon aria-hidden="true" />Đang theo dõi</h2><button type="button" className={s.iconButton} aria-label="Đóng khung theo dõi" onClick={onClose}><Cross2Icon aria-hidden="true" /></button></header>
    <p className={s.trackingId}>HỒ SƠ #{row.id}</p><h3 className={s.trackingTitle}>{row.period || "Chưa có kỳ đánh giá"}</h3>
    <RecordIdentity row={row} />
    <div className={s.trackingState} data-tone={reviewing ? "waiting" : statusTone(row.status)}>{reviewing ? <ClockIcon aria-hidden="true" /> : statusTone(row.status) === "success" ? <CheckIcon aria-hidden="true" /> : <FileTextIcon aria-hidden="true" />}<div><strong>{reviewing ? "Đang chờ phê duyệt" : hrStatusLabel(row.status)}</strong>{reviewing && <span>{hrStatusLabel(row.status)}</span>}</div></div>
    {row.submitDate && new Date(row.submitDate).getFullYear() > 1900 && <p className={s.trackingDate}>Ngày nộp · {formatEvaluationDate(row.submitDate)}</p>}
    <div className={s.trackingSectionTitle}><h3>Tiến trình phê duyệt</h3>{details && !details.historyError && <span>{details.history.length} dấu mốc</span>}</div>
    {!details ? <div className={s.dialogLoading} role="status"><span className={s.srOnly}>Đang tải tiến trình hồ sơ…</span><i /><i /><i /></div> : <>
      {details.historyError ? <p className={s.trackingError} role="alert">{details.historyError}</p> : history.length ? <ol className={s.trackingTimeline}>{history.map((entry) => <li key={entry.approvalId} data-tone={statusTone(entry.status)}><span className={s.trackingNode} aria-hidden="true">{entry.status === "Rejected" ? <Cross2Icon /> : <CheckIcon />}</span><div><strong>{entry.statusValue || hrStatusLabel(entry.status)}</strong><time dateTime={entry.createdAt}>{formatEvaluationDate(entry.createdAt)}</time>{entry.approverName && <span>{entry.approverName}</span>}</div></li>)}</ol> : <p className={s.trackingEmpty}>Chưa có lịch sử phê duyệt.</p>}
      {reviewing && <div className={s.trackingCurrent}><span className={s.trackingNode} aria-hidden="true"><ClockIcon /></span><div><strong>{hrStatusLabel(row.status)}</strong>{details.approversError ? <p className={s.trackingError} role="alert">{details.approversError}</p> : details.approvers.length ? <ul>{details.approvers.map((person) => <li key={person.id}><span className={s.trackingAvatar}><PersonIcon aria-hidden="true" /></span>{person.userName}</li>)}</ul> : row.strDirectManager && row.status === "DirectManagerReviewing" ? <span>{row.strDirectManager}</span> : <span>Chưa có người đang duyệt.</span>}</div></div>}
      {(details.historyError || details.approversError) && <button type="button" className={s.trackingRetry} onClick={() => setRevision((value) => value + 1)}><ReloadIcon aria-hidden="true" />Thử tải lại</button>}
    </>}
    <button type="button" className={s.trackingHistoryButton} onClick={onHistory}><ActivityLogIcon aria-hidden="true" />Xem toàn bộ quá trình<ArrowRightIcon aria-hidden="true" /></button>
    <button type="button" className={s.trackingPeopleButton} onClick={onApprovers}><PersonIcon aria-hidden="true" />Xem người đang duyệt<ArrowRightIcon aria-hidden="true" /></button>
    <p className={s.trackingNote}>Theo dõi người xử lý và các dấu mốc của hồ sơ tại một nơi.</p>
  </aside>;
}

type HrDialogMode = "history" | "approvers" | "status" | "delete";
type DialogProps = { mode: HrDialogMode; row: GeneralHrEvaluationDto; onClose: () => void; onModeChange: (mode: HrDialogMode) => void; onMutated: () => void };
const titles: Record<HrDialogMode, string> = { history: "Quá trình phê duyệt", approvers: "Người đang duyệt", status: "Chuyển trạng thái", delete: "Xóa bản đánh giá?" };

const companyLogos: Record<string, string> = { BGLS: "/brand/bgls.png", TLMT: "/brand/tlmt.png" };

function HrStatus({ value }: { value: string | number }) {
  if (typeof value === "string" && value.includes(";")) return <span className={s.statusGroup}>{value.split(";").filter(Boolean).map((part) => <HrStatus key={part} value={part} />)}</span>;
  return <span className={s.status} data-tone={statusTone(value)}><i aria-hidden="true" />{hrStatusLabel(value)}</span>;
}

function RecordIdentity({ row }: { row: GeneralHrEvaluationDto }) {
  return <div className={s.dialogIdentity}><span className={s.identityAvatar}><PersonIcon aria-hidden="true" /></span><div><strong>{row.name}</strong><span>{row.systemCode || row.userId} · {row.companyCode || "Chưa có đơn vị"}</span></div></div>;
}

function GeneralHrEvaluationDialog({ mode, row, onClose, onModeChange, onMutated }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [approvers, setApprovers] = useState<EvaluationApprover[]>([]);
  const [statuses, setStatuses] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(mode !== "delete"), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [revision, setRevision] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    if (mode === "delete") cancelRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    const controller = new AbortController(); setError(""); setSelected(null); setReason(""); setStatuses([]); setHistory([]); setApprovers([]);
    setLoading(mode !== "delete");
    let work: Promise<void>;
    if (mode === "history") work = api.getApprovalHistory(row.id, controller.signal).then((result) => { if (!controller.signal.aborted) setHistory([...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())); });
    else if (mode === "approvers") work = api.getApprovers(row.id, controller.signal).then((result) => { if (!controller.signal.aborted) setApprovers(result); });
    else if (mode === "status" && row.templateId) work = api.getAvailableStatuses(row.templateId, controller.signal).then((result) => { if (!controller.signal.aborted) setStatuses(result); });
    else { setLoading(false); return () => controller.abort(); }
    work.catch((cause: unknown) => { if (!controller.signal.aborted) setError(requestMessage(cause, "Chưa tải được thông tin hồ sơ. Vui lòng thử lại.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mode, row.id, row.templateId, revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current || (mode === "status" && (selected === null || !statuses.includes(selected) || statusKey(selected) === row.status))) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      if (mode === "delete") await api.remove(row.id);
      else if (mode === "status" && selected !== null) await api.changeStatus({ EvalId: row.id, Status: selected, Reason: reason.trim() });
      else return;
      toast.success(mode === "delete" ? `Đã xóa bản đánh giá #${row.id}.` : "Đã cập nhật trạng thái bản đánh giá.");
      onMutated();
    } catch (cause: unknown) { setError(requestMessage(cause, mode === "delete" ? "Chưa xóa được hồ sơ. Vui lòng thử lại." : "Chưa cập nhật được trạng thái. Vui lòng thử lại.")); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const detailsError = !!error && !busy && mode !== "delete" && mode !== "status";
  const close = () => { if (!busyRef.current) onClose(); };
  const closeButton = <button type="button" className={s.dialogClose} aria-label={`Đóng ${titles[mode].toLowerCase()}`} disabled={busy} onClick={close}><Cross2Icon aria-hidden="true" /></button>;
  const failure = error && <div className={s.dialogError} role="alert"><ExclamationTriangleIcon aria-hidden="true" /><span>{error}</span>{(detailsError || (mode === "status" && !statuses.length)) && <button type="button" onClick={() => setRevision((value) => value + 1)}><ReloadIcon aria-hidden="true" />Thử lại</button>}</div>;
  const loadingState = <div className={s.dialogLoading} role="status"><span className={s.srOnly}>Đang tải thông tin…</span><i /><i /><i /></div>;

  return <dialog ref={ref} className={s.dialog} data-variant={mode} aria-labelledby="hr-dialog-title" aria-describedby={mode === "delete" ? "hr-delete-description" : undefined} onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); }}>
    {mode === "history" ? <div className={s.historyLayout}>
      <header className={s.historyHeader}><div className={s.dialogTitleGroup}><span className={s.dialogTitleIcon}><ActivityLogIcon aria-hidden="true" /></span><div><h2 id="hr-dialog-title">Quá trình phê duyệt</h2><p>Toàn bộ dấu mốc của hồ sơ #{row.id}</p></div></div>{closeButton}</header>
      <div className={s.historyRecord}>
        <div className={s.historyRecordTop}><RecordIdentity row={row} /><div className={s.historyCurrent}><span>Trạng thái hiện tại</span><HrStatus value={row.status} /></div></div>
        <dl className={s.historyFacts}><div><dt>Kỳ đánh giá</dt><dd>{row.period || "Chưa có kỳ đánh giá"}</dd></div><div><dt>Phòng ban</dt><dd>{row.departmentName || "Chưa có phòng ban"}</dd></div><div><dt>Ngày nộp</dt><dd>{formatEvaluationDate(row.submitDate ?? null, "Chưa nộp")}</dd></div></dl>
      </div>
      <section className={s.historyContent} aria-label="Nhật ký xử lý">
        <div className={s.sectionTitle}><h3><ActivityLogIcon aria-hidden="true" />Nhật ký xử lý</h3>{!loading && !error && <span>{history.length} dấu mốc · Mới nhất trước</span>}</div>
        {loading ? loadingState : error ? failure : !history.length ? <div className={s.modalEmpty}><ActivityLogIcon aria-hidden="true" /><h3>Chưa có lịch sử duyệt</h3><p>Các lần gửi, duyệt hoặc từ chối sẽ được ghi nhận tại đây.</p></div> : <ol className={s.timeline}>
          {[...history].reverse().map((entry, index) => <li key={entry.approvalId} data-tone={statusTone(entry.status)} data-last={index === 0}>
            <time className={s.eventTime} dateTime={entry.createdAt}>{formatEvaluationDate(entry.createdAt)}</time>
            <span className={s.timelineNode} aria-hidden="true">{statusTone(entry.status) === "danger" ? <Cross2Icon /> : <CheckIcon />}</span>
            <div className={s.eventContent}><div className={s.eventHeader}><strong>{entry.statusValue || hrStatusLabel(entry.status)}</strong>{index === 0 && <span className={s.latestEvent}>Mới nhất</span>}</div>
              <div className={s.eventPerson}><span className={s.smallAvatar}><PersonIcon aria-hidden="true" /></span><div><strong>{entry.approverName || "Chưa xác định người xử lý"}</strong><span>{reviewerRole(entry.approvalLevel)}{entry.approverUserId ? " · " + entry.approverUserId : ""}</span></div></div>
              {entry.comment && <blockquote>{entry.comment}</blockquote>}
            </div>
          </li>)}
        </ol>}
      </section>
      <footer className={s.historyFooter}><button type="button" className={s.textButton} onClick={() => onModeChange("approvers")}><PersonIcon aria-hidden="true" />Người đang duyệt<ArrowRightIcon aria-hidden="true" /></button><button type="button" className={s.button + " " + s.primary} onClick={close}>Đóng khung theo dõi</button></footer>
    </div>
    : mode === "approvers" ? <div className={s.peopleLayout}>
      <header className={s.peopleHeader}><div className={s.dialogTitleGroup}><span className={s.dialogTitleIcon}><PersonIcon aria-hidden="true" /></span><div><h2 id="hr-dialog-title">Người đang duyệt</h2><p>Thông tin người xử lý tại bước hiện tại.</p></div></div>{closeButton}</header>
      <div className={s.peopleRecord}><div><span className={s.peopleRecordRef}><FileTextIcon aria-hidden="true" />Hồ sơ #{row.id}</span><strong>{row.name}</strong><span className={s.peopleDepartment}>{row.departmentName || row.companyCode || "Chưa có đơn vị"}</span></div><HrStatus value={row.status} /></div>
      <div className={s.peopleBody}>{loading ? loadingState : error ? failure : !approvers.length ? <div className={s.modalEmpty}><PersonIcon aria-hidden="true" /><h3>Chưa có người đang duyệt</h3><p>Hồ sơ hiện chưa có người xử lý tại bước này. Bạn có thể xem lại quá trình phê duyệt.</p></div> : <><div className={s.sectionTitle}><h3>Người xử lý</h3><span>{approvers.length} người</span></div><ul className={s.approverList}>{approvers.map((person) => <li key={person.id}><span className={s.personAvatar} aria-hidden="true">{person.userName.trim().slice(0, 1).toLocaleUpperCase("vi") || "?"}</span><div><h3>{person.userName}</h3><span>{person.systemCode || person.userId || "Chưa có mã HT"}</span><p>{hrStatusLabel(person.status)}</p></div><span className={s.personState} data-approved={person.isApprove}>{person.isApprove ? <CheckIcon aria-hidden="true" /> : <ClockIcon aria-hidden="true" />}{person.isApprove ? "Đã duyệt" : "Chưa duyệt"}</span>{person.message && <blockquote className={s.personMessage}>{person.message}</blockquote>}</li>)}</ul></>}</div>
      <footer className={s.dialogFooter}><button type="button" className={s.textButton} onClick={() => onModeChange("history")}><ActivityLogIcon aria-hidden="true" />Xem quá trình<ArrowRightIcon aria-hidden="true" /></button><button type="button" className={s.button + " " + s.primary} onClick={close}>Đóng</button></footer>
    </div>
    : mode === "status" ? <form className={s.transitionLayout} onSubmit={submit} aria-busy={busy}>
      <aside className={s.transitionContext}>
        <span className={s.contextRecord}><FileTextIcon aria-hidden="true" />Hồ sơ #{row.id}</span><RecordIdentity row={row} />
        <div className={s.contextCurrent}><span>Trạng thái hiện tại</span><HrStatus value={row.status} /></div>
        <dl><div><dt>Kỳ đánh giá</dt><dd>{row.period || "Chưa có kỳ đánh giá"}</dd></div><div><dt>Phòng ban</dt><dd>{row.departmentName || "Chưa có phòng ban"}</dd></div></dl>
        <div className={s.contextDestination} data-selected={selected !== null}><ArrowRightIcon aria-hidden="true" /><span>Chuyển đến</span><strong>{selected !== null ? hrStatusLabel(selected) : "Chọn trạng thái mới"}</strong></div>
      </aside>
      <header className={s.transitionHeader}><div><h2 id="hr-dialog-title">Chuyển trạng thái</h2><p><span className={s.mobileRecordRef}>Hồ sơ #{row.id} · </span>Chọn bước xử lý tiếp theo.</p></div>{closeButton}</header>
      <div className={s.transitionBody}>
        {loading ? loadingState : error && !statuses.length ? null : <><fieldset className={s.targetFieldset} disabled={busy}><legend>Chuyển hồ sơ đến{statuses.length > 0 && <span className={s.targetCount}>{statuses.length} lựa chọn</span>}</legend>
          {!statuses.length && !error ? <div className={s.noTransitions}><UpdateIcon aria-hidden="true" /><strong>Chưa có bước chuyển khả dụng</strong><span>Mẫu đánh giá này chưa có trạng thái có thể chuyển.</span></div> : <div className={s.targetGrid}>{statuses.map((status) => <label key={status} className={s.targetOption} data-selected={selected === status} data-tone={statusTone(status)} data-current={statusKey(status) === row.status}>
            <input type="radio" name="target-status" value={status} checked={selected === status} disabled={statusKey(status) === row.status} onChange={() => setSelected(status)} />
            <span className={s.targetIcon}>{statusTone(status) === "danger" ? <Cross2Icon aria-hidden="true" /> : statusTone(status) === "success" ? <CheckIcon aria-hidden="true" /> : <UpdateIcon aria-hidden="true" />}</span>
            <span><strong><HrStatus value={status} /></strong><small>{statusKey(status) === row.status ? "Trạng thái hiện tại" : statusTone(status) === "danger" ? "Trả lại hồ sơ để xử lý" : statusTone(status) === "success" ? "Ghi nhận bước hoàn thành" : "Chuyển sang bước xử lý này"}</small></span><span className={s.radioMark} aria-hidden="true">{selected === status && <CheckIcon />}</span>
          </label>)}</div>}
        </fieldset>{statuses.length > 0 && <label className={s.reasonField}><span>Lý do thay đổi <small>Không bắt buộc</small></span><textarea rows={2} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Ghi chú để các bên tiện theo dõi…" /></label>}</>}{failure}
      </div>
      <footer className={s.dialogFooter}><button type="button" className={s.button} disabled={busy} onClick={close}>Hủy thay đổi</button><button type="submit" className={s.button + " " + s.primary} disabled={loading || busy || selected === null || statusKey(selected) === row.status}>{busy ? "Đang cập nhật…" : "Xác nhận chuyển"}<ArrowRightIcon aria-hidden="true" /></button></footer>
    </form>
    : <form className={s.deleteLayout} onSubmit={submit} aria-busy={busy}>
      <header className={s.deleteHeader}>{closeButton}<span className={s.deleteSymbol}><TrashIcon aria-hidden="true" /></span><h2 id="hr-dialog-title">Xóa bản đánh giá?</h2><p id="hr-delete-description">Hồ sơ sẽ bị xóa khỏi danh sách.<br />Kiểm tra thông tin trước khi xác nhận.</p></header>
      <div className={s.deleteBody}><div className={s.deleteRecord}><div className={s.deleteRecordTop}><FileTextIcon aria-hidden="true" /><span>Bản đánh giá #{row.id}</span><HrStatus value={row.status} /></div><RecordIdentity row={row} /><strong>{row.period || "Chưa có kỳ đánh giá"}</strong><p>{row.templateName || "Chưa có tên bản đánh giá"}</p></div>{failure}</div>
      <footer className={s.dialogFooter}><button ref={cancelRef} type="button" className={s.button} disabled={busy} onClick={close}>Giữ lại hồ sơ</button><button type="submit" className={`${s.button} ${s.dangerButton}`} disabled={busy}><TrashIcon aria-hidden="true" />{busy ? "Đang xóa…" : "Xác nhận xóa"}</button></footer>
    </form>}
  </dialog>;
}

const encoder = new TextEncoder();
function xml(value: string | number) {
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"})[character]!);
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files: [string, string][]) {
  const parts: Uint8Array[] = [], directory: Uint8Array[] = [];
  let offset = 0, directorySize = 0;
  for (const [filename, content] of files) {
    const name = encoder.encode(filename), data = encoder.encode(content), crc = crc32(data);
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true); lv.setUint16(12, 0x21, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    parts.push(local, data); directory.push(central); offset += local.length + data.length; directorySize += central.length;
  }
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
  const output = new Uint8Array(offset + directorySize + 22);
  let cursor = 0;
  for (const part of [...parts, ...directory, end]) { output.set(part, cursor); cursor += part.length; }
  return output;
}

function createGeneralHrWorkbook(items: GeneralHrEvaluationDto[]) {
  const rows: (string | number)[][] = [["Mã hồ sơ", "UserId", "Mã HT", "Tên nhân viên", "Đơn vị", "Phòng ban", "Kỳ đánh giá", "Bản đánh giá", "Ngày nộp", "Trạng thái", "Quản lý trực tiếp"], ...items.map((item) => [item.id, item.userId, item.systemCode ?? "", item.name, item.companyCode ?? "", item.departmentName ?? "", item.period ?? "", item.templateName ?? "", formatEvaluationDate(item.submitDate ?? null, ""), hrStatusLabel(item.status), item.strDirectManager ?? ""])];
  const sheet = rows.map((row, index) => `<row r="${index + 1}">${row.map((cell, column) => `<c r="${String.fromCharCode(65 + column)}${index + 1}" t="inlineStr"${index === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(cell)}</t></is></c>`).join("")}</row>`).join("");
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ["xl/workbook.xml", `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Đánh giá KPI" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ["xl/styles.xml", `<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF131F6B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ["xl/worksheets/sheet1.xml", `<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="3" width="20" customWidth="1"/><col min="4" max="6" width="32" customWidth="1"/><col min="7" max="8" width="58" customWidth="1"/><col min="9" max="11" width="30" customWidth="1"/></cols><sheetData>${sheet}</sheetData><autoFilter ref="A1:K${rows.length}"/></worksheet>`],
  ]);
}
