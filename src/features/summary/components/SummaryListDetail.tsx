"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ActivityLogIcon, ArrowLeftIcon, ArrowRightIcon, CalendarIcon, CheckCircledIcon, CheckIcon, ClockIcon, CrossCircledIcon, DownloadIcon, EyeOpenIcon, FileTextIcon, LayersIcon, MagnifyingGlassIcon, PaperPlaneIcon, PersonIcon, ReloadIcon, ResetIcon } from "@radix-ui/react-icons";
import { Pagination } from "@/components/ui/Pagination";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import { UserRoleSystem } from "@/features/auth/types";
import { companyApi } from "@/features/company/services/companyApi";
import { companyLogos } from "@/features/company/companyLogos";
import { departmentApi } from "@/features/department/services/departmentApi";
import { companyOptions, hrStatusLabel, requestMessage } from "@/features/evaluation/evaluationDisplay";
import { EvaluationStatus, type EvaluationFilterOption } from "@/features/evaluation/types";
import type { PagedResult } from "@/lib/api/types";
import { summaryApi } from "../services/summaryApi";
import type { SummaryDetail, SummaryDetailFilters, SummaryMode } from "../types";
import { SummaryRecordDialog } from "./SummaryRecordDialog";
import { SummaryReviewDialog, type SummaryReviewTarget } from "./SummaryReviewDialog";
import "./SummaryListDetail.css";

const HistoryDialog = dynamic(() => import("@/features/evaluation/components/GeneralHrEvaluations").then(module => module.GeneralHrEvaluationDialog), { ssr: false });
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const scoreLabel = (value: number | null) => value == null ? "—" : number.format(value);
const dayLabel = (value: string) => value && !value.startsWith("0001") ? value.slice(0, 10).split("-").reverse().join("/") : "—";
const statuses = Object.values(EvaluationStatus).map(id => ({ id, name: hrStatusLabel(id) }));

type Task = "select-all" | "approve-all" | "export-selected" | "export-all" | "export-detail-selected" | "export-detail-all";
type Inspector = { row: SummaryDetail; mode: "detail" | "history" | "approvers" };
type Props = { mode: SummaryMode; periodId: number; companyId: number };

