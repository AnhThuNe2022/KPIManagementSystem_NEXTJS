"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ChevronRightIcon, Cross2Icon, DesktopIcon, InfoCircledIcon, LockClosedIcon, MagnifyingGlassIcon, PersonIcon, PlusIcon, ReloadIcon, SymbolIcon, TrashIcon } from "@radix-ui/react-icons";
import { Pagination } from "@/components/ui/pagination";
import { permissionApi, permissionError, type Assignment, type AssignmentTab, type Permission, type PermissionDraft, type PermissionPage } from "./permissionApi";
import s from "./permissions.module.css";

const blank: PermissionDraft = { code: "", name: "", module: "", description: "", isActive: true, isPublic: false };
const tabs = [
  { id: "detail", label: "Chi tiết", icon: InfoCircledIcon },
  { id: "menus", label: "Màn hình", icon: DesktopIcon },
  { id: "roles", label: "Vai trò", icon: LockClosedIcon },
  { id: "users", label: "Người dùng", icon: PersonIcon },
] as const;
type Tab = typeof tabs[number]["id"];
type AssignmentState = { tab: AssignmentTab; data?: PermissionPage<Assignment>; error?: string };
type Confirmation = { type: "delete"; error?: string } | { type: "discard"; run: () => void; error?: string };
const positive = (value: string | null, fallback: number) => value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : fallback;
const assignmentKeyFor = (id: string, tab: Tab, search = "", page = 1, size = 10) => JSON.stringify([id, tab, search, tab === "users" ? page : 1, tab === "users" ? size : 10]);

function assignmentLabel(target: Assignment) {
  return "userName" in target ? target.userName : target.name;
}

