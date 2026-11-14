"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type CSSProperties } from "react";
import { Icon, resolveDepartmentIcon } from "./DepartmentIcon";
import { notify } from "@/components/ui/Toaster";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Pagination } from "@/components/ui/Pagination";
import { departmentApi, type Department, type DepartmentDraft } from "../services/departmentApi";
import { companyApi } from "@/features/company/services/companyApi";
import type { CompanyDto } from "@/features/company/types";
import "./DepartmentManagement.css";

type Status = "all" | "active" | "inactive";
const layerShadow = {
  filter: "var(--d-layer-shadow)",
};
function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error.message === "UNAUTHORIZED") return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error.message === "FORBIDDEN") return "Bạn chưa được cấp quyền thực hiện thao tác này.";
  return error.message;
}

function DepartmentBackground() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 800 320" preserveAspectRatio="none" className="department-hero-background">
      <path d="M0 320 C118 312 129 118 276 65 C406 18 499 100 625 51 C666 35 696 15 716 0 H800 V320 Z" fill="#141E35" style={layerShadow} />
      <path d="M185 320 C289 312 306 190 416 150 C535 106 601 190 705 132 C755 104 773 50 800 24 V320 Z" fill="#192544" style={layerShadow} />
      <path d="M421 320 C502 303 517 237 591 217 C671 196 725 260 800 191 V320 Z" fill="#1D2B4F" style={layerShadow} />
    </svg>
  );
}

