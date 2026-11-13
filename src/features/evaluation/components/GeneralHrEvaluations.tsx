"use client";

import Image from "next/image";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ActivityLogIcon, ArrowRightIcon, CheckIcon, ClockIcon, ChevronDownIcon, Cross2Icon, DotsHorizontalIcon, DownloadIcon, ExclamationTriangleIcon, EyeOpenIcon, FileTextIcon, MagnifyingGlassIcon, MixerHorizontalIcon, PersonIcon, ReloadIcon, ResetIcon, TrashIcon, UpdateIcon } from "@radix-ui/react-icons";
import { notify } from "@/components/ui/Toaster";
import { generalHrEvaluationApi as api } from "../services/generalHrEvaluationApi";
import { evaluationLookupApi } from "../services/evaluationLookupApi";
import { generalHrStatusOptions, type ApprovalHistoryEntry, type EvaluationApprover, type EvaluationFilterOption, type EvaluationTypeOption, type GeneralHrEvaluationDto, type GeneralHrEvaluationRequest } from "@/features/evaluation/types";
import { UserRoleSystem } from "@/features/auth/types";
import { type PagedResult } from "@/lib/api/types";
import { formatEvaluationDate, requestMessage, companyOptions, periodOptions, evaluationTypeOptions, statusKey, hrStatusLabel } from "../evaluationDisplay";
import { Pagination } from "@/components/ui/Pagination";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import "./GeneralHrEvaluations.css";
import { companyLogos } from "@/features/company/companyLogos";

