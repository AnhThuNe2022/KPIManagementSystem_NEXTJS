"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRightIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, Cross2Icon,
  ExclamationTriangleIcon, FileIcon, LayersIcon, MagnifyingGlassIcon,
  PlusIcon, ReloadIcon, ResetIcon, TrashIcon,
} from "@radix-ui/react-icons";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { notify } from "@/components/ui/toast";
import type { MenuDto } from "@/types/menu";
import { menuApi, type MenuDraft } from "./menuApi";
import { flattenMenus, matchesMenu } from "./menuTree";
import { MenuIcon, menuIconOptions } from "./MenuIcon";
import s from "./menus.module.css";

const blank = (parentId: number | null = null): MenuDraft => ({
  id: 0, code: "", title: "", url: "", icon: "HamburgerMenuIcon", parentId, orderNo: 1, isActive: true,
});
const toDraft = (menu: MenuDto): MenuDraft => ({
  id: menu.id, code: menu.code, title: menu.title, orderNo: menu.orderNo,
  isActive: menu.isActive, url: menu.url ?? "", icon: menu.icon ?? "", parentId: menu.parentId ?? null,
});
const filters = [{ id: "all", label: "Tất cả" }, { id: "active", label: "Đang bật" }, { id: "inactive", label: "Tạm ẩn" }] as const;

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Không thể hoàn tất thao tác. Vui lòng thử lại.";
  if (message === "UNAUTHORIZED") return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (message === "FORBIDDEN") return "Bạn chưa có quyền quản lý menu.";
  return message;
}

type Confirmation = { type: "delete" } | { type: "discard"; run: () => void };