export function DepartmentManagement() {
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [companyError, setCompanyError] = useState("");
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [introPhase, setIntroPhase] = useState<"pending" | "playing" | "done">("pending");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ companyId: "", name: "" });
  const [applied, setApplied] = useState(filters);
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [descending, setDescending] = useState(false);
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Department | "new" | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");
  const searchRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("department-view");
    if (saved === "grid" || saved === "table") setView(saved);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const name = filters.name.trim();
      setApplied(current => current.name === name && current.companyId === filters.companyId ? current : { companyId: filters.companyId, name });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "/") { event.preventDefault(); searchRef.current?.focus(); }
      else if (event.key.toLowerCase() === "n") { event.preventDefault(); setEditor("new"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function changeView(next: "table" | "grid") { setView(next); window.localStorage.setItem("department-view", next); }
  function copyName(name: string) {
    navigator.clipboard?.writeText(name).then(() => notify("success", "Đã sao chép “" + name + "”."), () => notify("error", "Không thể sao chép."));
  }

  useEffect(() => {
    const controller = new AbortController();
    setCompanyError("");
    companyApi.getForHrCompile(controller.signal).then(data => setCompanies(data ?? [])).catch(error => {
      if (!controller.signal.aborted) setCompanyError(errorMessage(error, "Không thể tải công ty."));
    });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    departmentApi.list(applied.companyId, applied.name, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setItems(data ?? []);
        setIntroPhase(current => current === "pending" ? "playing" : current);
      }
    }).catch(error => {
      if (!controller.signal.aborted) setError(errorMessage(error, "Không thể tải phòng ban."));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [applied, revision]);


  useEffect(() => {
    if (introPhase !== "playing") return;
    const timer = window.setTimeout(() => setIntroPhase("done"), 1000);
    return () => window.clearTimeout(timer);
  }, [introPhase]);

  useLayoutEffect(() => {
    const tabs = tabsRef.current;
    const selected = tabs?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!tabs || !selected) return;
    const measure = () => {
      const left = selected.offsetLeft;
      const width = selected.offsetWidth;
      setTabIndicator(current => current?.left === left && current.width === width ? current : { left, width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    observer.observe(selected);
    return () => observer.disconnect();
  }, [status]);

  const rows = useMemo(() => items
    .filter(item => status === "all" || item.isActive === (status === "active"))
    .sort((a, b) => a.name.localeCompare(b.name, "vi") * (descending ? -1 : 1)), [items, status, descending]);
  const activeCount = items.filter(item => item.isActive).length;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const companyOptions = companies.map(company => ({ id: String(company.id), name: company.companyName }));
  const companyName = (item: Department) => companies.find(company => company.id === item.companyId)?.companyName || item.companyName || "Công ty #" + item.companyId;

  function apply(event: FormEvent) {
    event.preventDefault();
    setApplied({ ...filters, name: filters.name.trim() });
    setPage(1);
  }

  function reset() {
    const empty = { companyId: "", name: "" };
    setFilters(empty);
    setApplied(empty);
    setStatus("all");
    setPage(1);
  }

  function saved(message: string) {
    notify("success", message);
    setRevision(value => value + 1);
  }

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Status[] = ["all", "active", "inactive"];
    let index = keys.indexOf(status);
    if (event.key === "ArrowRight") index = (index + 1) % keys.length;
    else if (event.key === "ArrowLeft") index = (index + keys.length - 1) % keys.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = keys.length - 1;
    else return;
    event.preventDefault();
    setStatus(keys[index]);
    setPage(1);
    document.getElementById("department-tab-" + keys[index])?.focus();
  }

  const hasFilters = !!(applied.name || applied.companyId || status !== "all");
  const activeRate = items.length ? Math.round(activeCount / items.length * 100) : 0;
  const showSkeleton = loading && !items.length;
  const inactiveCount = items.length - activeCount;
  const byCompany = Object.values(items.reduce<Record<number, { id: number; n: number }>>((acc, item) => { (acc[item.companyId] ??= { id: item.companyId, n: 0 }).n++; return acc; }, {})).sort((a, b) => b.n - a.n);
  const topCompanies = byCompany.slice(0, 3);
  const maxCompany = topCompanies[0]?.n || 1;
  const codeOf = (id: number) => companies.find(company => company.id === id)?.companyCode || "#" + id;
  const inactiveDots = items.length ? Math.round(inactiveCount / items.length * 24) : 0;
  const branches = Math.min(Math.max(items.length, 1), 6);
  const num = (value: number) => showSkeleton ? "—" : value.toLocaleString("vi-VN");

  return <div className="department-page" data-intro={introPhase} onPointerDown={() => setIntroPhase("done")} onKeyDownCapture={() => setIntroPhase("done")}>
    <header className="department-hero">
      <DepartmentBackground />
      <div className="department-hero-top">
        <div>
          <h1>Quản lý phòng ban</h1>
          <p>Theo dõi, tìm kiếm và cập nhật các phòng ban thuộc phạm vi HR của bạn tại một nơi.</p>
        </div>
        <div className="department-hero-actions">
          <button className="department-button department-hero-primary" onClick={() => setEditor("new")}><Icon name="plus" />Thêm phòng ban<kbd>N</kbd></button>
        </div>
      </div>
      <div className="department-stats">
        <div className="dstat">
          <div className="dstat-head"><Icon name="org" />Tổng phòng ban</div>
          <div className="dstat-body"><strong>{num(items.length)}</strong>
            <svg className="dstat-tree" viewBox="0 0 84 40" aria-hidden="true" visibility={showSkeleton ? "hidden" : undefined}>
              <circle cx="42" cy="6" r="4.5" className="n-root" />
              {Array.from({ length: branches }, (_, i) => { const x = branches === 1 ? 42 : 8 + i * (68 / (branches - 1)); return <g key={i} style={{ "--branch-index": i } as CSSProperties}><path pathLength="1" d={"M42 10.5 V20 H" + x + " V29"} /><rect x={x - 5} y="29" width="10" height="8" rx="2.5" /></g>; })}
            </svg></div>
        </div>
        <div className="dstat">
          <div className="dstat-head"><Icon name="pulse" />Đang hoạt động</div>
          <div className="dstat-body"><strong>{num(activeCount)}</strong>
            <svg className="dstat-ring" viewBox="0 0 48 48" aria-hidden="true"><g className="dstat-ring-motion"><circle cx="24" cy="24" r="20" className="track" /><circle cx="24" cy="24" r="20" pathLength="100" className="bar" strokeDasharray="100" strokeDashoffset={100 - activeRate} transform="rotate(-90 24 24)" /></g><text x="24" y="28" textAnchor="middle">{activeRate}%</text></svg></div>
        </div>
        <div className="dstat">
          <div className="dstat-head"><Icon name="pause" />Tạm ngưng</div>
          <div className="dstat-body"><strong>{num(inactiveCount)}</strong>
            <div className="dstat-dots" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ "--dot-index": i } as CSSProperties} className={i < inactiveDots ? "off" : ""} />)}</div></div>
        </div>
        <div className="dstat">
          <div className="dstat-head"><Icon name="briefcase" />Công ty</div>
          <div className="dstat-body"><strong>{num(byCompany.length)}</strong>
            <div className="dstat-bars" aria-hidden="true">{topCompanies.map((c, index) => <div key={c.id} style={{ "--bar-index": index } as CSSProperties}><em>{codeOf(c.id)}</em><span><b style={{ width: Math.max(14, c.n / maxCompany * 100) + "%" }} /></span><small>{c.n}</small></div>)}</div></div>
        </div>
      </div>
    </header>

    <section className="department-workspace" aria-label="Danh sách phòng ban">
      <div className="department-workspace-header"><div ref={tabsRef} className="department-tabs" data-indicator-ready={!!tabIndicator} role="tablist" aria-label="Trạng thái phòng ban" onKeyDown={navigateTabs}>
        {([
          ["all", "Tất cả", items.length],
          ["active", "Đang hoạt động", activeCount],
          ["inactive", "Tạm ngưng", items.length - activeCount],
        ] as const).map(([key, label, count]) => <button key={key} id={"department-tab-" + key} type="button" role="tab" tabIndex={status === key ? 0 : -1} aria-selected={status === key} aria-controls="department-results" onClick={() => { setStatus(key); setPage(1); }}>
          <Icon name={key === "all" ? "layers" : key === "active" ? "ok" : "pause"} />{label}<span className="department-count">{loading && !items.length ? "—" : count.toLocaleString("vi-VN")}</span>
        </button>)}
        {tabIndicator && <span className="department-tab-indicator" aria-hidden="true" style={{ transform: "translateX(" + tabIndicator.left + "px) scaleX(" + tabIndicator.width + ")" }} />}
      </div>
      <div className="department-toolbar">
        <div className="department-view-toggle" role="group" aria-label="Kiểu hiển thị">
          <button type="button" aria-pressed={view === "table"} title="Dạng bảng" aria-label="Dạng bảng" onClick={() => changeView("table")}><Icon name="rows" /></button>
          <button type="button" aria-pressed={view === "grid"} title="Dạng thẻ" aria-label="Dạng thẻ" onClick={() => changeView("grid")}><Icon name="grid" /></button>
        </div>
        <button type="button" className="department-icon-button" aria-label="Làm mới danh sách" title="Làm mới danh sách" disabled={loading} onClick={() => setRevision(value => value + 1)}><Icon name="refresh" className={loading ? "department-spinning" : ""} /></button>
      </div></div>

      <form className="department-filters" onSubmit={apply}>
        <label className="department-search"><span><Icon name="building" />Tên phòng ban</span><span className="department-search-field"><Icon name="search" /><input ref={searchRef} type="search" autoComplete="off" placeholder="Tìm tên phòng ban…" value={filters.name} onChange={event => setFilters(value => ({ ...value, name: event.target.value }))} /><kbd aria-hidden="true">/</kbd></span></label>
        <div className="department-select-field"><span><Icon name="briefcase" />Công ty</span><SearchableSelect id="department-company-filter" label="Công ty" placeholder="Tất cả công ty" value={filters.companyId} options={companyOptions} onChange={companyId => setFilters(value => ({ ...value, companyId }))} /></div>
        <div className="department-filter-actions"><button type="button" className="department-icon-button" title="Xóa bộ lọc" aria-label="Xóa bộ lọc" onClick={reset}><Icon name="close" /></button><button className="department-button department-filter-button" type="submit"><Icon name="search" />Tìm kiếm</button></div>
      </form>

      {hasFilters && <div className="department-chips" aria-label="Bộ lọc đang áp dụng">
        <span><Icon name="sliders" />Đang lọc:</span>
        {applied.name && <button type="button" onClick={() => { const next = { ...applied, name: "" }; setFilters(next); setApplied(next); setPage(1); }}>“{applied.name}”<Icon name="close" /></button>}
        {applied.companyId && <button type="button" onClick={() => { const next = { ...applied, companyId: "" }; setFilters(next); setApplied(next); setPage(1); }}>{companyOptions.find(option => option.id === applied.companyId)?.name || "Công ty"}<Icon name="close" /></button>}
        {status !== "all" && <button type="button" onClick={() => { setStatus("all"); setPage(1); }}>{status === "active" ? "Đang hoạt động" : "Tạm ngưng"}<Icon name="close" /></button>}
        <button type="button" className="department-chip-clear" onClick={reset}>Xóa tất cả</button>
      </div>}

      {(error || companyError) && <div className="department-error" role="alert"><Icon name="alert" /><span>{error || companyError}</span><button onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}

      <div key={status} id="department-results" role="tabpanel" aria-labelledby={"department-tab-" + status} aria-busy={loading} className="department-results">
        {view === "table" ? <table className={loading && items.length ? "department-table department-loading" : "department-table"}>
          <thead><tr><th scope="col"><button className="department-sort" onClick={() => setDescending(value => !value)} aria-label={descending ? "Sắp xếp tên A đến Z" : "Sắp xếp tên Z đến A"}><Icon name="layers" />Tên phòng ban<Icon name="down" style={{ transform: descending ? "rotate(180deg)" : undefined }} /></button></th><th scope="col"><span className="department-columnLabel"><Icon name="building" />Công ty trực thuộc</span></th><th scope="col"><span className="department-columnLabel"><Icon name="check" />Trạng thái</span></th><th scope="col"><span className="department-sr-only">Thao tác</span></th></tr></thead>
          <tbody>
            {showSkeleton ? Array.from({ length: 6 }, (_, index) => <tr key={index} aria-hidden="true"><td><div className="department-skeleton department-skeleton-name" /><div className="department-skeleton department-skeleton-description" /></td><td><div className="department-skeleton" /></td><td><div className="department-skeleton department-skeleton-status" /></td><td /></tr>) : visible.map((item, index) => <tr key={item.id} style={{ "--item-index": Math.min(index, 7) } as CSSProperties}>
              <td><div className="department-name-cell"><span className="department-folder"><Icon name={resolveDepartmentIcon(item.name)} /></span><div><button className="department-name" title={item.name} onClick={() => setEditor(item)}>{item.name}</button><p title={item.description ?? undefined}>{item.description || "Chưa có mô tả"}</p></div></div></td>
              <td><div className="department-company"><span>{companies.find(company => company.id === item.companyId)?.companyCode || "ĐV"}</span><p title={companyName(item)}>{companyName(item)}</p></div></td>
              <td><span className={"department-status " + (item.isActive ? "active" : "inactive")}><span className="department-dot" />{item.isActive ? "Hoạt động" : "Tạm ngưng"}</span></td>
              <td><div className="department-row-actions"><button className="department-icon-button" aria-label={"Sao chép tên " + item.name} title="Sao chép tên" onClick={() => copyName(item.name)}><Icon name="copy" /></button><button className="department-icon-button" aria-label={"Chỉnh sửa " + item.name} title="Chỉnh sửa" onClick={() => setEditor(item)}><Icon name="edit" /></button><button className="department-icon-button department-delete-button" aria-label={"Xóa " + item.name} title="Xóa phòng ban" onClick={() => setDeleting(item)}><Icon name="trash" /></button></div></td>
            </tr>)}
          </tbody>
        </table> : <ul className={loading && items.length ? "department-grid department-loading" : "department-grid"}>
          {showSkeleton ? Array.from({ length: 6 }, (_, index) => <li key={index} aria-hidden="true" className="department-card"><div className="department-skeleton department-skeleton-name" /><div className="department-skeleton department-skeleton-description" /><div className="department-skeleton" style={{ marginTop: 28 }} /></li>) : visible.map((item, index) => <li key={item.id} style={{ "--item-index": Math.min(index, 7) } as CSSProperties} className={"department-card" + (item.isActive ? "" : " is-inactive")}>
            <div className="department-card-top"><span className="department-folder"><Icon name={resolveDepartmentIcon(item.name)} /></span><span className={"department-status " + (item.isActive ? "active" : "inactive")}><span className="department-dot" />{item.isActive ? "Hoạt động" : "Tạm ngưng"}</span></div>
            <button className="department-name" title={item.name} onClick={() => setEditor(item)}>{item.name}</button>
            <p className="department-card-desc">{item.description || "Chưa có mô tả"}</p>
            <div className="department-card-foot"><div className="department-company"><span>{companies.find(company => company.id === item.companyId)?.companyCode || "ĐV"}</span><p title={companyName(item)}>{companyName(item)}</p></div>
              <div className="department-row-actions"><button className="department-icon-button" aria-label={"Sao chép tên " + item.name} title="Sao chép tên" onClick={() => copyName(item.name)}><Icon name="copy" /></button><button className="department-icon-button" aria-label={"Chỉnh sửa " + item.name} title="Chỉnh sửa" onClick={() => setEditor(item)}><Icon name="edit" /></button><button className="department-icon-button department-delete-button" aria-label={"Xóa " + item.name} title="Xóa phòng ban" onClick={() => setDeleting(item)}><Icon name="trash" /></button></div></div>
          </li>)}
        </ul>}
        {!loading && !rows.length && <div className="department-empty"><span><Icon name="building" /></span><h2>{error ? "Chưa tải được danh sách" : hasFilters ? "Chưa có phòng ban phù hợp" : "Chưa có phòng ban nào"}</h2><p>{error ? "Thử tải lại để xem thông tin phòng ban." : hasFilters ? "Thử đổi tên, công ty hoặc trạng thái đang lọc." : "Bắt đầu bằng việc thêm phòng ban đầu tiên."}</p><button className="department-button" onClick={error ? () => setRevision(value => value + 1) : hasFilters ? reset : () => setEditor("new")}>{error ? "Tải lại danh sách" : hasFilters ? "Xóa bộ lọc" : "Thêm phòng ban"}<Icon name="arrow" /></button></div>}
      </div>

      <Pagination
        itemLabel="phòng ban"
        page={currentPage}
        pageSize={pageSize}
        total={rows.length}
        loading={loading}
        error={!!error}
        onPageChange={setPage}
        onPageSizeChange={size => { setPageSize(size); setPage(1); }}
      />
    </section>

    {editor && <DepartmentEditor key={editor === "new" ? "new" : editor.id} item={editor === "new" ? undefined : editor} companyOptions={companyOptions} initialCompanyId={Number(applied.companyId) || 0} onClose={() => setEditor(null)} onSaved={saved} onError={message => notify("error", message)} />}
    {deleting && <DeleteDepartment item={deleting} onClose={() => setDeleting(null)} onDeleted={saved} onError={message => notify("error", message)} />}
  </div>;
}