export function SummaryListDetail({ mode, periodId, companyId }: Props) {
  const initialFilters: SummaryDetailFilters = { status: "", keyword: "", companyId: String(companyId), departmentId: "-1" };
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<EvaluationFilterOption[]>([]);
  const [departments, setDepartments] = useState<EvaluationFilterOption[]>([]);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [companyError, setCompanyError] = useState("");
  const [departmentError, setDepartmentError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{ key: string; data: PagedResult<SummaryDetail> | null; error: string } | null>(null);
  const [context, setContext] = useState<SummaryDetail | null>(null);
  const [selected, setSelected] = useState<SummaryDetail[]>([]);
  const [review, setReview] = useState<SummaryReviewTarget | null>(null);
  const [inspector, setInspector] = useState<Inspector | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [exportDone, setExportDone] = useState<Task | null>(null);
  const taskController = useRef<AbortController | null>(null);
  const selectPage = useRef<HTMLInputElement>(null);

  const requestKey = JSON.stringify({ mode, periodId, page, pageSize, filters, revision });
  const current = snapshot?.key === requestKey ? snapshot : null;
  const data = current?.data;
  const error = current?.error ?? "";
  const loading = !current;
  const selectedIds = new Set(selected.map(row => row.evalId));
  const pageSelected = data?.items.filter(row => selectedIds.has(row.evalId)).length ?? 0;
  const locked = !!review || !!inspector || !!task;
  const unavailable = loading || !data || !!error || locked || search.trim() !== filters.keyword;
  const filtered = !!(filters.keyword || filters.status) || filters.companyId !== String(companyId) || filters.departmentId !== "-1";
  const companyName = filters.companyId === "-1" ? "Tất cả công ty" : companies.find(item => item.id === filters.companyId)?.name || context?.companyName || "Công ty theo kỳ đánh giá";
  const level = mode === "HrSummary" ? UserRoleSystem.HRSummary : UserRoleSystem.ManagerSenior;

  useEffect(() => {
    if (search.trim() === filters.keyword) return;
    const timer = setTimeout(() => {
      setFilters(value => ({ ...value, keyword: search.trim() }));
      setSelected([]);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filters.keyword]);

  useEffect(() => {
    const controller = new AbortController();
    setCompanyLoading(true);
    setCompanyError("");
    const result = mode === "HrSummary" ? companyApi.getForHrCompile(controller.signal) : companyApi.getAll(controller.signal);
    result.then(rows => {
      if (!controller.signal.aborted) setCompanies(companyOptions(rows));
    }).catch(cause => {
      if (!controller.signal.aborted) setCompanyError(requestMessage(cause, "Chưa tải được công ty."));
    }).finally(() => { if (!controller.signal.aborted) setCompanyLoading(false); });
    return () => controller.abort();
  }, [mode, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setDepartments([]);
    setDepartmentLoading(true);
    setDepartmentError("");
    departmentApi.list(filters.companyId === "-1" ? "" : filters.companyId, "", controller.signal).then(rows => {
      if (!controller.signal.aborted) setDepartments(rows.map(row => ({ id: String(row.id), name: row.name })));
    }).catch(cause => {
      if (!controller.signal.aborted) setDepartmentError(requestMessage(cause, "Chưa tải được phòng ban."));
    }).finally(() => { if (!controller.signal.aborted) setDepartmentLoading(false); });
    return () => controller.abort();
  }, [filters.companyId, revision]);

  useEffect(() => {
    const controller = new AbortController();
    summaryApi.getDetails(mode, periodId, page, pageSize, filters, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setSnapshot({ key: requestKey, data: result, error: "" });
      if (result.items[0]) setContext(result.items[0]);
      const updated = new Map(result.items.map(row => [row.evalId, row]));
      setSelected(rows => rows.map(row => updated.get(row.evalId) ?? row));
    }).catch(cause => {
      if (!controller.signal.aborted) setSnapshot({ key: requestKey, data: null, error: requestMessage(cause, "Chưa tải được hồ sơ. Hãy thử lại.") });
    });
    return () => controller.abort();
  }, [mode, periodId, page, pageSize, filters, requestKey, revision]);

  useEffect(() => {
    if (selectPage.current) selectPage.current.indeterminate = pageSelected > 0 && pageSelected < (data?.items.length ?? 0);
  }, [pageSelected, data?.items.length]);

  useEffect(() => () => taskController.current?.abort(), []);
  useEffect(() => {
    if (!exportDone) return;
    const timer = setTimeout(() => setExportDone(null), 1600);
    return () => clearTimeout(timer);
  }, [exportDone]);

  function changeFilters(patch: Partial<SummaryDetailFilters>) {
    setFilters(value => ({ ...value, ...patch }));
    setSelected([]);
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setFilters(initialFilters);
    setSelected([]);
    setPage(1);
  }

  function refresh() {
    setSelected([]);
    setRevision(value => value + 1);
  }

  function toggleRow(row: SummaryDetail, checked: boolean) {
    setSelected(rows => checked ? [...rows.filter(item => item.evalId !== row.evalId), row] : rows.filter(item => item.evalId !== row.evalId));
  }

  function togglePage(checked: boolean) {
    const rows = data?.items ?? [];
    const ids = new Set(rows.map(row => row.evalId));
    setSelected(value => [...value.filter(row => !ids.has(row.evalId)), ...(checked ? rows : [])]);
  }

  async function prepare(kind: Task) {
    if (taskController.current || unavailable || !data?.total) return;
    if ((kind === "export-selected" || kind === "export-detail-selected") && !selected.length) return;
    const controller = new AbortController();
    taskController.current = controller;
    setTask(kind);
    setExportDone(null);
    try {
      const detailed = kind === "export-detail-selected" || kind === "export-detail-all";
      const onlySelected = kind === "export-selected" || kind === "export-detail-selected";
      const result = kind === "export-detail-selected" && selected.length === 1
        ? { items: selected, total: 1 }
        : await summaryApi.getDetails(mode, periodId, 1, detailed ? data.total : 0, filters, controller.signal);
      controller.signal.throwIfAborted();
      if (result.items.length !== result.total) throw new Error("Chưa lấy đủ hồ sơ. Hãy làm mới danh sách rồi thử lại.");
      if (!result.items.length) { notify("info", "Không có hồ sơ theo bộ lọc hiện tại."); return; }
      if (kind === "select-all") { setSelected(result.items); return; }
      if (kind === "approve-all") { setReview({ kind: "approve", rows: result.items, all: true }); return; }
      const rows = onlySelected ? result.items.filter(row => selectedIds.has(row.evalId)) : result.items;
      if (onlySelected && rows.length !== selected.length) throw new Error("Danh sách đã thay đổi. Hãy làm mới và chọn lại hồ sơ cần xuất.");
      if (detailed) {
        const response = await summaryApi.getEvaluationsForExport(rows.map(row => row.evalId), controller.signal);
        const { downloadEvaluationFile } = await import("../downloadEvaluationFile");
        controller.signal.throwIfAborted();
        await downloadEvaluationFile(response, rows.map(row => row.evalId), controller.signal);
        setExportDone(kind);
        notify("success", "Đã tải file đánh giá cho " + rows.length + " hồ sơ.");
        return;
      }
      const [template, workbook] = await Promise.all([
        fetch("/excel/danh_sach_tong_hop_hr_template.xlsx", { signal: controller.signal }),
        import("../summaryExport"),
      ]);
      if (!template.ok) throw new Error("Chưa tải được mẫu Excel.");
      const bytes = await template.arrayBuffer();
      controller.signal.throwIfAborted();
      const blob = workbook.createSummaryWorkbook(rows, bytes);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tong-hop-" + (mode === "HrSummary" ? "hr" : "director") + "-" + (kind === "export-selected" ? "da-chon-" : "tat-ca-") + new Date().toISOString().slice(0, 10) + ".xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportDone(kind);
      notify("success", "Đã xuất Excel tổng hợp " + rows.length + " hồ sơ.");
    } catch (cause) {
      if (!controller.signal.aborted) notify("error", requestMessage(cause, cause instanceof Error ? cause.message : "Chưa hoàn tất thao tác. Hãy thử lại."));
    } finally {
      taskController.current = null;
      if (!controller.signal.aborted) setTask(null);
    }
  }

  return (
    <div className="summary-detail__page" data-has-selection={selected.length > 0}>
      <Link className="summary-detail__back" href={"/summary/summary-list/" + mode}><ArrowLeftIcon aria-hidden="true" />Danh sách tổng hợp</Link>
      <header className="summary-detail__hero">
        <svg className="summary-detail__heroArt" aria-hidden="true" viewBox="0 0 800 320" preserveAspectRatio="none">
          <path d="M0 320 C118 312 129 118 276 65 C406 18 499 100 625 51 C666 35 696 15 716 0 H800 V320 Z" />
          <path d="M185 320 C289 312 306 190 416 150 C535 106 601 190 705 132 C755 104 773 50 800 24 V320 Z" />
          <path d="M421 320 C502 303 517 237 591 217 C671 196 725 260 800 191 V320 Z" />
        </svg>
        <div className="summary-detail__heroTitle">
          <div className="summary-detail__heroHeading"><h1>Tổng hợp kỳ đánh giá</h1><span>{mode === "HrSummary" ? "HR tổng hợp" : "Tổng hợp cấp cao"}</span></div>
          <p>{context?.periodName || "Danh sách hồ sơ trong kỳ đã chọn"}</p>
          <div className="summary-detail__heroFacts">
            <span><CalendarIcon aria-hidden="true" />{context ? dayLabel(context.startDate) + " — " + dayLabel(context.endDate) : "Đang tải thông tin kỳ"}</span>
            <span className="summary-detail__heroCompany"><Image src={companyLogos[context?.companyCode ?? ""] ?? "/brand/deoca-icon.svg"} alt="" width={23} height={23} />{companyName}</span>
          </div>
        </div>
        <div className="summary-detail__heroCount"><FileTextIcon aria-hidden="true" /><strong>{data ? number.format(data.total) : "—"}</strong><span>hồ sơ theo bộ lọc</span></div>
      </header>

      <div className="summary-detail__workspace">
        <section className="summary-detail__results" aria-labelledby="summary-detail-title">
          <div className="summary-detail__filters" role="group" aria-label="Lọc hồ sơ tổng hợp">
            <div className="summary-detail__field summary-detail__searchField">
              <label htmlFor="summary-detail-search">Nhân viên</label>
              <div className="summary-detail__search"><MagnifyingGlassIcon aria-hidden="true" />
                <input id="summary-detail-search" type="search" placeholder="Tìm tên hoặc mã HT…" value={search} disabled={locked}
                  onChange={event => { setSearch(event.target.value); setSelected([]); }} />
              </div>
            </div>
            <div className="summary-detail__field">
              <label htmlFor="summary-detail-status">Trạng thái</label>
              <SearchableSelect id="summary-detail-status" label="Trạng thái" placeholder="Xem tất cả" options={statuses}
                value={filters.status} disabled={locked} onChange={status => changeFilters({ status })} />
            </div>
            <div className="summary-detail__field">
              <label htmlFor="summary-detail-company">Công ty</label>
              <SearchableSelect id="summary-detail-company" label="Công ty" placeholder="Tất cả công ty" options={companies}
                value={filters.companyId === "-1" ? "" : filters.companyId} disabled={companyLoading || locked}
                onChange={value => changeFilters({ companyId: value || "-1", departmentId: "-1" })} />
            </div>
            <div className="summary-detail__field">
              <label htmlFor="summary-detail-department">Phòng ban</label>
              <SearchableSelect id="summary-detail-department" label="Phòng ban" placeholder="Tất cả phòng ban" options={departments}
                value={filters.departmentId === "-1" ? "" : filters.departmentId} disabled={departmentLoading || locked}
                onChange={value => changeFilters({ departmentId: value || "-1" })} />
            </div>
            <button type="button" className="summary-detail__iconButton summary-detail__reset" disabled={locked || (!filtered && !search)} onClick={resetFilters} title="Xóa bộ lọc" aria-label="Xóa bộ lọc"><ResetIcon aria-hidden="true" /></button>
          </div>
          {(companyError || departmentError) && <p className="summary-detail__lookupError" role="alert">{companyError || departmentError} <button type="button" onClick={refresh}>Thử lại</button></p>}
          <div className="summary-detail__tableHeading">
            <h2 id="summary-detail-title"><LayersIcon aria-hidden="true" />Hồ sơ tổng hợp<span>{data?.total ?? "—"}</span></h2>
            <div><label className="summary-detail__selectPage">
              <input ref={selectPage} type="checkbox" aria-label="Chọn tất cả hồ sơ trên trang này" checked={!!data?.items.length && pageSelected === data.items.length}
                disabled={unavailable || !data?.items.length} onChange={event => togglePage(event.target.checked)} />Chọn trang
            </label>
              <button className="summary-detail__iconButton" type="button" onClick={refresh} disabled={unavailable} aria-label="Làm mới danh sách" title="Làm mới"><ReloadIcon className={loading ? "summary-detail__spin" : undefined} aria-hidden="true" /></button>
            </div>
          </div>
          {selected.length > 0 && <div className="summary-detail__selection" role="status">
            <span><CheckCircledIcon aria-hidden="true" />Đã chọn <strong>{number.format(selected.length)}</strong> hồ sơ qua các trang</span>
            <div>{selected.length < (data?.total ?? 0) && <button type="button" disabled={unavailable} onClick={() => prepare("select-all")}>Chọn cả {data?.total} kết quả</button>}
              <button type="button" disabled={locked} onClick={() => setSelected([])}>Bỏ chọn</button></div>
          </div>}
          <div className="summary-detail__tableWrap" aria-busy={loading}>
            <table className="summary-detail__table" aria-label="Chi tiết bản đánh giá tổng hợp">
              <thead><tr>
                <th scope="col"><span className="summary-detail__srOnly">Chọn hồ sơ</span></th>
                <th scope="col">STT</th><th scope="col">Nhân viên</th><th scope="col">Chức danh / Đơn vị</th>
                <th scope="col">Tự đánh giá</th><th scope="col">Quản lý</th><th scope="col">Hệ số HTCV</th>
                <th scope="col">Tỷ lệ chi</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th>
              </tr></thead>
              <tbody>{data?.items.map((row, index) => {
                const rejected = row.isReject || row.status === "Rejected";
                const complete = row.status === "Over" || row.status === "CompileHRList";
                return (
                  <tr key={row.evalId} data-selected={selectedIds.has(row.evalId)} style={{ animationDelay: Math.min(index * 25, 150) + "ms" }}>
                    <td className="summary-detail__choose"><label>
                      <input type="checkbox" aria-label={"Chọn hồ sơ của " + row.userName} checked={selectedIds.has(row.evalId)} disabled={unavailable}
                        onChange={event => toggleRow(row, event.target.checked)} />
                    </label></td>
                    <td className="summary-detail__index">{(page - 1) * pageSize + index + 1}</td>
                    <td className="summary-detail__employee"><div className="summary-detail__identity">
                      <span className="summary-detail__avatar"><PersonIcon aria-hidden="true" /></span>
                      <div><button type="button" onClick={() => setInspector({ row, mode: "detail" })} disabled={locked}>{row.userName}</button><span>{row.userId}</span></div>
                    </div></td>
                    <td className="summary-detail__unit"><strong>{row.jobName || "—"}</strong><span>{row.departmentName || "—"}</span>
                      <span className="summary-detail__company"><Image src={companyLogos[row.companyCode] ?? "/brand/deoca-icon.svg"} alt="" width={19} height={19} />{row.companyCode}</span>
                    </td>
                    <td className="summary-detail__score" data-label="Tự đánh giá"><strong>{scoreLabel(row.score)}</strong></td>
                    <td className="summary-detail__score summary-detail__managerScore" data-label="Quản lý"><strong>{scoreLabel(row.managerSocre)}</strong></td>
                    <td className="summary-detail__completion" data-label="Hệ số HTCV"><strong>{scoreLabel(row.rPercent)}</strong>
                      <span className="summary-detail__track" aria-hidden="true"><span style={{ width: Math.max(0, Math.min(100, (row.rPercent ?? 0) * 100)) + "%" }} /></span>
                    </td>
                    <td className="summary-detail__band" data-label="Tỷ lệ chi"><span>{row.band || "—"}</span>{row.note && <button type="button" title={row.note} onClick={() => setInspector({ row, mode: "detail" })} disabled={locked}>Xem ý kiến</button>}</td>
                    <td className="summary-detail__process"><span className="summary-detail__status" data-tone={rejected ? "danger" : complete ? "success" : "progress"}>
                      {rejected ? <CrossCircledIcon aria-hidden="true" /> : complete ? <CheckCircledIcon aria-hidden="true" /> : <ClockIcon aria-hidden="true" />}{row.statusDisplay}
                    </span>{row.userDoing && <span className="summary-detail__reviewer"><PersonIcon aria-hidden="true" />{row.userDoing}</span>}
                      {!row.isCanApprove && <span className="summary-detail__permissionNote">Không có quyền chuyển</span>}
                    </td>
                    <td className="summary-detail__actions">
                      <button type="button" onClick={() => setInspector({ row, mode: "history" })} disabled={locked} aria-haspopup="dialog"><ActivityLogIcon aria-hidden="true" />Quá trình</button>
                      <button type="button" onClick={() => setInspector({ row, mode: "detail" })} disabled={locked} aria-haspopup="dialog"><EyeOpenIcon aria-hidden="true" />Chi tiết</button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
            {(loading || error || !data?.items.length) && <div className="summary-detail__state" role={error ? "alert" : "status"}>
              {loading ? <><Image src="/brand/deoca-icon.svg" alt="" width={38} height={38} className="summary-detail__loadingLogo" /><span className="summary-detail__srOnly">Đang tải hồ sơ…</span></>
                : error ? <><FileTextIcon aria-hidden="true" /><h3>Chưa tải được dữ liệu</h3><p>{error}</p><button type="button" className="summary-detail__button" onClick={refresh}>Thử lại</button></>
                  : <><MagnifyingGlassIcon aria-hidden="true" /><h3>Chưa có hồ sơ phù hợp</h3><p>Thử đổi trạng thái, nhân viên hoặc phòng ban.</p>{filtered && <button type="button" className="summary-detail__button" onClick={resetFilters}>Xóa bộ lọc</button>}</>}
            </div>}
          </div>
          <Pagination page={page} pageSize={pageSize} total={data?.total ?? null} loading={loading} error={!!error} disabled={locked}
            itemLabel="hồ sơ" onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
        </section>

        <aside id="summary-actions" className="summary-detail__commands" aria-label="Thao tác tổng hợp">
          <section className="summary-detail__reviewPanel">
            <div className="summary-detail__commandTitle"><PaperPlaneIcon aria-hidden="true" /><h2>Xử lý hồ sơ</h2></div>
            <div className="summary-detail__selectedCount"><strong key={selected.length}>{number.format(selected.length)}</strong><span>hồ sơ đã chọn</span>
              {selected.length > 0 && <button type="button" onClick={() => setSelected([])} disabled={locked}>Bỏ chọn</button>}
            </div>
            <button type="button" className="summary-detail__button summary-detail__send" disabled={unavailable || !selected.length}
              onClick={() => setReview({ kind: "approve", rows: selected })} aria-haspopup="dialog"><PaperPlaneIcon aria-hidden="true" />Gửi duyệt đã chọn<ArrowRightIcon aria-hidden="true" /></button>
            <button type="button" className="summary-detail__button summary-detail__sendAll" disabled={unavailable || !data?.total}
              onClick={() => prepare("approve-all")} aria-haspopup="dialog">{task === "approve-all" ? <ReloadIcon className="summary-detail__spin" aria-hidden="true" /> : <LayersIcon aria-hidden="true" />}Gửi duyệt tất cả<span>{data?.total ?? "—"}</span></button>
            <button type="button" className="summary-detail__button summary-detail__return" disabled={unavailable || !selected.length}
              onClick={() => setReview({ kind: "reject", rows: selected })} aria-haspopup="dialog"><ResetIcon aria-hidden="true" />Trả về hồ sơ đã chọn</button>
            <p>Chọn quản lý cấp cao ở bước xác nhận gửi duyệt.</p>
          </section>
          <section className="summary-detail__exportPanel">
            <div className="summary-detail__commandTitle"><DownloadIcon aria-hidden="true" /><h2>Xuất Excel</h2></div>
            <p>Xuất theo mẫu Đèo Cả, giữ nguyên bộ lọc hiện tại.</p>
            <div className="summary-detail__exportGroup" role="group" aria-labelledby="summary-excel-summary">
            <h3 id="summary-excel-summary" className="summary-detail__exportGroupTitle">Excel tổng hợp</h3>
            <button type="button" className="summary-detail__exportButton" data-busy={task === "export-selected"} data-complete={exportDone === "export-selected"}
              disabled={unavailable || !selected.length} onClick={() => prepare("export-selected")}>
              <span className="summary-detail__excelIcon">{exportDone === "export-selected" ? <CheckIcon aria-hidden="true" /> : <FileTextIcon aria-hidden="true" />}</span>
              <span><strong>{task === "export-selected" ? "Đang tạo Excel…" : "Xuất đã chọn"}</strong><small>{selected.length} hồ sơ · 1 file Excel</small></span><DownloadIcon aria-hidden="true" />
            </button>
            <button type="button" className="summary-detail__exportButton" data-busy={task === "export-all"} data-complete={exportDone === "export-all"}
              disabled={unavailable || !data?.total} onClick={() => prepare("export-all")}>
              <span className="summary-detail__excelIcon">{exportDone === "export-all" ? <CheckIcon aria-hidden="true" /> : <LayersIcon aria-hidden="true" />}</span>
              <span><strong>{task === "export-all" ? "Đang tạo Excel…" : "Xuất tất cả"}</strong><small>{data?.total ?? "—"} hồ sơ · 1 file Excel</small></span><DownloadIcon aria-hidden="true" />
            </button>
            </div>
            <div className="summary-detail__exportGroup" role="group" aria-labelledby="summary-excel-detail">
            <h3 id="summary-excel-detail" className="summary-detail__exportGroupTitle">Excel chi tiết</h3>
            <button type="button" className="summary-detail__exportButton" data-busy={task === "export-detail-selected"} data-complete={exportDone === "export-detail-selected"}
              disabled={unavailable || !selected.length} onClick={() => prepare("export-detail-selected")}>
              <span className="summary-detail__excelIcon">{exportDone === "export-detail-selected" ? <CheckIcon aria-hidden="true" /> : <FileTextIcon aria-hidden="true" />}</span>
              <span><strong>{task === "export-detail-selected" ? "Đang tải file…" : "Xuất đã chọn"}</strong><small>{selected.length} hồ sơ · mỗi hồ sơ một file</small></span><DownloadIcon aria-hidden="true" />
            </button>
            <button type="button" className="summary-detail__exportButton" data-busy={task === "export-detail-all"} data-complete={exportDone === "export-detail-all"}
              disabled={unavailable || !data?.total} onClick={() => prepare("export-detail-all")}>
              <span className="summary-detail__excelIcon">{exportDone === "export-detail-all" ? <CheckIcon aria-hidden="true" /> : <LayersIcon aria-hidden="true" />}</span>
              <span><strong>{task === "export-detail-all" ? "Đang tải file…" : "Xuất tất cả"}</strong><small>{data?.total ?? "—"} hồ sơ theo bộ lọc · mỗi hồ sơ một file</small></span><DownloadIcon aria-hidden="true" />
            </button>
            </div>
          </section>
        </aside>
      </div>
      {selected.length > 0 && <div className="summary-detail__mobileDock" role="group" aria-label="Xử lý hồ sơ đã chọn">
        <span>{selected.length} hồ sơ</span>
        <a className="summary-detail__iconButton" href="#summary-actions" title="Xuất tổng hợp" aria-label="Đến phần xuất Excel"><DownloadIcon aria-hidden="true" /></a>
        <button type="button" className="summary-detail__iconButton" disabled={unavailable} onClick={() => setReview({ kind: "reject", rows: selected })} aria-label="Trả về hồ sơ đã chọn"><ResetIcon aria-hidden="true" /></button>
        <button type="button" className="summary-detail__button summary-detail__primary" disabled={unavailable} onClick={() => setReview({ kind: "approve", rows: selected })}><PaperPlaneIcon aria-hidden="true" />Gửi duyệt</button>
      </div>}
      {task && <div className="summary-detail__taskStatus" role="status"><ReloadIcon className="summary-detail__spin" aria-hidden="true" />{task.startsWith("export") ? "Đang chuẩn bị file Excel…" : "Đang lấy toàn bộ hồ sơ theo bộ lọc…"}</div>}
      {review && <SummaryReviewDialog target={review} level={level} onClose={() => setReview(null)} onProcessed={ids => {
        setSelected(rows => rows.filter(row => !ids.includes(row.evalId)));
        setRevision(value => value + 1);
      }} />}
      {inspector?.mode === "detail" && <SummaryRecordDialog row={inspector.row} onClose={() => setInspector(null)} onHistory={() => setInspector({ ...inspector, mode: "history" })} />}
      {inspector && inspector.mode !== "detail" && <HistoryDialog mode={inspector.mode}
        row={{ id: inspector.row.evalId, userId: inspector.row.userId, systemCode: inspector.row.userId, name: inspector.row.userName, companyCode: inspector.row.companyCode, departmentName: inspector.row.departmentName, period: inspector.row.periodName, status: inspector.row.status }}
        onClose={() => setInspector(null)} onMutated={refresh} onModeChange={value => {
          if (value === "history" || value === "approvers") setInspector({ ...inspector, mode: value });
        }} />}
    </div>
  );
}