function statusTone(value: string | number) {
  const key = statusKey(value);
  if (key === "Rejected") return "danger";
  if (["CompileHRList", "SentHR", "Over"].includes(key)) return "success";
  if (["Drafted", "Unknown", "Imported"].includes(key)) return "neutral";
  return "progress";
}
type Filters = { keyword: string; companyId: string; departmentId: string; reviewerId: string; typeId: string; periodId: string; statuses: string[]; order: "asc" | "desc" };
const emptyFilters: Filters = { keyword: "", companyId: "", departmentId: "", reviewerId: "", typeId: "", periodId: "", statuses: [], order: "desc" };

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
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "generating" | "complete">("idle");
  const [exportTotal, setExportTotal] = useState(0);
  const exporting = exportStatus !== "idle";
  const exportLabel = exportStatus === "complete" ? "Đã tải Excel" : exportStatus === "generating" ? "Đang tạo Excel" : "Đang lấy dữ liệu";
  const exportController = useRef<AbortController | null>(null);
  const exportButton = useRef<HTMLButtonElement>(null), exportCancelButton = useRef<HTMLButtonElement>(null);
  const [dialog, setDialog] = useState<{ mode: HrDialogMode; row: GeneralHrEvaluationDto } | null>(null);
  const [trackedId, setTrackedId] = useState<number | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(true);
  const requestBody = useMemo<GeneralHrEvaluationRequest>(() => ({ Page: page, PageSize: pageSize, Filters: { keyword: applied.keyword, companyid: applied.companyId, departmentid: applied.departmentId, evaluationtypeid: applied.typeId, periodid: applied.periodId, userapprove: applied.reviewerId, status: applied.statuses.join(";"), ismatchall: !applied.statuses.length || applied.statuses.length === generalHrStatusOptions.length ? "true" : "false", sortBy: "Id", sortOrder: applied.order } }), [applied, page, pageSize]);
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
    Promise.allSettled([evaluationLookupApi.getCompanies(UserRoleSystem.HR, controller.signal), evaluationLookupApi.getTypes(controller.signal), api.getReviewers(controller.signal)]).then(([companyResult, typeResult, reviewerResult]) => {
      if (controller.signal.aborted) return;
      setCompanies(companyResult.status === "fulfilled" ? companyOptions(companyResult.value) : []);
      setTypes(typeResult.status === "fulfilled" ? evaluationTypeOptions(typeResult.value) : []);
      setReviewers(reviewerResult.status === "fulfilled" ? reviewerResult.value.map((reviewer) => ({ id: reviewer.id, name: `${reviewer.fullName}${reviewer.systemCode ? ` · ${reviewer.systemCode}` : ""}` })) : []);
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
    evaluationLookupApi.getDepartments(filters.companyId, UserRoleSystem.HR, controller.signal).then((result) => { if (!controller.signal.aborted) setDepartments(periodOptions(result)); })
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
    setExportTotal(data.total); setExportStatus("loading");
    requestAnimationFrame(() => exportCancelButton.current?.focus({ preventScroll: true }));
    try {
      const result = await api.getPaged({ ...requestBody, Page: 1, PageSize: data.total }, controller.signal);
      controller.signal.throwIfAborted();
      if (!result.total || result.items.length !== result.total) throw new Error("INCOMPLETE_EXPORT");
      setExportTotal(result.total); setExportStatus("generating");
      const { createGeneralHrWorkbook } = await import("../generalHrExport");
      controller.signal.throwIfAborted();
      const blob = await createGeneralHrWorkbook(result.items);
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `danh-gia-kpi-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus("complete");
      notify("success", `Đã xuất ${result.total} bản đánh giá.`);
      await new Promise<void>((resolve) => setTimeout(resolve, 900));
    } catch (cause) {
      if (!controller.signal.aborted) notify("error", requestMessage(cause, "Chưa xuất được đầy đủ dữ liệu. Vui lòng thử lại."));
    } finally {
      if (exportController.current === controller) {
        exportController.current = null; setExportStatus("idle");
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(() => exportButton.current?.focus({ preventScroll: true }));
      }
    }
  }

  return <section className="general-hr-evaluations__page" aria-labelledby="general-hr-title">
    <header className="general-hr-evaluations__hero" data-exporting={exporting}>
        <div className="general-hr-evaluations__heroCopy"><h1 id="general-hr-title">Theo dõi đánh giá<span>.</span></h1><p>Nắm rõ tiến trình. Theo sát người duyệt.</p><span className="general-hr-evaluations__heroScope"><PersonIcon aria-hidden="true" />HR tổng hợp · Công ty theo quyền của bạn</span></div>
        <div className="general-hr-evaluations__heroActions">
          <div className="general-hr-evaluations__exportControl" data-active={exporting} data-state={exportStatus}>
            <span className="general-hr-evaluations__exportSurface" aria-hidden="true" onTransitionEnd={(event) => { if (event.propertyName === "clip-path" && !exportController.current) exportButton.current?.focus({ preventScroll: true }); }} />
            <button ref={exportButton} type="button" className="general-hr-evaluations__exportButton" aria-label="Xuất Excel" aria-hidden={exporting || undefined} tabIndex={exporting ? -1 : 0} onClick={exportExcel} disabled={loading || !!error || !data?.total || exporting}><DownloadIcon aria-hidden="true" /><span>Xuất Excel</span></button>
            <div className="general-hr-evaluations__exportProgress" aria-hidden={!exporting} inert={!exporting}>
              <span className="general-hr-evaluations__exportGlyph" aria-hidden="true"><DownloadIcon /><CheckIcon /></span>
              <div><div className="general-hr-evaluations__exportProgressLabel"><span id="hr-export-label">{exportLabel}</span><strong>XLSX</strong></div><div className="general-hr-evaluations__exportTrack" role="progressbar" aria-labelledby="hr-export-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={exportStatus === "complete" ? 100 : undefined} aria-valuetext={exportLabel}><span /></div></div>
              <button ref={exportCancelButton} type="button" className="general-hr-evaluations__exportCancel" aria-label={exportStatus === "complete" ? "Đóng thông báo tải Excel" : "Hủy xuất Excel"} onClick={cancelExport}><Cross2Icon aria-hidden="true" /></button>
            </div>
          </div>
          <span role="status">{exporting ? `${exportLabel} · ${exportTotal.toLocaleString("vi-VN")} hồ sơ` : ""}</span>
        </div>
    </header>
    <div className="general-hr-evaluations__workspace">
      <form className="general-hr-evaluations__filters" aria-label="Lọc hồ sơ đánh giá" data-expanded={advancedOpen} onSubmit={applyFilters}>
        <div className="general-hr-evaluations__searchRow">
          <label className={"general-hr-evaluations__field" + " " + "general-hr-evaluations__search"}><span>Nhân viên</span><div className="general-hr-evaluations__inputWrap"><MagnifyingGlassIcon aria-hidden="true" /><input type="search" placeholder="Tìm tên hoặc mã nhân viên…" value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} /></div></label>
          <div className="general-hr-evaluations__field"><span>Công ty</span><SearchableSelect id="hr-company-filter" label="Công ty" value={filters.companyId} options={companies} placeholder="Tất cả công ty" disabled={lookupBusy || !companies.length} onChange={(value) => setFilters((current) => ({ ...current, companyId: value, departmentId: "" }))} /></div>
          <div className="general-hr-evaluations__field"><span>Phòng ban</span><SearchableSelect id="hr-department-filter" label="Phòng ban" value={filters.departmentId} options={departments} placeholder={filters.companyId ? "Tất cả phòng ban" : "Chọn công ty trước"} disabled={!filters.companyId || departmentBusy || !departments.length} onChange={(value) => updateFilter("departmentId", value)} /></div>
          <div className="general-hr-evaluations__field"><span>Người đang duyệt</span><SearchableSelect id="hr-reviewer-filter" label="Người đang duyệt" value={filters.reviewerId} options={reviewers} placeholder="Tất cả người duyệt" disabled={lookupBusy || !reviewers.length} onChange={(value) => updateFilter("reviewerId", value)} /></div>
          <div className="general-hr-evaluations__filterActions">
            <button className="general-hr-evaluations__moreFilters" type="button" data-active={advancedCount > 0} aria-expanded={advancedOpen} aria-controls="hr-extra-filters" onClick={() => setAdvancedOpen(!advancedOpen)}><MixerHorizontalIcon aria-hidden="true" /><span>Lọc thêm</span>{advancedCount > 0 && <b>{advancedCount}</b>}<ChevronDownIcon aria-hidden="true" /></button>
            <button type="button" className="general-hr-evaluations__iconButton" aria-label="Xóa tất cả bộ lọc" title="Xóa tất cả bộ lọc" onClick={clearFilters}><ResetIcon aria-hidden="true" /></button>
            <button type="submit" className={"general-hr-evaluations__button" + " " + "general-hr-evaluations__primary"}><MagnifyingGlassIcon aria-hidden="true" />Áp dụng</button>
          </div>
        </div>
        <div className="general-hr-evaluations__filterRow" id="hr-extra-filters" hidden={!advancedOpen}>
          <div className="general-hr-evaluations__field"><span>Loại đánh giá</span><SearchableSelect id="hr-type-filter" label="Loại đánh giá" value={filters.typeId} options={types} placeholder="Tất cả loại đánh giá" disabled={lookupBusy || !types.length} onChange={(value) => setFilters((current) => ({ ...current, typeId: value, periodId: "" }))} /></div>
          <div className="general-hr-evaluations__field"><span>Kỳ đánh giá</span><SearchableSelect id="hr-period-filter" label="Kỳ đánh giá" value={filters.periodId} options={periods} placeholder={filters.typeId ? "Tất cả kỳ đánh giá" : "Chọn loại đánh giá trước"} disabled={!filters.typeId || lookupBusy || !periods.length} onChange={(value) => updateFilter("periodId", value)} /></div>
          <div className="general-hr-evaluations__field"><span>Trạng thái</span><SearchableSelect id="hr-status-filter" label="Trạng thái" multiple value={filters.statuses} options={generalHrStatusOptions.map(option => ({ id: option.value, name: option.label }))} placeholder="Tất cả trạng thái" onChange={(statuses) => setFilters((current) => ({ ...current, statuses }))} /></div>
          <label className="general-hr-evaluations__field"><span>Sắp xếp</span><div className="general-hr-evaluations__selectWrap"><select value={filters.order} onChange={(event) => updateFilter("order", event.target.value)}><option value="desc">Hồ sơ mới trước</option><option value="asc">Hồ sơ cũ trước</option></select><ChevronDownIcon aria-hidden="true" /></div></label>
        </div>
        {(lookupError || departmentError) && <div className="general-hr-evaluations__notice" role="alert"><span>{lookupError || departmentError}</span><button type="button" onClick={() => setLookupRevision((value) => value + 1)}>Thử lại</button></div>}
        <p className="general-hr-evaluations__filterHint" role="status">{dirty ? "Có thay đổi chưa áp dụng. Nhấn Áp dụng để cập nhật danh sách." : ""}</p>
      </form>
    </div>

    <div className="general-hr-evaluations__recordsLayout" data-tracking={!!trackedRow}>
    <div className="general-hr-evaluations__records">
      <header className="general-hr-evaluations__recordsHeader"><div><FileTextIcon aria-hidden="true" /><h2>Hồ sơ đánh giá</h2><span className="general-hr-evaluations__count">{loading ? "…" : error ? "—" : (data?.total ?? 0).toLocaleString("vi-VN")}</span>{filterCount > 0 && <span className="general-hr-evaluations__appliedCount">{filterCount} bộ lọc</span>}</div><div className="general-hr-evaluations__recordsTools">{data && !loading && !error && <span>{data.items.length} hồ sơ đang hiển thị</span>}<button type="button" className="general-hr-evaluations__iconButton" aria-label="Tải lại danh sách" onClick={() => setRevision((value) => value + 1)} disabled={loading}><ReloadIcon aria-hidden="true" /></button></div></header>
      <div aria-busy={loading}>
        {loading ? <div className="general-hr-evaluations__skeletons" role="status"><span className="general-hr-evaluations__srOnly">Đang tải hồ sơ đánh giá…</span>{Array.from({ length: 5 }, (_, i) => <div key={i} className="general-hr-evaluations__skeleton" aria-hidden="true"><i /><div><i /><i /></div><i /><i /></div>)}</div>
          : error ? <div className="general-hr-evaluations__empty" role="alert"><span className="general-hr-evaluations__emptyIcon"><FileTextIcon aria-hidden="true" /></span><h3>Chưa thể mở danh sách</h3><p>{error}</p><button className={`general-hr-evaluations__button general-hr-evaluations__primary`} onClick={() => setRevision((value) => value + 1)}>Tải lại hồ sơ</button>{error.includes("đăng nhập") && <a href="/login?next=/admin/evaluationList">Đăng nhập lại</a>}</div>
          : !data?.items.length ? <div className="general-hr-evaluations__empty"><span className="general-hr-evaluations__emptyIcon"><MagnifyingGlassIcon aria-hidden="true" /></span><h3>Chưa có hồ sơ phù hợp</h3><p>Thử chọn người duyệt hoặc kỳ đánh giá khác, hoặc xóa bộ lọc để xem lại danh sách.</p><button className="general-hr-evaluations__button" onClick={clearFilters}>Xóa bộ lọc</button></div>
          : <div className="general-hr-evaluations__tableWrap"><table className="general-hr-evaluations__table"><caption className="general-hr-evaluations__srOnly">Danh sách bản đánh giá và tiến trình xử lý</caption><colgroup><col className="general-hr-evaluations__employeeCol" /><col className="general-hr-evaluations__evaluationCol" /><col className="general-hr-evaluations__organizationCol" /><col className="general-hr-evaluations__progressCol" /><col className="general-hr-evaluations__actionCol" /></colgroup><thead><tr><th scope="col">Nhân viên</th><th scope="col">Hồ sơ / kỳ đánh giá</th><th scope="col" className="general-hr-evaluations__organizationHeading">Đơn vị</th><th scope="col">Tiến trình xử lý</th><th scope="col"><span className="general-hr-evaluations__srOnly">Thao tác</span></th></tr></thead><tbody>{data.items.map((row) => {
            const actions = <><button type="button" onClick={(event) => { event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover(); openDialog("approvers", row); }}><PersonIcon aria-hidden="true" />Người đang duyệt</button><button type="button" disabled={!row.templateId} onClick={(event) => { event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover(); openDialog("status", row); }}><UpdateIcon aria-hidden="true" />Chuyển trạng thái</button><button type="button" disabled><EyeOpenIcon aria-hidden="true" />Xem bản đánh giá</button><button type="button" className="general-hr-evaluations__dangerMenuItem" onClick={(event) => { event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover(); openDialog("delete", row); }}><TrashIcon aria-hidden="true" />Xóa bản đánh giá</button></>;
            return <tr key={row.id} data-selected={trackedRow?.id === row.id || dialog?.row.id === row.id}>
            <td data-label="Nhân viên" className="general-hr-evaluations__employeeCell"><div className="general-hr-evaluations__employee"><span className="general-hr-evaluations__avatar"><PersonIcon aria-hidden="true" /></span><div><strong title={row.name}>{row.name}</strong><span title={row.systemCode || row.userId}>{row.systemCode || row.userId}</span></div></div></td>
            <td data-label="Hồ sơ / kỳ đánh giá" className="general-hr-evaluations__evaluationCell"><strong className="general-hr-evaluations__period">{row.period || "Chưa có kỳ đánh giá"}</strong><span className="general-hr-evaluations__template">{row.templateName || "Chưa có tên bản đánh giá"}</span></td>
            <td data-label="Đơn vị" className="general-hr-evaluations__organizationCell"><span className="general-hr-evaluations__companyIdentity" title={row.companyCode || "Chưa có đơn vị"}><Image className="general-hr-evaluations__companyLogo" src={companyLogos[row.companyCode?.trim().toUpperCase() ?? ""] ?? "/brand/deoca-icon.svg"} alt="" width={32} height={32} /><span>{row.companyCode || "—"}</span></span><span className="general-hr-evaluations__department">{row.departmentName || "Chưa có phòng ban"}</span></td>
            <td data-label="Tiến trình xử lý" className="general-hr-evaluations__progressCell"><HrStatus value={row.status} />{row.strDirectManager && row.status === "DirectManagerReviewing" ? <button type="button" className="general-hr-evaluations__reviewerLink" onClick={() => openDialog("approvers", row)}><PersonIcon aria-hidden="true" />{row.strDirectManager}</button> : /Reviewing$/.test(row.status) ? <button type="button" className="general-hr-evaluations__reviewerLink" onClick={() => openDialog("approvers", row)}><PersonIcon aria-hidden="true" />Xem người đang duyệt</button> : null}<span className="general-hr-evaluations__submitted">{row.submitDate && new Date(row.submitDate).getFullYear() > 1900 ? <time dateTime={row.submitDate}>Nộp {formatEvaluationDate(row.submitDate)}</time> : "Chưa có ngày nộp"}</span></td>
            <td className="general-hr-evaluations__actionCell"><div className="general-hr-evaluations__rowActions"><button type="button" className="general-hr-evaluations__trackButton" data-track-id={row.id} data-active={trackedRow?.id === row.id} aria-expanded={trackedRow?.id === row.id} aria-controls={trackedRow?.id === row.id ? "hr-tracking-panel" : undefined} onClick={() => { setTrackedId(row.id); setTrackingOpen(true); }} aria-label={"Theo dõi hồ sơ của " + row.name}>{trackedRow?.id === row.id ? <ActivityLogIcon aria-hidden="true" /> : <ArrowRightIcon aria-hidden="true" />}<span>{trackedRow?.id === row.id ? "Đang xem" : "Theo dõi"}</span></button><button type="button" className="general-hr-evaluations__iconButton" onClick={() => openDialog("approvers", row)} aria-label={`Người đang duyệt hồ sơ ${row.id}`} aria-haspopup="dialog" title="Người đang duyệt"><PersonIcon aria-hidden="true" /></button><button type="button" className="general-hr-evaluations__iconButton" popoverTarget={`hr-actions-${row.id}`} style={{ anchorName: `--hr-actions-${row.id}` } as CSSProperties} aria-label={`Thao tác với hồ sơ ${row.id}`}><DotsHorizontalIcon aria-hidden="true" /></button></div><div id={`hr-actions-${row.id}`} popover="auto" className="general-hr-evaluations__actionMenu" style={{ positionAnchor: `--hr-actions-${row.id}` } as CSSProperties}>
              <p>Hồ sơ #{row.id}</p>{actions}
            </div><div className="general-hr-evaluations__mobileActions" role="group" aria-label={"Thao tác hồ sơ " + row.id}>{actions}</div></td>
          </tr>;
          })}</tbody></table></div>}
      </div>
      <Pagination itemLabel="bản đánh giá" page={page} pageSize={pageSize} total={data?.total ?? null} loading={loading} error={!!error} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </div>
    {trackedRow && <HrTrackingPanel key={trackedRow.id + ":" + revision} row={trackedRow} onClose={() => { setTrackingOpen(false); document.querySelector<HTMLButtonElement>('[data-track-id="' + trackedRow.id + '"]')?.focus({ preventScroll: true }); }} onHistory={() => openDialog("history", trackedRow)} onApprovers={() => openDialog("approvers", trackedRow)} />}
    </div>
    <p className="general-hr-evaluations__pageNote"><PersonIcon aria-hidden="true" />Mở “Người đang duyệt” để biết ai đang xử lý từng hồ sơ.</p>
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
  return <aside id="hr-tracking-panel" className="general-hr-evaluations__trackingPanel" aria-labelledby="hr-tracking-title">
    <header className="general-hr-evaluations__trackingHeader"><h2 id="hr-tracking-title"><ActivityLogIcon aria-hidden="true" />Đang theo dõi</h2><button type="button" className="general-hr-evaluations__iconButton" aria-label="Đóng khung theo dõi" onClick={onClose}><Cross2Icon aria-hidden="true" /></button></header>
    <p className="general-hr-evaluations__trackingId">HỒ SƠ #{row.id}</p><h3 className="general-hr-evaluations__trackingTitle">{row.period || "Chưa có kỳ đánh giá"}</h3>
    <RecordIdentity row={row} />
    <div className="general-hr-evaluations__trackingState" data-tone={reviewing ? "waiting" : statusTone(row.status)}>{reviewing ? <ClockIcon aria-hidden="true" /> : statusTone(row.status) === "success" ? <CheckIcon aria-hidden="true" /> : <FileTextIcon aria-hidden="true" />}<div><strong>{reviewing ? "Đang chờ phê duyệt" : hrStatusLabel(row.status)}</strong>{reviewing && <span>{hrStatusLabel(row.status)}</span>}</div></div>
    {row.submitDate && new Date(row.submitDate).getFullYear() > 1900 && <p className="general-hr-evaluations__trackingDate">Ngày nộp · {formatEvaluationDate(row.submitDate)}</p>}
    <div className="general-hr-evaluations__trackingSectionTitle"><h3>Tiến trình phê duyệt</h3>{details && !details.historyError && <span>{details.history.length} dấu mốc</span>}</div>
    {!details ? <div className="general-hr-evaluations__dialogLoading" role="status"><span className="general-hr-evaluations__srOnly">Đang tải tiến trình hồ sơ…</span><i /><i /><i /></div> : <>
      {details.historyError ? <p className="general-hr-evaluations__trackingError" role="alert">{details.historyError}</p> : history.length ? <ol className="general-hr-evaluations__trackingTimeline">{history.map((entry) => <li key={entry.approvalId} data-tone={statusTone(entry.status)}><span className="general-hr-evaluations__trackingNode" aria-hidden="true">{entry.status === "Rejected" ? <Cross2Icon /> : <CheckIcon />}</span><div><strong>{entry.statusValue || hrStatusLabel(entry.status)}</strong><time dateTime={entry.createdAt}>{formatEvaluationDate(entry.createdAt)}</time>{entry.approverName && <span>{entry.approverName}</span>}</div></li>)}</ol> : <p className="general-hr-evaluations__trackingEmpty">Chưa có lịch sử phê duyệt.</p>}
      {reviewing && <div className="general-hr-evaluations__trackingCurrent"><span className="general-hr-evaluations__trackingNode" aria-hidden="true"><ClockIcon /></span><div><strong>{hrStatusLabel(row.status)}</strong>{details.approversError ? <p className="general-hr-evaluations__trackingError" role="alert">{details.approversError}</p> : details.approvers.length ? <ul>{details.approvers.map((person) => <li key={person.id}><span className="general-hr-evaluations__trackingAvatar"><PersonIcon aria-hidden="true" /></span>{person.userName}</li>)}</ul> : row.strDirectManager && row.status === "DirectManagerReviewing" ? <span>{row.strDirectManager}</span> : <span>Chưa có người đang duyệt.</span>}</div></div>}
      {(details.historyError || details.approversError) && <button type="button" className="general-hr-evaluations__trackingRetry" onClick={() => setRevision((value) => value + 1)}><ReloadIcon aria-hidden="true" />Thử tải lại</button>}
    </>}
    <button type="button" className="general-hr-evaluations__trackingHistoryButton" onClick={onHistory}><ActivityLogIcon aria-hidden="true" />Xem toàn bộ quá trình<ArrowRightIcon aria-hidden="true" /></button>
    <button type="button" className="general-hr-evaluations__trackingPeopleButton" onClick={onApprovers}><PersonIcon aria-hidden="true" />Xem người đang duyệt<ArrowRightIcon aria-hidden="true" /></button>
    <p className="general-hr-evaluations__trackingNote">Theo dõi người xử lý và các dấu mốc của hồ sơ tại một nơi.</p>
  </aside>;
}

type HrDialogMode = "history" | "approvers" | "status" | "delete";
type DialogProps = { mode: HrDialogMode; row: GeneralHrEvaluationDto; onClose: () => void; onModeChange: (mode: HrDialogMode) => void; onMutated: () => void };
const titles: Record<HrDialogMode, string> = { history: "Quá trình phê duyệt", approvers: "Người đang duyệt", status: "Chuyển trạng thái", delete: "Xóa bản đánh giá?" };


function HrStatus({ value }: { value: string | number }) {
  if (typeof value === "string" && value.includes(";")) return <span className="general-hr-evaluations__statusGroup">{value.split(";").filter(Boolean).map((part) => <HrStatus key={part} value={part} />)}</span>;
  return <span className="general-hr-evaluations__status" data-tone={statusTone(value)}><i aria-hidden="true" />{hrStatusLabel(value)}</span>;
}

function RecordIdentity({ row }: { row: GeneralHrEvaluationDto }) {
  return <div className="general-hr-evaluations__dialogIdentity"><span className="general-hr-evaluations__identityAvatar"><PersonIcon aria-hidden="true" /></span><div><strong>{row.name}</strong><span>{row.systemCode || row.userId} · {row.companyCode || "Chưa có đơn vị"}</span></div></div>;
}

export function GeneralHrEvaluationDialog({ mode, row, onClose, onModeChange, onMutated }: DialogProps) {
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
    else if (mode === "status" && row.templateId) work = api.getStatuses(row.templateId, controller.signal).then((result) => { if (!controller.signal.aborted) setStatuses([...new Set(result.map(item => item.status))].filter(status => status !== 1 && status !== 9)); });
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
      notify("success", mode === "delete" ? `Đã xóa bản đánh giá #${row.id}.` : "Đã cập nhật trạng thái bản đánh giá.");
      onMutated();
    } catch (cause: unknown) {
      const message = requestMessage(cause, mode === "delete" ? "Chưa xóa được hồ sơ. Vui lòng thử lại." : "Chưa cập nhật được trạng thái. Vui lòng thử lại.");
      setError(message);
      notify("error", message);
    }
    finally { busyRef.current = false; setBusy(false); }
  }

  const detailsError = !!error && !busy && mode !== "delete" && mode !== "status";
  const close = () => { if (!busyRef.current) onClose(); };
  const closeButton = <button type="button" className="general-hr-evaluations__dialogClose" aria-label={`Đóng ${titles[mode].toLowerCase()}`} disabled={busy} onClick={close}><Cross2Icon aria-hidden="true" /></button>;
  const failure = error && <div className="general-hr-evaluations__dialogError" role="alert"><ExclamationTriangleIcon aria-hidden="true" /><span>{error}</span>{(detailsError || (mode === "status" && !statuses.length)) && <button type="button" onClick={() => setRevision((value) => value + 1)}><ReloadIcon aria-hidden="true" />Thử lại</button>}</div>;
  const loadingState = <div className="general-hr-evaluations__dialogLoading" role="status"><span className="general-hr-evaluations__srOnly">Đang tải thông tin…</span><i /><i /><i /></div>;

  return <dialog ref={ref} className="general-hr-evaluations__dialog" data-variant={mode} aria-labelledby="hr-dialog-title" aria-describedby={mode === "delete" ? "hr-delete-description" : undefined} onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); }}>
    {mode === "history" ? <div className="general-hr-evaluations__historyLayout">
      <header className="general-hr-evaluations__historyHeader"><div className="general-hr-evaluations__dialogTitleGroup"><span className="general-hr-evaluations__dialogTitleIcon"><ActivityLogIcon aria-hidden="true" /></span><div><h2 id="hr-dialog-title">Quá trình phê duyệt</h2><p>Toàn bộ dấu mốc của hồ sơ #{row.id}</p></div></div>{closeButton}</header>
      <div className="general-hr-evaluations__historyRecord">
        <div className="general-hr-evaluations__historyRecordTop"><RecordIdentity row={row} /><div className="general-hr-evaluations__historyCurrent"><span>Trạng thái hiện tại</span><HrStatus value={row.status} /></div></div>
        <dl className="general-hr-evaluations__historyFacts"><div><dt>Kỳ đánh giá</dt><dd>{row.period || "Chưa có kỳ đánh giá"}</dd></div><div><dt>Phòng ban</dt><dd>{row.departmentName || "Chưa có phòng ban"}</dd></div><div><dt>Ngày nộp</dt><dd>{formatEvaluationDate(row.submitDate ?? null, row.submitDate === undefined ? "Chưa có thông tin" : "Chưa nộp")}</dd></div></dl>
      </div>
      <section className="general-hr-evaluations__historyContent" aria-label="Nhật ký xử lý">
        <div className="general-hr-evaluations__sectionTitle"><h3><ActivityLogIcon aria-hidden="true" />Nhật ký xử lý</h3>{!loading && !error && <span>{history.length} dấu mốc · Mới nhất trước</span>}</div>
        {loading ? loadingState : error ? failure : !history.length ? <div className="general-hr-evaluations__modalEmpty"><ActivityLogIcon aria-hidden="true" /><h3>Chưa có lịch sử duyệt</h3><p>Các lần gửi, duyệt hoặc từ chối sẽ được ghi nhận tại đây.</p></div> : <ol className="general-hr-evaluations__timeline">
          {[...history].reverse().map((entry, index) => <li key={entry.approvalId} data-tone={statusTone(entry.status)} data-last={index === 0}>
            <time className="general-hr-evaluations__eventTime" dateTime={entry.createdAt}>{formatEvaluationDate(entry.createdAt)}</time>
            <span className="general-hr-evaluations__timelineNode" aria-hidden="true">{statusTone(entry.status) === "danger" ? <Cross2Icon /> : <CheckIcon />}</span>
            <div className="general-hr-evaluations__eventContent"><div className="general-hr-evaluations__eventHeader"><div className="general-hr-evaluations__eventPerson"><span className="general-hr-evaluations__smallAvatar"><PersonIcon aria-hidden="true" /></span><div><strong>{entry.approverName || "Chưa xác định người xử lý"}</strong><span>{entry.approverUserId || "Chưa có mã người xử lý"}</span></div></div>{index === 0 && <span className="general-hr-evaluations__latestEvent">Mới nhất</span>}</div>
              <div className="general-hr-evaluations__eventBadges" role="group" aria-label="Thông tin dấu mốc">
                <span className="general-hr-evaluations__eventBadge" data-kind="level">Level {entry.approvalLevel || "Unknown"}</span>
                <span className="general-hr-evaluations__eventBadge" data-kind="action">{entry.status || "Unknown"}</span>
                <span className="general-hr-evaluations__eventBadge" data-kind="status" data-tone={statusTone(entry.status)}>{entry.statusValue || hrStatusLabel(entry.status)}</span>
              </div>
              {entry.comment && <blockquote>{entry.comment}</blockquote>}
            </div>
          </li>)}
        </ol>}
      </section>
      <footer className="general-hr-evaluations__historyFooter"><button type="button" className="general-hr-evaluations__textButton" onClick={() => onModeChange("approvers")}><PersonIcon aria-hidden="true" />Người đang duyệt<ArrowRightIcon aria-hidden="true" /></button><button type="button" className={"general-hr-evaluations__button" + " " + "general-hr-evaluations__primary"} onClick={close}>Đóng khung theo dõi</button></footer>
    </div>
    : mode === "approvers" ? <div className="general-hr-evaluations__peopleLayout">
      <header className="general-hr-evaluations__peopleHeader"><div className="general-hr-evaluations__dialogTitleGroup"><span className="general-hr-evaluations__dialogTitleIcon"><PersonIcon aria-hidden="true" /></span><div><h2 id="hr-dialog-title">Người đang duyệt</h2><p>Thông tin người xử lý tại bước hiện tại.</p></div></div>{closeButton}</header>
      <div className="general-hr-evaluations__peopleRecord"><div><span className="general-hr-evaluations__peopleRecordRef"><FileTextIcon aria-hidden="true" />Hồ sơ #{row.id}</span><strong>{row.name}</strong><span className="general-hr-evaluations__peopleDepartment">{row.departmentName || row.companyCode || "Chưa có đơn vị"}</span></div><HrStatus value={row.status} /></div>
      <div className="general-hr-evaluations__peopleBody">{loading ? loadingState : error ? failure : !approvers.length ? <div className="general-hr-evaluations__modalEmpty"><PersonIcon aria-hidden="true" /><h3>Chưa có người đang duyệt</h3><p>Hồ sơ hiện chưa có người xử lý tại bước này. Bạn có thể xem lại quá trình phê duyệt.</p></div> : <><div className="general-hr-evaluations__sectionTitle"><h3>Người xử lý</h3><span>{approvers.length} người</span></div><ul className="general-hr-evaluations__approverList">{approvers.map((person) => <li key={person.id}><span className="general-hr-evaluations__personAvatar" aria-hidden="true">{person.userName.trim().slice(0, 1).toLocaleUpperCase("vi") || "?"}</span><div><h3>{person.userName}</h3><span>{person.systemCode || person.userId || "Chưa có mã HT"}</span><p>{hrStatusLabel(person.status)}</p></div><span className="general-hr-evaluations__personState" data-approved={person.isApprove}>{person.isApprove ? <CheckIcon aria-hidden="true" /> : <ClockIcon aria-hidden="true" />}{person.isApprove ? "Đã duyệt" : "Chưa duyệt"}</span>{person.message && <blockquote className="general-hr-evaluations__personMessage">{person.message}</blockquote>}</li>)}</ul></>}</div>
      <footer className="general-hr-evaluations__dialogFooter"><button type="button" className="general-hr-evaluations__textButton" onClick={() => onModeChange("history")}><ActivityLogIcon aria-hidden="true" />Xem quá trình<ArrowRightIcon aria-hidden="true" /></button><button type="button" className={"general-hr-evaluations__button" + " " + "general-hr-evaluations__primary"} onClick={close}>Đóng</button></footer>
    </div>
    : mode === "status" ? <form className="general-hr-evaluations__transitionLayout" onSubmit={submit} aria-busy={busy}>
      <aside className="general-hr-evaluations__transitionContext">
        <span className="general-hr-evaluations__contextRecord"><FileTextIcon aria-hidden="true" />Hồ sơ #{row.id}</span><RecordIdentity row={row} />
        <div className="general-hr-evaluations__contextCurrent"><span>Trạng thái hiện tại</span><HrStatus value={row.status} /></div>
        <dl><div><dt>Kỳ đánh giá</dt><dd>{row.period || "Chưa có kỳ đánh giá"}</dd></div><div><dt>Phòng ban</dt><dd>{row.departmentName || "Chưa có phòng ban"}</dd></div></dl>
        <div className="general-hr-evaluations__contextDestination" data-selected={selected !== null}><ArrowRightIcon aria-hidden="true" /><span>Chuyển đến</span><strong>{selected !== null ? hrStatusLabel(selected) : "Chọn trạng thái mới"}</strong></div>
      </aside>
      <header className="general-hr-evaluations__transitionHeader"><div><h2 id="hr-dialog-title">Chuyển trạng thái</h2><p><span className="general-hr-evaluations__mobileRecordRef">Hồ sơ #{row.id} · </span>Chọn bước xử lý tiếp theo.</p></div>{closeButton}</header>
      <div className="general-hr-evaluations__transitionBody">
        {loading ? loadingState : error && !statuses.length ? null : <><fieldset className="general-hr-evaluations__targetFieldset" disabled={busy}><legend>Chuyển hồ sơ đến{statuses.length > 0 && <span className="general-hr-evaluations__targetCount">{statuses.length} lựa chọn</span>}</legend>
          {!statuses.length && !error ? <div className="general-hr-evaluations__noTransitions"><UpdateIcon aria-hidden="true" /><strong>Chưa có bước chuyển khả dụng</strong><span>Mẫu đánh giá này chưa có trạng thái có thể chuyển.</span></div> : <div className="general-hr-evaluations__targetGrid">{statuses.map((status) => <label key={status} className="general-hr-evaluations__targetOption" data-selected={selected === status} data-tone={statusTone(status)} data-current={statusKey(status) === row.status}>
            <input type="radio" name="target-status" value={status} checked={selected === status} disabled={statusKey(status) === row.status} onChange={() => setSelected(status)} />
            <span className="general-hr-evaluations__targetIcon">{statusTone(status) === "danger" ? <Cross2Icon aria-hidden="true" /> : statusTone(status) === "success" ? <CheckIcon aria-hidden="true" /> : <UpdateIcon aria-hidden="true" />}</span>
            <span><strong><HrStatus value={status} /></strong><small>{statusKey(status) === row.status ? "Trạng thái hiện tại" : statusTone(status) === "danger" ? "Trả lại hồ sơ để xử lý" : statusTone(status) === "success" ? "Ghi nhận bước hoàn thành" : "Chuyển sang bước xử lý này"}</small></span><span className="general-hr-evaluations__radioMark" aria-hidden="true">{selected === status && <CheckIcon />}</span>
          </label>)}</div>}
        </fieldset>{statuses.length > 0 && <label className="general-hr-evaluations__reasonField"><span>Lý do thay đổi <small>Không bắt buộc</small></span><textarea rows={2} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Ghi chú để các bên tiện theo dõi…" /></label>}</>}{failure}
      </div>
      <footer className="general-hr-evaluations__dialogFooter"><button type="button" className="general-hr-evaluations__button" disabled={busy} onClick={close}>Hủy thay đổi</button><button type="submit" className={"general-hr-evaluations__button" + " " + "general-hr-evaluations__primary"} disabled={loading || busy || selected === null || statusKey(selected) === row.status}>{busy ? "Đang cập nhật…" : "Xác nhận chuyển"}<ArrowRightIcon aria-hidden="true" /></button></footer>
    </form>
    : <form className="general-hr-evaluations__deleteLayout" onSubmit={submit} aria-busy={busy}>
      <header className="general-hr-evaluations__deleteHeader">{closeButton}<span className="general-hr-evaluations__deleteSymbol"><TrashIcon aria-hidden="true" /></span><h2 id="hr-dialog-title">Xóa bản đánh giá?</h2><p id="hr-delete-description">Hồ sơ sẽ bị xóa khỏi danh sách.<br />Kiểm tra thông tin trước khi xác nhận.</p></header>
      <div className="general-hr-evaluations__deleteBody"><div className="general-hr-evaluations__deleteRecord"><div className="general-hr-evaluations__deleteRecordTop"><FileTextIcon aria-hidden="true" /><span>Bản đánh giá #{row.id}</span><HrStatus value={row.status} /></div><RecordIdentity row={row} /><strong>{row.period || "Chưa có kỳ đánh giá"}</strong><p>{row.templateName || "Chưa có tên bản đánh giá"}</p></div>{failure}</div>
      <footer className="general-hr-evaluations__dialogFooter"><button ref={cancelRef} type="button" className="general-hr-evaluations__button" disabled={busy} onClick={close}>Giữ lại hồ sơ</button><button type="submit" className={`general-hr-evaluations__button general-hr-evaluations__dangerButton`} disabled={busy}><TrashIcon aria-hidden="true" />{busy ? "Đang xóa…" : "Xác nhận xóa"}</button></footer>
    </form>}
  </dialog>;
}