export function Permissions() {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const selectedId = params.get("permission") ?? "";
  const tab: Tab = tabs.some(t => t.id === params.get("tab")) ? params.get("tab") as Tab : "detail";
  const page = positive(params.get("page"), 1), pageSize = [10, 20, 50].includes(Number(params.get("size"))) ? Number(params.get("size")) : 10;
  const keyword = params.get("q") ?? "", search = params.get("search") ?? "", userPage = positive(params.get("userPage"), 1);
  const userSize = [10, 20, 50].includes(Number(params.get("userSize"))) ? Number(params.get("userSize")) : 10;
  const [searchInput, setSearchInput] = useState(keyword), [tabSearch, setTabSearch] = useState(search);
  const [list, setList] = useState<PermissionPage<Permission> | null>(null), [loading, setLoading] = useState(true), [listError, setListError] = useState("");
  const [detail, setDetail] = useState<Permission | null>(null), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState("");
  const [assignments, setAssignments] = useState<Record<string, AssignmentState>>({});
  const [counts, setCounts] = useState<Partial<Record<AssignmentTab, number>>>({});
  const [draft, setDraft] = useState<PermissionDraft>(blank), [creating, setCreating] = useState(false), [busy, setBusy] = useState("");
  const [pendingAssignments, setPendingAssignments] = useState(new Set<string>());
  const [catalogOpen, setCatalogOpen] = useState(!selectedId);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null), [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [revision, setRevision] = useState(0), [detailRevision, setDetailRevision] = useState(0), [assignmentRevision, setAssignmentRevision] = useState(0);
  const confirmationRef = useRef<HTMLDialogElement>(null), tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mutationLock = useRef(false);
  const assignmentLocks = useRef(new Set<string>()), assignmentVersion = useRef(0), selectedIdRef = useRef(selectedId);
  const assignmentRequests = useRef(new Map<string, AbortController>());
  const current = detail && String(detail.id) === selectedId ? detail : null;
  const dirty = creating ? JSON.stringify(draft) !== JSON.stringify(blank) : Boolean(current && (Object.keys(blank) as (keyof PermissionDraft)[]).some(key => draft[key] !== current[key]));
  const assignmentKey = assignmentKeyFor(selectedId, tab, search, userPage, userSize);
  const assignmentData = assignments[assignmentKey]?.data;
  const assignmentError = assignments[assignmentKey]?.error ?? "";
  const assignmentLoading = tab !== "detail" && Boolean(current) && !assignmentData && !assignmentError;
  const confirmOpen = confirmation !== null;

  function updateQuery(changes: Record<string, string | number | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  function guard(action: () => void) {
    if (mutationLock.current) return;
    if (dirty) setConfirmation({ type: "discard", run: action });
    else action();
  }
  function choose(id: number) {
    if (String(id) === selectedId && !creating) { setCatalogOpen(false); return; }
    guard(() => { setCatalogOpen(false); setCreating(false); setNotice(null); updateQuery({ permission: id, tab: null, search: null, userPage: null }); });
  }
  function startCreate() {
    guard(() => { setCatalogOpen(false); setCreating(true); setDraft({ ...blank }); setNotice(null); updateQuery({ tab: null, search: null, userPage: null }); });
  }

  useEffect(() => { setSearchInput(keyword); }, [keyword]);
  useEffect(() => { setTabSearch(search); }, [search, tab]);
  useEffect(() => {
    selectedIdRef.current = selectedId; setCounts({}); setAssignments({});
    const requests = assignmentRequests.current;
    return () => { requests.forEach(controller => controller.abort()); requests.clear(); };
  }, [selectedId, creating]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setListError("");
    permissionApi.list(page, pageSize, keyword, controller.signal).then(data => {
      if (!controller.signal.aborted) setList(data);
    }).catch(error => {
      if (!controller.signal.aborted) { setList(null); setListError(permissionError(error)); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, pageSize, keyword, revision]);

  useEffect(() => {
    if (!selectedId || creating) { setDetail(null); setDetailError(""); setDetailLoading(false); return; }
    const controller = new AbortController();
    setDetail(null); setDetailLoading(true); setDetailError("");
    permissionApi.detail(selectedId, controller.signal).then(data => {
      if (!controller.signal.aborted) { setDetail(data); setCounts({ menus: data.menuCount, roles: data.roleCount, users: data.userCount }); setDraft({ code: data.code, name: data.name, module: data.module, description: data.description, isActive: data.isActive, isPublic: data.isPublic }); }
    }).catch(error => { if (!controller.signal.aborted) setDetailError(permissionError(error)); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, creating, detailRevision]);

  useEffect(() => {
    if (!current || creating || tab === "detail" || assignmentRequests.current.has(assignmentKey)) return;
    const controller = new AbortController(), kind = tab;
    assignmentRequests.current.set(assignmentKey, controller);
    setAssignments(value => ({ ...value, [assignmentKey]: { tab: kind } }));
    void (async () => {
      try {
        let data: PermissionPage<Assignment>, version: number;
        do {
          version = assignmentVersion.current;
          data = await permissionApi.assignments(selectedId, kind, search, userPage, userSize, controller.signal);
        } while (!controller.signal.aborted && version !== assignmentVersion.current);
        if (!controller.signal.aborted) setAssignments(value => ({ ...value, [assignmentKey]: { tab: kind, data } }));
      } catch (error) {
        if (!controller.signal.aborted) setAssignments(value => ({ ...value, [assignmentKey]: { tab: kind, error: permissionError(error) } }));
      }
    })();
  }, [selectedId, current, creating, tab, search, userPage, userSize, assignmentKey, assignmentRevision]);

  useEffect(() => {
    if (!confirmOpen) return;
    const dialog = confirmationRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [confirmOpen]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutationLock.current || (!creating && !current)) return;
    mutationLock.current = true; setBusy("save"); setNotice(null);
    try {
      await permissionApi.save(draft, creating ? undefined : selectedId);
      if (creating) {
        setCreating(false); setCatalogOpen(true); setSearchInput("");
        updateQuery({ permission: null, tab: null, q: null, page: null });
      }
      setRevision(value => value + 1); setDetailRevision(value => value + 1);
      setNotice({ error: false, text: creating ? "Đã tạo quyền mới. Chọn quyền để phân quyền màn hình, vai trò và người dùng." : "Đã lưu thông tin quyền." });
    } catch (error) { setNotice({ error: true, text: permissionError(error) }); }
    finally { mutationLock.current = false; setBusy(""); }
  }
  async function remove() {
    if (mutationLock.current || assignmentLocks.current.size || !current) return;
    mutationLock.current = true; setBusy("delete");
    try {
      await permissionApi.remove(current.id);
      setConfirmation(null); setDetail(null); setDraft({ ...blank });
      updateQuery({ permission: null, tab: null, page: page > 1 && list?.items.length === 1 ? page - 1 : page });
      setRevision(value => value + 1); setNotice({ error: false, text: "Đã xóa quyền được chọn." });
    } catch (error) { setConfirmation({ type: "delete", error: permissionError(error) }); }
    finally { mutationLock.current = false; setBusy(""); }
  }
  async function toggle(target: Assignment) {
    if (mutationLock.current || !current || tab === "detail") return;
    const key = JSON.stringify([selectedId, tab, target.id]);
    if (assignmentLocks.current.has(key)) return;
    assignmentLocks.current.add(key); setPendingAssignments(new Set(assignmentLocks.current));
    const assigned = !target.isAssigned;
    try {
      await permissionApi.assign(selectedId, tab, target.id, assigned);
      assignmentVersion.current++;
      if (selectedIdRef.current === selectedId) {
        setAssignments(value => Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, entry.tab === tab && entry.data ? { ...entry, data: { ...entry.data, items: entry.data.items.map(item => item.id === target.id ? { ...item, isAssigned: assigned } : item) } } : entry])));
        setCounts(value => value[tab] == null ? value : { ...value, [tab]: Math.max(0, value[tab]! + (assigned ? 1 : -1)) });
      }
    } catch (error) {
      toast.error(`${assignmentLabel(target)}: ${permissionError(error)}`, { id: key, position: "bottom-right", style: { background: "var(--panel-paper)", color: "rgb(var(--color-text))", borderColor: "rgb(var(--color-border))" } });
    }
    finally { assignmentLocks.current.delete(key); setPendingAssignments(new Set(assignmentLocks.current)); }
  }

  return <div className={s.page} data-catalog={catalogOpen} data-selected={Boolean(selectedId) || creating}>
    {notice && <div className={s.notice} data-error={notice.error} role={notice.error ? "alert" : "status"}>
      {notice.error ? <InfoCircledIcon aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}<span>{notice.text}</span>
      {notice.error && notice.text.includes("đăng nhập") && <Link href="/login?next=/admin/permission">Đăng nhập lại</Link>}
      <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><Cross2Icon /></button>
    </div>}

    <div className={s.workbench}>
    <header className={s.heading}>
      <h1>Quản lý quyền trang Web</h1>
      <button className={s.primary} type="button" disabled={Boolean(busy)} onClick={startCreate}><PlusIcon aria-hidden="true" />Thêm quyền mới</button>
    </header>

    <section className={s.registry} aria-labelledby="permission-list-title">
      <div className={s.toolbar}>
        <h2 id="permission-list-title">Thư viện quyền {list && !listError && <span className={s.count}>{list.total.toLocaleString("vi-VN")}</span>}</h2>
        <button type="button" className={s.iconButton} aria-label="Tải lại danh sách quyền" disabled={loading || Boolean(busy)} onClick={() => setRevision(value => value + 1)}><ReloadIcon /></button>
      </div>
        <form className={s.search} role="search" onSubmit={event => { event.preventDefault(); updateQuery({ q: searchInput.trim(), page: null }); }}>
          <MagnifyingGlassIcon aria-hidden="true" /><input name="keyword" aria-label="Tìm quyền theo mã, tên hoặc module" placeholder="Tìm mã, tên hoặc module…" value={searchInput} onChange={event => setSearchInput(event.target.value)} autoComplete="off" />
          {searchInput && <button type="button" aria-label="Xóa tìm kiếm quyền" onClick={() => { setSearchInput(""); updateQuery({ q: null, page: null }); }}><Cross2Icon /></button>}
          <button type="submit" aria-label="Tìm quyền"><ArrowRightIcon /></button>
        </form>
      <div className={s.catalog} aria-busy={loading}>
        {loading ? <Loading /> : listError ? <Empty error title="Chưa tải được danh sách" text={listError} onRetry={() => setRevision(value => value + 1)} /> : !list?.items.length ? <Empty title={keyword ? "Không tìm thấy quyền phù hợp" : "Chưa có quyền nào"} text={keyword ? "Thử mã quyền hoặc một từ khóa khác." : "Tạo quyền đầu tiên để bắt đầu phân quyền."} /> : list.items.map((row, index) => <Fragment key={row.id}>
          {(index === 0 || list.items[index - 1].module !== row.module) && <h3 className={s.moduleHeading}><span>{row.module}</span></h3>}
          <button type="button" className={s.permissionItem} disabled={Boolean(busy)} aria-current={!creating && selectedId === String(row.id) ? "true" : undefined} onClick={() => choose(row.id)}>
            <span className={s.itemCopy}><strong>{row.name}</strong><code>{row.code}</code></span>
            <span className={s.itemState} data-active={row.isActive} title={row.isActive ? "Hoạt động" : "Không hoạt động"}>{row.isActive ? <CheckIcon aria-hidden="true" /> : <Cross2Icon aria-hidden="true" />}<span className={s.srOnly}>{row.isActive ? "Hoạt động" : "Không hoạt động"}</span></span>
            <ChevronRightIcon className={s.itemArrow} aria-hidden="true" />
          </button>
        </Fragment>)}
      </div>
      <footer className={s.catalogFooter}>
        <label>Hiển thị<select aria-label="Số quyền mỗi trang" value={pageSize} disabled={loading || Boolean(busy)} onChange={event => updateQuery({ size: Number(event.target.value), page: null })}>{[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
        <span aria-live="polite">{loading ? "…" : `${page} / ${Math.max(1, Math.ceil((list?.total ?? 0) / pageSize))}`}</span>
        <button type="button" aria-label="Trang quyền trước" disabled={loading || Boolean(busy) || page <= 1 || !list?.total} onClick={() => updateQuery({ page: page - 1 })}><ArrowLeftIcon /></button>
        <button type="button" aria-label="Trang quyền sau" disabled={loading || Boolean(busy) || !list || page * pageSize >= list.total} onClick={() => updateQuery({ page: page + 1 })}><ArrowRightIcon /></button>
      </footer>
    </section>

    <section className={s.workspace} aria-label="Chi tiết và phân quyền">
      {!selectedId && !creating ? <div className={s.unselected}>
        <LockClosedIcon aria-hidden="true" /><h2>Quyền rõ ràng.<br />Kết nối đúng người.</h2><p>Chọn một quyền trong thư viện để xem và quản lý các kết nối của quyền đó.</p>
        <dl className={s.accessPaths}><div><dt><DesktopIcon aria-hidden="true" />Màn hình</dt><dd>Quyền được sử dụng tại đâu</dd></div><div><dt><LockClosedIcon aria-hidden="true" />Vai trò</dt><dd>Nhóm vai trò được cấp quyền</dd></div><div><dt><PersonIcon aria-hidden="true" />Người dùng</dt><dd>Cấp quyền cho từng người cụ thể</dd></div></dl>
      </div> : <>
        <div className={s.contextBar}>
          <button type="button" className={s.backToCatalog} onClick={() => setCatalogOpen(true)}><ArrowLeftIcon aria-hidden="true" />Thư viện quyền</button>
          <div className={s.contextIdentity}>
            <div className={s.contextMeta}>{current && <span>{current.module}</span>}<code>{creating ? "Quyền mới" : current?.code ?? "Đang mở quyền…"}</code></div>
            <h2>{creating ? "Thiết lập quyền mới" : current?.name ?? "Đang tải thông tin"}</h2>
            <p>{creating ? "Tạo quyền trước, thiết lập các kết nối sau." : current?.description || "Quản lý thông tin và các đối tượng được cấp quyền."}</p>
          </div>
          {!creating && current && <div className={s.contextFlags}><span>{current.isActive ? <CheckIcon aria-hidden="true" /> : <SymbolIcon aria-hidden="true" />}{current.isActive ? "Đang hoạt động" : "Tạm dừng"}</span><span><LockClosedIcon aria-hidden="true" />{current.isPublic ? "Công khai" : "Không công khai"}</span></div>}
          {!creating && <button type="button" className={s.contextClose} disabled={Boolean(busy)} aria-label="Bỏ chọn quyền" onClick={() => guard(() => { setCatalogOpen(true); updateQuery({ permission: null, tab: null, search: null, userPage: null }); })}><Cross2Icon /></button>}
        </div>
        <div className={s.tabViewport}>
          <div className={s.tabs} role="tablist" aria-label="Các mục quản lý quyền" onKeyDown={event => {
            const index = tabRefs.current.findIndex(button => button === document.activeElement);
            const available = creating ? 1 : tabs.length;
            const next = event.key === "ArrowRight" ? (index + 1) % available : event.key === "ArrowLeft" ? (index - 1 + available) % available : event.key === "Home" ? 0 : event.key === "End" ? available - 1 : -1;
            if (next >= 0) { event.preventDefault(); tabRefs.current[next]?.focus(); }
          }}>
            <span className={s.tabMarker} aria-hidden="true" style={{ transform: `translateX(${Math.max(0, tabs.findIndex(item => item.id === tab)) * 100}%)` }} />
            {tabs.map((item, index) => <button key={item.id} ref={element => { tabRefs.current[index] = element; }} type="button" role="tab" id={`permission-tab-${item.id}`} aria-controls="permission-panel" aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} disabled={Boolean(busy) || (creating && item.id !== "detail")} onClick={() => guard(() => updateQuery({ tab: item.id === "detail" ? null : item.id, search: null, userPage: null }))}>
              <span className={s.tabIcon}><item.icon aria-hidden="true" /></span><span className={s.tabLabel}>{item.label}</span>{item.id !== "detail" && !creating && <span className={s.tabCount} title="Số đối tượng đã được cấp quyền">{counts[item.id]?.toLocaleString("vi-VN") ?? "…"}</span>}
            </button>)}
          </div>
        </div>
        <div id="permission-panel" role="tabpanel" aria-labelledby={`permission-tab-${tab}`} className={s.panel} tabIndex={0} aria-busy={detailLoading || assignmentLoading}>
          {detailLoading && !creating ? <Loading /> : detailError && !creating ? <Empty error title="Chưa mở được quyền này" text={detailError} onRetry={() => setDetailRevision(value => value + 1)} /> : tab === "detail" && (current || creating) ? <form onSubmit={save} className={s.editor}>
            <div className={s.editorIntro}><h3>{creating ? "Tạo quyền truy cập" : "Thông tin quyền"}</h3><p>{creating ? "Đặt mã rõ nghĩa để nhận diện quyền trong hệ thống." : "Thông tin mô tả và trạng thái áp dụng của quyền."}</p></div>
            <fieldset disabled={Boolean(busy)} className={s.fields}>
              <label>Mã quyền<input name="Code" value={draft.code} onChange={event => setDraft(value => ({ ...value, code: event.target.value }))} required readOnly={!creating} placeholder="Ví dụ: ADMIN_USER_EDIT" autoComplete="off" /><small>{creating ? "Mã dùng để định danh quyền." : "Mã quyền không thể thay đổi."}</small></label>
              <label>Module<input name="Module" value={draft.module} onChange={event => setDraft(value => ({ ...value, module: event.target.value }))} required placeholder="Ví dụ: Admin" autoComplete="off" /></label>
              <label className={s.fullField}>Diễn giải<input name="Name" value={draft.name} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} required placeholder="Quyền này cho phép làm gì?" autoComplete="off" /></label>
              <label className={s.fullField}>Mô tả<textarea name="Description" value={draft.description} onChange={event => setDraft(value => ({ ...value, description: event.target.value }))} rows={3} placeholder="Bổ sung phạm vi hoặc ghi chú cho quyền…" /></label>
              <div className={s.switches}>
                <Switch label="Trạng thái hoạt động" description="Cho phép áp dụng quyền trong hệ thống." checked={draft.isActive} onChange={checked => setDraft(value => ({ ...value, isActive: checked }))} name="IsActive" />
                <Switch label="Trạng thái công khai" description="Đánh dấu quyền công khai theo quy tắc của hệ thống." checked={draft.isPublic} onChange={checked => setDraft(value => ({ ...value, isPublic: checked }))} name="IsPublic" />
              </div>
            </fieldset>
            <div className={s.editorFooter}>
              {!creating && <button type="button" className={s.danger} disabled={Boolean(busy) || pendingAssignments.size > 0} onClick={() => setConfirmation({ type: "delete" })}><TrashIcon aria-hidden="true" />Xóa quyền</button>}
              <span className={s.unsaved}>{dirty ? "Có thay đổi chưa lưu" : creating ? "Hoàn tất thông tin để tạo quyền" : "Thông tin đã được tải từ hệ thống"}</span>
              <button type="button" className={s.secondary} disabled={Boolean(busy)} onClick={() => guard(() => { if (creating) setCreating(false); else if (current) setDraft({ ...current }); })}>{creating ? "Hủy tạo mới" : "Hủy thay đổi"}</button>
              <button type="submit" className={s.primary} disabled={Boolean(busy) || (!creating && !dirty)}>{busy === "save" ? <><ReloadIcon className={s.spin} aria-hidden="true" />Đang lưu…</> : <><CheckIcon aria-hidden="true" />{creating ? "Tạo quyền" : "Lưu thay đổi"}</>}</button>
            </div>
          </form> : current && tab !== "detail" ? <>
            <div className={s.assignmentToolbar}><div><h3>{tab === "menus" ? "Màn hình được truy cập" : tab === "roles" ? "Vai trò được cấp quyền" : "Người dùng được cấp quyền"}</h3><p>Tick để gán, bỏ tick để thu hồi. Thay đổi được lưu ngay.</p></div>
              <form className={s.search} role="search" onSubmit={event => { event.preventDefault(); updateQuery({ search: tabSearch.trim(), userPage: null }); }}><MagnifyingGlassIcon aria-hidden="true" /><input aria-label={`Tìm ${tabs.find(item => item.id === tab)?.label.toLowerCase()}`} name="search" placeholder="Tìm trong danh sách…" value={tabSearch} onChange={event => setTabSearch(event.target.value)} disabled={Boolean(busy)} autoComplete="off" />{tabSearch && <button type="button" disabled={Boolean(busy)} aria-label="Xóa tìm kiếm đối tượng" onClick={() => { setTabSearch(""); updateQuery({ search: null, userPage: null }); }}><Cross2Icon /></button>}<button type="submit" disabled={Boolean(busy)} aria-label="Tìm đối tượng"><ArrowRightIcon /></button></form>
            </div>
            {assignmentError ? <Empty error title="Chưa tải được đối tượng phân quyền" text={assignmentError} onRetry={() => { assignmentRequests.current.delete(assignmentKey); setAssignmentRevision(value => value + 1); }} /> : !assignmentData ? <Loading /> : !assignmentData.items.length ? <Empty title="Chưa có đối tượng phù hợp" text={search ? "Thử tên hoặc mã khác để tìm đối tượng cần phân quyền." : "Danh sách hiện chưa có dữ liệu để gán quyền."} /> : <div className={s.assignmentList} data-kind={tab}>
              <div className={s.assignmentHead}><span>{(tab === "users" ? assignmentData.total : assignmentData.items.length).toLocaleString("vi-VN")} {tab === "users" ? "người dùng" : tab === "roles" ? "vai trò" : "màn hình"}</span><span>Thay đổi được lưu ngay</span></div>
              {assignmentData.items.map(target => {
                const name = assignmentLabel(target);
                const info = "userName" in target ? [target.systemCode, target.email].filter(Boolean).join(" / ") : "";
                const pending = pendingAssignments.has(JSON.stringify([selectedId, tab, target.id]));
                return <label key={target.id} className={s.assignmentRow} data-assigned={target.isAssigned} data-busy={pending} aria-busy={pending}>
                <span className={s.targetIcon} aria-hidden="true">{tab === "menus" ? <DesktopIcon /> : tab === "roles" ? <LockClosedIcon /> : <PersonIcon />}</span>
                <span className={s.targetInfo}><strong>{name}</strong>{info && <span>{info}</span>}</span>
                <span className={s.assignmentState} aria-hidden="true">{pending ? "Đang lưu…" : target.isAssigned ? "Đã cấp quyền" : "Chưa gán"}</span>
                <span className={s.checkControl}><input type="checkbox" aria-label={`${target.isAssigned ? "Bỏ gán" : "Gán"} quyền ${current.code} cho ${name}`} checked={target.isAssigned} disabled={Boolean(busy) || pending || assignmentLoading} onChange={() => toggle(target)} /><span aria-hidden="true">{pending ? <ReloadIcon className={s.spin} /> : target.isAssigned ? <CheckIcon /> : null}</span></span>
              </label>;
              })}
            </div>}
            {tab === "users" && <Pagination page={userPage} pageSize={userSize} total={assignmentData?.total ?? null} loading={assignmentLoading} error={Boolean(assignmentError)} disabled={Boolean(busy)} itemLabel="người dùng" onPageChange={value => updateQuery({ userPage: value })} onPageSizeChange={value => updateQuery({ userSize: value, userPage: null })} />}
          </> : null}
        </div>
      </>}
    </section>
    </div>
    {confirmation && <dialog ref={confirmationRef} className={s.confirmation} aria-labelledby="permission-confirm-title" onCancel={event => { if (busy) event.preventDefault(); else setConfirmation(null); }}>
      <div className={s.confirmContent}><span className={s.confirmIcon} aria-hidden="true">{confirmation.type === "delete" ? <TrashIcon /> : <InfoCircledIcon />}</span><h2 id="permission-confirm-title">{confirmation.type === "delete" ? "Xóa quyền này?" : "Bỏ thay đổi chưa lưu?"}</h2><p>{confirmation.type === "delete" ? "Quyền và các liên kết phân quyền có thể bị ảnh hưởng. Thao tác không thể hoàn tác tại màn hình này." : "Các nội dung bạn vừa chỉnh sửa sẽ không được lưu. Những lần tick/untick đã lưu không bị hoàn tác."}</p>{current && <code>{current.code}</code>}{confirmation.error && <p role="alert" className={s.errorText}>{confirmation.error}</p>}</div>
      <div className={s.confirmFooter}><button type="button" className={s.secondary} autoFocus disabled={Boolean(busy)} onClick={() => setConfirmation(null)}>Quay lại</button><button type="button" className={confirmation.type === "delete" ? s.dangerFill : s.primary} disabled={Boolean(busy)} onClick={() => { if (confirmation.type === "delete") void remove(); else { const action = confirmation.run; setConfirmation(null); setDraft(current ? { ...current } : { ...blank }); action(); } }}>{busy === "delete" ? "Đang xóa…" : confirmation.type === "delete" ? "Xóa quyền" : "Bỏ thay đổi"}</button></div>
    </dialog>}
  </div>;
}

function Switch({ label, description, checked, onChange, name }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; name: string }) {
  return <label className={s.switch}><span><strong>{label}</strong><small>{description}</small></span><span className={s.switchControl}><input type="checkbox" role="switch" name={name} checked={checked} onChange={event => onChange(event.target.checked)} /><span aria-hidden="true"><CheckIcon /></span></span></label>;
}
function Empty({ title, text, error = false, onRetry }: { title: string; text: string; error?: boolean; onRetry?: () => void }) {
  return <div className={s.empty} role={error ? "alert" : undefined}>{error ? <InfoCircledIcon aria-hidden="true" /> : <MagnifyingGlassIcon aria-hidden="true" />}<h3>{title}</h3><p>{text}</p>{onRetry && <button type="button" className={s.secondary} onClick={onRetry}><ReloadIcon aria-hidden="true" />Thử lại</button>}</div>;
}
function Loading() {
  return <div className={s.loading} role="status"><span className={s.srOnly}>Đang tải dữ liệu quyền…</span>{[0, 1, 2].map(row => <div className={s.skeleton} key={row} aria-hidden="true"><i /><i /></div>)}</div>;
}