function DepartmentEditor({ item, companyOptions, initialCompanyId, onClose, onSaved, onError }: {
  item?: Department;
  companyOptions: { id: string; name: string }[];
  initialCompanyId: number;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const initial: DepartmentDraft = { name: item?.name ?? "", description: item?.description ?? "", companyId: item?.companyId ?? initialCompanyId, isActive: item?.isActive ?? true };
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const options = item && !companyOptions.some(option => option.id === String(item.companyId)) ? [...companyOptions, { id: String(item.companyId), name: item.companyName || "Công ty #" + item.companyId }] : companyOptions;

  useEffect(() => { dialog.current?.showModal(); dialog.current?.querySelector("input")?.focus(); }, []);

  function close() {
    if (busy || closing) return;
    if (dirty && !window.confirm("Bạn muốn bỏ các thay đổi chưa lưu?")) return;
    setClosing(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || closing) return;
    if (!draft.companyId) { setError("Vui lòng chọn công ty trực thuộc."); return; }
    if (!draft.name.trim()) { setError("Vui lòng nhập tên phòng ban."); return; }
    setBusy(true);
    setError("");
    try {
      await departmentApi.save(draft, item?.id);
      onSaved(item ? `Đã cập nhật ${draft.name.trim()}.` : `Đã thêm ${draft.name.trim()}.`);
      setClosing(true);
    } catch (error) {
      const message = errorMessage(error, "Không thể lưu phòng ban. Vui lòng thử lại.");
      setError(message);
      onError(message);
    } finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="department-editor" data-closing={closing} onAnimationEnd={event => { if (event.target === event.currentTarget && closing) { dialog.current?.close(); onClose(); } }} aria-labelledby="department-editor-title" onCancel={event => { event.preventDefault(); close(); }}>
    <form onSubmit={save} className="department-editor-form" inert={closing}>
      <header className="department-editor-header"><DepartmentBackground /><span className="department-editor-symbol"><Icon name="building" /></span><div><h2 id="department-editor-title">{item ? "Chỉnh sửa phòng ban" : "Thêm phòng ban"}</h2><p>{item ? item.name : "Thông tin đơn vị trong hệ thống KPI"}</p></div><button type="button" className="department-icon-button" disabled={busy} aria-label="Đóng khung chỉnh sửa" onClick={close}><Icon name="close" /></button></header>
      <div className="department-editor-body">
        <label className="department-field"><span>Tên phòng ban <b aria-hidden="true">*</b></span><input autoFocus required value={draft.name} placeholder="Ví dụ, Ban Nhân sự" onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} disabled={busy} /></label>
        <div className="department-select-field"><span>Công ty trực thuộc <b aria-hidden="true">*</b></span><SearchableSelect id="department-editor-company" label="Công ty trực thuộc" placeholder="Chọn công ty" required value={draft.companyId ? String(draft.companyId) : ""} options={options} onChange={value => setDraft(draft => ({ ...draft, companyId: Number(value) }))} disabled={busy} /></div>
        <label className="department-field"><span>Mô tả <small>Không bắt buộc</small></span><textarea rows={4} value={draft.description ?? ""} placeholder="Chức năng hoặc ghi chú về phòng ban…" onChange={event => setDraft(value => ({ ...value, description: event.target.value }))} disabled={busy} /></label>
        <label className="department-activity"><span><strong>Trạng thái hoạt động</strong><small>{draft.isActive ? "Phòng ban đang được sử dụng trong hệ thống." : "Phòng ban được đánh dấu tạm ngưng hoạt động."}</small></span><input type="checkbox" role="switch" checked={draft.isActive} onChange={event => setDraft(value => ({ ...value, isActive: event.target.checked }))} disabled={busy} /><span className="department-switch" aria-hidden="true" /></label>
        {error && <p className="department-form-error" role="alert"><Icon name="alert" />{error}</p>}
      </div>
      <footer className="department-editor-footer"><button type="button" className="department-button" onClick={close} disabled={busy}>Hủy</button><button className="department-button department-primary" disabled={busy || (!!item && !dirty)} type="submit"><Icon name={busy ? "refresh" : "check"} className={busy ? "department-spinning" : ""} />{busy ? "Đang lưu…" : item ? "Lưu thay đổi" : "Thêm phòng ban"}</button></footer>
    </form>
  </dialog>;
}

function DeleteDepartment({ item, onClose, onDeleted, onError }: { item: Department; onClose: () => void; onDeleted: (message: string) => void; onError: (message: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await departmentApi.remove(item.id); onDeleted(`Đã xóa ${item.name}.`); onClose(); }
    catch (error) { const message = errorMessage(error, "Không thể xóa phòng ban."); setError(message); onError(message); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="department-delete-dialog" aria-labelledby="department-delete-title" aria-describedby="department-delete-description" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}>
    <span className="department-delete-symbol"><Icon name="trash" /></span><h2 id="department-delete-title">Xóa phòng ban?</h2><p id="department-delete-description">Bạn đang xóa <strong>{item.name}</strong>. Thao tác này không thể hoàn tác.</p>
    {error && <p className="department-form-error" role="alert">{error}</p>}
    <footer><button autoFocus className="department-button" onClick={onClose} disabled={busy}>Giữ lại</button><button className="department-button department-primary" onClick={remove} disabled={busy}>{busy ? "Đang xóa…" : "Xóa phòng ban"}</button></footer>
  </dialog>;
}