export function MenuManagement() {
  const [menus, setMenus] = useState<MenuDto[]>([]);
  const [draft, setDraft] = useState<MenuDraft | null>(null);
  const [original, setOriginal] = useState<MenuDraft | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<typeof filters[number]["id"]>("all");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useRef<HTMLElement>(null);
  const mutationLock = useRef(false);
  const rows = flattenMenus(menus);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const current = rows.find(row => row.menu.id === draft?.id);
  const parent = rows.find(row => row.menu.id === draft?.parentId);
  const selectedIcon = menuIconOptions.find(option => option.id === draft?.icon);
  const parentOptions = rows.filter(row => row.menu.id !== draft?.id && !row.ancestors.some(menu => menu.id === draft?.id))
    .map(row => ({ id: String(row.menu.id), name: [...row.ancestors.map(menu => menu.title), row.menu.title].join(" / ") }));
  const matches = rows.filter(({ menu }) => matchesMenu(menu, query) && (filter === "all" || menu.isActive === (filter === "active")));
  const visibleIds = new Set(matches.flatMap(row => [...row.ancestors.map(menu => menu.id), row.menu.id]));
  const searching = query.trim() !== "" || filter !== "all";
  const visibleRows = rows.filter(row => visibleIds.has(row.menu.id) && (searching || !row.ancestors.some(menu => collapsed.has(menu.id))));
  const activeCount = rows.filter(row => row.menu.isActive).length;
  const descendants = current ? rows.filter(row => row.ancestors.some(menu => menu.id === current.menu.id)).length : 0;

  function edit(menu: MenuDraft, scroll = false) {
    setDraft(menu); setOriginal(menu); setError("");
    if (scroll && window.matchMedia("(max-width: 1100px)").matches) editor.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function guard(run: () => void) {
    if (busy || loading || mutationLock.current) return;
    if (dirty) setConfirmation({ type: "discard", run });
    else run();
  }

  const reload = useCallback(async (selection?: { id: number; code: string }, signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const data = await menuApi.tree(signal);
      if (signal?.aborted) return;
      const ordered = flattenMenus(data);
      const next = ordered.find(row => selection && (selection.id ? row.menu.id === selection.id : row.menu.code === selection.code))?.menu ?? ordered[0]?.menu;
      const value = next ? toDraft(next) : null;
      setMenus(data);
      setDraft(value); setOriginal(value);
    } catch (cause) {
      if (signal?.aborted) return;
      const message = errorMessage(cause);
      setError(message); notify("error", message, "menu-load");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reload(undefined, controller.signal);
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  useEffect(() => {
    if (!confirmation) return;
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, [confirmation]);

  async function mutate(action: "save" | "delete") {
    if (!draft || mutationLock.current || (action === "delete" && !draft.id)) return;
    mutationLock.current = true; setBusy(true); setError("");
    try {
      const deleting = action === "delete";
      await (deleting ? menuApi.remove(draft.id) : menuApi.save(draft));
      notify("success", `Đã ${deleting ? "xóa" : draft.id ? "lưu" : "tạo"} menu “${draft.title.trim()}”.`);
      setConfirmation(null); setDraft(null); setOriginal(null);
      await reload(deleting ? undefined : { id: draft.id, code: draft.code.trim() });
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message); notify("error", message);
    } finally { mutationLock.current = false; setBusy(false); }
  }

  function update(patch: Partial<MenuDraft>) {
    setDraft(value => value ? { ...value, ...patch } : value);
    if (error) setError("");
  }

  return <div className={s.page}>
    <header className={s.pageHeader}>
      <div><h1>Quản lý menu<span>.</span></h1><p>Sắp xếp điều hướng. Kết nối từng màn hình.</p></div>
      <div className={s.headerActions}>
        <button type="button" className={s.secondary} disabled={loading || busy} onClick={() => guard(() => void reload(draft ? { id: draft.id, code: draft.code } : undefined))}><ReloadIcon aria-hidden="true" className={loading ? s.spinning : ""} /><span>Tải lại</span></button>
        <button type="button" className={s.primary} disabled={loading || busy} onClick={() => guard(() => edit(blank(), true))}><PlusIcon aria-hidden="true" />Thêm menu</button>
      </div>
    </header>

    <section className={s.workspace} aria-label="Không gian quản lý menu">
      <section className={s.catalog} aria-labelledby="menu-tree-title" aria-busy={loading}>
        <div className={s.catalogHeader}>
          <div className={s.sectionTitle}><LayersIcon aria-hidden="true" /><h2 id="menu-tree-title">Cấu trúc điều hướng</h2><span className={s.count}>{rows.length}</span></div>
          <p>Chọn một menu để xem và chỉnh sửa.</p>
          <div className={s.search}><MagnifyingGlassIcon aria-hidden="true" /><input aria-label="Tìm menu" placeholder="Tìm tên, mã hoặc đường dẫn…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}><Cross2Icon /></button>}</div>
          <div className={s.filters} aria-label="Lọc trạng thái menu">{filters.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.id !== "all" && <span className={item.id === "active" ? s.greenDot : s.grayDot} />}{item.label}<span>{item.id === "all" ? rows.length : item.id === "active" ? activeCount : rows.length - activeCount}</span></button>)}</div>
        </div>
        <div className={s.listToolbar}><span>{searching ? `${matches.length} kết quả` : `${menus.length} menu cấp gốc`}</span><button type="button" disabled={loading || searching} onClick={() => setCollapsed(collapsed.size ? new Set() : new Set(rows.filter(row => row.menu.children?.length).map(row => row.menu.id)))}>{collapsed.size ? "Mở tất cả" : "Thu gọn"}<ChevronDownIcon aria-hidden="true" /></button></div>
        {loading && !rows.length ? <div className={s.skeleton} role="status" aria-label="Đang tải cây menu">{Array.from({ length: 7 }, (_, i) => <div key={i} />)}</div>
        : !rows.length ? <div className={s.empty}><LayersIcon aria-hidden="true" /><h3>{error ? "Chưa tải được menu" : "Bắt đầu từ một menu"}</h3><p>{error ? "Tải lại để thử kết nối với hệ thống." : "Thêm menu đầu tiên để tạo cấu trúc điều hướng."}</p><button type="button" className={s.secondary} disabled={loading || busy} onClick={() => error ? guard(() => void reload()) : guard(() => edit(blank(), true))}>{error ? <ReloadIcon /> : <PlusIcon />}{error ? "Thử lại" : "Thêm menu đầu tiên"}</button></div>
        : !visibleRows.length ? <div className={s.empty}><MagnifyingGlassIcon aria-hidden="true" /><h3>Không tìm thấy menu</h3><p>Thử tên khác hoặc bỏ bộ lọc trạng thái.</p><button type="button" className={s.secondary} onClick={() => { setQuery(""); setFilter("all"); }}>Xóa bộ lọc</button></div>
        : <ul className={s.tree} aria-label="Cây menu hệ thống">{visibleRows.map(({ menu, ancestors }) => <li key={menu.id} className={s.treeRow} data-selected={draft?.id === menu.id} data-context={searching && !matches.some(row => row.menu.id === menu.id)} style={{ "--level": Math.min(ancestors.length, 5) } as CSSProperties}>
          <div className={s.node}>
            {menu.children?.length ? <button className={s.disclosure} type="button" aria-label={`${collapsed.has(menu.id) ? "Mở" : "Thu gọn"} ${menu.title}`} aria-expanded={searching || !collapsed.has(menu.id)} disabled={searching} onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(menu.id)) next.delete(menu.id); else next.add(menu.id); return next; })}><ChevronRightIcon className={searching || !collapsed.has(menu.id) ? s.rotated : ""} /></button> : <span className={s.branch} aria-hidden="true" />}
            <button type="button" className={s.choose} disabled={loading || busy} aria-label={`Chỉnh sửa ${[...ancestors.map(item => item.title), menu.title].join(" / ")}, ${menu.isActive ? "đang bật" : "tạm ẩn"}`} aria-pressed={draft?.id === menu.id} onClick={() => guard(() => edit(toDraft(menu), true))}>
              <span className={s.nodeIcon} data-group={!!menu.children?.length}><MenuIcon name={menu.icon} /></span>
              <span className={s.nodeText}><strong>{menu.title}</strong><span>{menu.code}{menu.children?.length ? <span className={s.childrenCount}>{menu.children.length} mục</span> : null}</span></span>
              <span className={s.nodeEnd}><span className={s.statusDot} data-active={menu.isActive} aria-label={menu.isActive ? "Đang bật" : "Tạm ẩn"} /><ChevronRightIcon aria-hidden="true" /></span>
            </button>
          </div>
          {menu.url && <span className={s.rowUrl} title={menu.url}>{menu.url}</span>}
        </li>)}</ul>}
        <footer className={s.catalogFooter}><span><span className={s.greenDot} />Đang bật</span><span><span className={s.grayDot} />Tạm ẩn</span><span>Thứ tự theo cấu hình menu</span></footer>
      </section>

      <section ref={editor} className={s.editor} aria-labelledby="menu-editor-title" aria-busy={busy}>
        <div className={s.editorHeading}><h2 id="menu-editor-title">{draft?.id ? "Chi tiết menu" : "Menu mới"}</h2>{dirty ? <span className={s.unsaved}>Chưa lưu</span> : draft?.id ? <span className={s.saved}><CheckIcon aria-hidden="true" />Đã đồng bộ</span> : null}</div>
        {error && <div className={s.error} role="alert"><ExclamationTriangleIcon aria-hidden="true" /><span>{error}</span></div>}
        {draft ? <form onSubmit={event => { event.preventDefault(); void mutate("save"); }} className={s.form}>
          <fieldset disabled={busy || loading}>
            <div className={s.preview}>
              <div className={s.previewPath}><LayersIcon aria-hidden="true" /><span>{parent ? [...parent.ancestors.map(menu => menu.title), parent.menu.title].join(" / ") : "Menu cấp gốc"}</span><ChevronRightIcon aria-hidden="true" /></div>
              <div className={s.previewItem}><span className={s.previewIcon}><MenuIcon name={draft.icon} /></span><div><strong>{draft.title || "Tên menu của bạn"}</strong><span>{draft.url || "Nhóm điều hướng"}</span></div><span className={s.previewStatus}>{draft.isActive ? <><span />Đang bật</> : "Tạm ẩn"}</span></div>
            </div>
            <div className={s.fields} key={draft.id}>
              <div className={s.fullField}><label htmlFor="menu-title">Tên hiển thị <span>*</span></label><input id="menu-title" value={draft.title} required placeholder="Ví dụ: Danh sách đánh giá" onChange={event => update({ title: event.target.value })} /></div>
              <div><label htmlFor="menu-code">Mã menu <span>*</span></label><input id="menu-code" value={draft.code} required placeholder="Ví dụ: EVALUATION_LIST" onChange={event => update({ code: event.target.value })} /></div>
              <div><label htmlFor="menu-order">Thứ tự hiển thị <span>*</span></label><input id="menu-order" type="number" min="0" step="1" required value={Number.isNaN(draft.orderNo) ? "" : draft.orderNo} onChange={event => update({ orderNo: event.target.valueAsNumber })} /></div>
              <div className={s.fullField}><label htmlFor="menu-parent">Nằm trong menu</label><SearchableSelect id="menu-parent" label="Menu cha" placeholder="Không có — menu cấp gốc" value={draft.parentId == null ? "" : String(draft.parentId)} options={parentOptions} disabled={busy || loading} onChange={value => update({ parentId: value ? Number(value) : null })} /></div>
              <div className={s.fullField}><label htmlFor="menu-url">Đường dẫn</label><div className={s.urlInput}><ArrowRightIcon aria-hidden="true" /><input id="menu-url" value={draft.url ?? ""} placeholder="/admin/evaluationList" onChange={event => update({ url: event.target.value })} /></div><p className={s.hint}>Có thể để trống nếu đây là nhóm chứa các menu con.</p></div>
              <div className={s.fullField}><label htmlFor="menu-icon">Biểu tượng</label><div className={s.iconSelect}><span className={s.iconSample}><MenuIcon name={draft.icon} /></span><SearchableSelect id="menu-icon" label="Biểu tượng" placeholder="Không có biểu tượng" options={menuIconOptions} value={draft.icon ?? ""} valueLabel={!selectedIcon && draft.icon ? `${draft.icon} (chọn lại)` : undefined} disabled={busy || loading} onChange={value => update({ icon: value })} /></div>{draft.icon && !selectedIcon && <p className={s.hint}>Biểu tượng đang lưu chưa được hỗ trợ. Chọn biểu tượng mới để xem trước.</p>}</div>
              <label className={s.statusSetting} htmlFor="menu-active"><span><strong>Trạng thái hoạt động</strong><span>{draft.isActive ? "Cho phép hiển thị menu trong hệ thống." : "Menu đang được tạm ẩn."}</span></span><input id="menu-active" type="checkbox" role="switch" checked={draft.isActive} onChange={event => update({ isActive: event.target.checked })} /><span className={s.switch} aria-hidden="true" /></label>
            </div>
          </fieldset>
          <footer className={s.editorFooter}>
            <div>{draft.id ? <><button type="button" className={s.deleteButton} disabled={busy || loading} onClick={() => setConfirmation({ type: "delete" })} title="Xóa menu"><TrashIcon aria-hidden="true" /><span>Xóa</span></button><button type="button" className={s.childButton} disabled={busy || loading} onClick={() => guard(() => edit(blank(draft.id), true))}><PlusIcon aria-hidden="true" />Thêm menu con</button></> : <span className={s.draftLabel}>Menu chưa được tạo</span>}</div>
            <div><button type="button" className={s.resetButton} title="Hoàn tác thay đổi" aria-label="Hoàn tác thay đổi" disabled={!dirty || busy || loading} onClick={() => setDraft(original)}><ResetIcon aria-hidden="true" /></button><button type="submit" className={draft.id ? s.saveButton : s.primary} disabled={busy || loading || (!dirty && !!draft.id)}>{busy ? <ReloadIcon aria-hidden="true" className={s.spinning} /> : <CheckIcon aria-hidden="true" />}{busy ? "Đang lưu…" : draft.id ? "Lưu thay đổi" : "Tạo menu"}</button></div>
          </footer>
        </form> : <div className={s.editorEmpty}>{loading ? <ReloadIcon className={s.spinning} aria-hidden="true" /> : <FileIcon aria-hidden="true" />}<h3>{loading ? "Đang tải cấu trúc menu…" : "Mỗi màn hình, đúng vị trí."}</h3><p>Chọn menu trong cây điều hướng hoặc thêm menu mới để bắt đầu.</p></div>}
      </section>
    </section>

    {confirmation && <dialog ref={dialog} className={s.dialog} aria-labelledby="menu-confirm-title" aria-describedby="menu-confirm-description" onCancel={event => { if (busy) event.preventDefault(); else { setConfirmation(null); setError(""); } }}>
      <div className={s.confirmIcon} data-danger={confirmation.type === "delete"}>{confirmation.type === "delete" ? <TrashIcon aria-hidden="true" /> : <ResetIcon aria-hidden="true" />}</div>
      <h2 id="menu-confirm-title">{confirmation.type === "delete" ? "Xóa menu này?" : "Bạn còn thay đổi chưa lưu"}</h2>
      <p id="menu-confirm-description">{confirmation.type === "delete" ? <>Menu <strong>“{draft?.title}”</strong> sẽ được xóa khỏi cấu trúc điều hướng.{descendants > 0 && <> Menu này có {descendants} menu con bên dưới. Hãy kiểm tra các menu con trước khi xóa.</>}</> : "Lưu thay đổi trước hoặc bỏ thay đổi để tiếp tục thao tác vừa chọn."}</p>
      {error && <p className={s.confirmError} role="alert">{error}</p>}
      <div className={s.confirmActions}><button autoFocus type="button" className={s.secondary} disabled={busy} onClick={() => { setConfirmation(null); setError(""); }}>{confirmation.type === "delete" ? "Giữ lại" : "Tiếp tục chỉnh sửa"}</button><button type="button" className={confirmation.type === "delete" ? s.primary : s.saveButton} disabled={busy} onClick={() => { if (confirmation.type === "delete") void mutate("delete"); else { confirmation.run(); setConfirmation(null); } }}>{busy ? "Đang xử lý…" : confirmation.type === "delete" ? "Xóa menu" : "Bỏ thay đổi"}</button></div>
    </dialog>}
  </div>;
}
