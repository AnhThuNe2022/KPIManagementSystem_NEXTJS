"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  ActiveStatus,
  AppButton,
  AppEmptyState,
  AppForm,
  AppPagination,
  AppSwitch,
  AppTextArea,
  AppTextInput,
  ConfirmDialog,
  InlineErrorBanner,
  LoadingOverlay,
  PageFrame,
  PageHeader,
  PublicStatusBadge,
  StatusFilterTabs,
  UserIdentityCell,
  useAppToast,
} from "@/components/ds";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { permissionApi } from "../services/permissionApi";
import type {
  PermissionAssignmentItem,
  PermissionAssignmentTab,
  PermissionDraft,
  PermissionDto,
  PermissionInspectorTab,
} from "../types";

const EMPTY_DRAFT: PermissionDraft = {
  code: "",
  name: "",
  module: "",
  description: "",
  isActive: true,
  isPublic: false,
};

type AssignFilterMode = "all" | "assigned" | "unassigned";

const INSPECTOR_TABS = [
  { id: "detail", label: "Chi tiết", icon: KeyRound },
  { id: "menus", label: "Màn hình", icon: Monitor },
  { id: "roles", label: "Vai trò", icon: Shield },
  { id: "users", label: "Người dùng", icon: Users },
] as const;

function dtoToDraft(item: PermissionDto): PermissionDraft {
  return {
    code: item.code ?? "",
    name: item.name ?? "",
    module: item.module ?? "",
    description: item.description ?? "",
    isActive: Boolean(item.isActive),
    isPublic: Boolean(item.isPublic),
  };
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseTab(raw: string | null): PermissionInspectorTab {
  if (raw === "menus" || raw === "roles" || raw === "users") return raw;
  return "detail";
}

function sortAssignedFirst(items: PermissionAssignmentItem[]): PermissionAssignmentItem[] {
  return [...items].sort((a, b) => Number(b.isAssigned) - Number(a.isAssigned));
}

export function PermissionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showToast = useAppToast();

  // Trạng thái đồng bộ URL
  const selectedParam = searchParams.get("permission") ?? "";
  const isCreating = selectedParam === "new";
  const activeTab = parseTab(searchParams.get("tab"));
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(searchParams.get("size"), 15);
  const queryKeyword = searchParams.get("q") ?? "";
  const assignSearchParam = searchParams.get("search") ?? "";
  const userPage = parsePositiveInt(searchParams.get("userPage"), 1);
  const userSize = parsePositiveInt(searchParams.get("userSize"), 15);

  const [catalogSearchInput, setCatalogSearchInput] = useState(queryKeyword);
  const [assignSearchInput, setAssignSearchInput] = useState(assignSearchParam);
  const [assignFilter, setAssignFilter] = useState<AssignFilterMode>("all");
  const [mobileShowCatalog, setMobileShowCatalog] = useState(!selectedParam);
  const [reloadTick, setReloadTick] = useState(0);

  // Danh mục quyền (cột trái)
  const [catalogItems, setCatalogItems] = useState<PermissionDto[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogUnauthorized, setCatalogUnauthorized] = useState(false);

  // Chi tiết quyền (cột phải)
  const [selectedDetail, setSelectedDetail] = useState<PermissionDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionDraft>(EMPTY_DRAFT);
  const [initialDraft, setInitialDraft] = useState<PermissionDraft>(EMPTY_DRAFT);
  const [formErrors, setFormErrors] = useState<{ code?: string; name?: string; module?: string }>({});
  const [saveServerError, setSaveServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Danh sách đối tượng gán quyền (Màn hình / Vai trò / Người dùng)
  const [assignItems, setAssignItems] = useState<PermissionAssignmentItem[]>([]);
  const [assignTotal, setAssignTotal] = useState(0);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [busyTargets, setBusyTargets] = useState<Set<string>>(() => new Set());

  // Hộp thoại xác nhận
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const catalogCtrlRef = useRef<AbortController | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const updateUrlParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Đồng bộ ô tìm kiếm khi URL đổi
  useEffect(() => setCatalogSearchInput(queryKeyword), [queryKeyword]);
  useEffect(() => setAssignSearchInput(assignSearchParam), [assignSearchParam]);
  useEffect(() => {
    setAssignFilter("all");
  }, [activeTab, selectedParam]);
  useEffect(() => {
    if (selectedParam) setMobileShowCatalog(false);
  }, [selectedParam]);

  // Debounce tìm kiếm danh mục quyền -> URL `q`
  useEffect(() => {
    const trimmed = catalogSearchInput.trim();
    if (trimmed === queryKeyword) return;
    const timer = window.setTimeout(() => {
      updateUrlParams({ q: trimmed || null, page: "1" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [catalogSearchInput, queryKeyword, updateUrlParams]);

  // Debounce tìm kiếm đối tượng gán quyền -> URL `search`
  useEffect(() => {
    const trimmed = assignSearchInput.trim();
    if (trimmed === assignSearchParam) return;
    const timer = window.setTimeout(() => {
      updateUrlParams({ search: trimmed || null, userPage: "1" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [assignSearchInput, assignSearchParam, updateUrlParams]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialDraft),
    [draft, initialDraft],
  );

  const guardDirty = (action: () => void) => {
    if (isDirty) {
      setPendingNav(() => action);
      return;
    }
    action();
  };

  // Tải thư viện quyền
  useEffect(() => {
    catalogCtrlRef.current?.abort();
    const ctrl = new AbortController();
    catalogCtrlRef.current = ctrl;
    setCatalogLoading(true);
    setCatalogError(null);
    setCatalogUnauthorized(false);

    permissionApi
      .list(page, pageSize, queryKeyword, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setCatalogItems(res.items);
        setCatalogTotal(res.total);
      })
      .catch((err) => {
        if (isAbortError(err) || ctrl.signal.aborted) return;
        setCatalogError(getErrorMessage(err, "Không thể tải danh mục quyền."));
        setCatalogUnauthorized(err instanceof ApiRequestError && err.status === 401);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCatalogLoading(false);
      });

    return () => ctrl.abort();
  }, [page, pageSize, queryKeyword, reloadTick]);

  // Tải chi tiết quyền đang chọn
  useEffect(() => {
    setSaveServerError(null);
    setFormErrors({});
    if (isCreating) {
      setSelectedDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      setDraft(EMPTY_DRAFT);
      setInitialDraft(EMPTY_DRAFT);
      return;
    }
    if (!selectedParam) {
      setSelectedDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setDetailLoading(true);
    setDetailError(null);

    permissionApi
      .detail(selectedParam, ctrl.signal)
      .then((detail) => {
        if (ctrl.signal.aborted) return;
        setSelectedDetail(detail);
        const next = dtoToDraft(detail);
        setDraft(next);
        setInitialDraft(next);
      })
      .catch((err) => {
        if (isAbortError(err) || ctrl.signal.aborted) return;
        setDetailError(getErrorMessage(err, "Không thể tải chi tiết quyền."));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setDetailLoading(false);
      });

    return () => ctrl.abort();
  }, [isCreating, reloadTick, selectedParam]);

  // Tải danh sách gán quyền cho Màn hình / Vai trò / Người dùng
  useEffect(() => {
    if (!selectedParam || isCreating || activeTab === "detail") return;
    const ctrl = new AbortController();
    setAssignLoading(true);
    setAssignError(null);

    permissionApi
      .assignments(
        selectedParam,
        activeTab,
        assignSearchParam,
        userPage,
        userSize,
        ctrl.signal,
      )
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setAssignItems(res.items);
        setAssignTotal(res.total);
      })
      .catch((err) => {
        if (isAbortError(err) || ctrl.signal.aborted) return;
        setAssignError(getErrorMessage(err, "Không thể tải danh sách gán quyền."));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setAssignLoading(false);
      });

    return () => ctrl.abort();
  }, [activeTab, assignSearchParam, isCreating, reloadTick, selectedParam, userPage, userSize]);

  // Nhóm danh mục quyền theo phân hệ (Module)
  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, PermissionDto[]>();
    for (const item of catalogItems) {
      const mod = item.module?.trim() || "Chung";
      const list = groups.get(mod) ?? [];
      list.push(item);
      groups.set(mod, list);
    }
    return Array.from(groups.entries());
  }, [catalogItems]);

  // Bộ lọc nhanh Tât cả / Đã gán / Chưa gán cho tab Màn hình & Vai trò (không tốn API)
  const assignCounts = useMemo(() => {
    let assigned = 0;
    for (const item of assignItems) {
      if (item.isAssigned) assigned++;
    }
    return {
      all: assignItems.length,
      assigned,
      unassigned: assignItems.length - assigned,
    };
  }, [assignItems]);

  const visibleAssignItems = useMemo(() => {
    if (activeTab === "users" || assignFilter === "all") return assignItems;
    if (assignFilter === "assigned") return assignItems.filter((item) => item.isAssigned);
    return assignItems.filter((item) => !item.isAssigned);
  }, [activeTab, assignFilter, assignItems]);

  const totalCatalogPages = Math.max(1, Math.ceil(catalogTotal / pageSize));
  const activeTabIndex = isCreating
    ? 0
    : Math.max(0, INSPECTOR_TABS.findIndex((t) => t.id === activeTab));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveServerError(null);
    const nextErrors: { code?: string; name?: string; module?: string } = {};
    if (!selectedDetail && !draft.code.trim()) nextErrors.code = "Vui lòng nhập mã quyền.";
    if (!draft.name.trim()) nextErrors.name = "Vui lòng nhập tên quyền.";
    if (!draft.module.trim()) nextErrors.module = "Vui lòng nhập tên phân hệ (module).";
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      const saved = await permissionApi.save(
        draft,
        selectedDetail ? String(selectedDetail.id) : undefined,
      );
      showToast(
        "success",
        selectedDetail ? "Đã cập nhật quyền thành công." : "Đã tạo quyền mới thành công.",
      );
      setInitialDraft({ ...draft });
      if (!selectedDetail && saved && typeof saved === "object" && "id" in saved && saved.id) {
        updateUrlParams({ permission: String(saved.id), tab: "detail" });
      }
      setReloadTick((t) => t + 1);
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể lưu thông tin quyền.");
      setSaveServerError(msg);
      showToast("error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDetail) return;
    setIsDeleting(true);
    try {
      await permissionApi.remove(selectedDetail.id);
      showToast("success", `Đã xóa quyền "${selectedDetail.name}".`);
      setDeleteDialogOpen(false);
      setInitialDraft(EMPTY_DRAFT);
      setDraft(EMPTY_DRAFT);
      setMobileShowCatalog(true);
      updateUrlParams({ permission: null, tab: null, search: null });
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể xóa quyền."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleAssignment = async (
    tab: PermissionAssignmentTab,
    item: PermissionAssignmentItem,
    nextChecked: boolean,
  ) => {
    if (!selectedParam) return;
    const lockKey = `${tab}:${item.id}`;
    if (busyTargets.has(lockKey)) return;

    setBusyTargets((prev) => new Set([...prev, lockKey]));
    try {
      await permissionApi.assign(selectedParam, tab, item.id, nextChecked);
      setAssignItems((prev) => {
        const mapped = prev.map((row) =>
          String(row.id) === String(item.id) ? { ...row, isAssigned: nextChecked } : row,
        );
        return tab === "users" ? sortAssignedFirst(mapped) : mapped;
      });
      const delta = nextChecked ? 1 : -1;
      const countField =
        tab === "menus" ? "menuCount" : tab === "roles" ? "roleCount" : "userCount";
      setSelectedDetail((prev) =>
        prev ? { ...prev, [countField]: Math.max(0, (prev[countField] ?? 0) + delta) } : prev,
      );
      setCatalogItems((prev) =>
        prev.map((perm) =>
          String(perm.id) === selectedParam
            ? { ...perm, [countField]: Math.max(0, (perm[countField] ?? 0) + delta) }
            : perm,
        ),
      );
      const targetName = item.userName || item.name || String(item.id);
      showToast(
        "success",
        nextChecked
          ? `Đã cấp quyền cho ${targetName}.`
          : `Đã thu hồi quyền của ${targetName}.`,
      );
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể thay đổi trạng thái gán quyền."));
    } finally {
      setBusyTargets((prev) => {
        const next = new Set(prev);
        next.delete(lockKey);
        return next;
      });
    }
  };

  const selectPermission = (id: number) => {
    guardDirty(() => {
      setMobileShowCatalog(false);
      updateUrlParams({ permission: String(id), search: null, userPage: "1" });
    });
  };

  const startCreateNew = () => {
    guardDirty(() => {
      setMobileShowCatalog(false);
      updateUrlParams({ permission: "new", tab: "detail", search: null });
    });
  };

  const clearSelection = () => {
    guardDirty(() => {
      setMobileShowCatalog(true);
      updateUrlParams({ permission: null, tab: null, search: null, userPage: null });
    });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = tabRefs.current.findIndex((el) => el === document.activeElement);
    const available = isCreating ? 1 : INSPECTOR_TABS.length;
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % available;
    else if (e.key === "ArrowLeft") next = (idx - 1 + available) % available;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = available - 1;
    if (next >= 0) {
      e.preventDefault();
      tabRefs.current[next]?.focus();
    }
  };

  const getTabCount = (tabId: PermissionInspectorTab): number | undefined => {
    if (!selectedDetail || isCreating) return undefined;
    if (tabId === "menus") return selectedDetail.menuCount;
    if (tabId === "roles") return selectedDetail.roleCount;
    if (tabId === "users") return selectedDetail.userCount;
    return undefined;
  };

  const mobileView = !selectedParam || mobileShowCatalog ? "catalog" : "detail";

  return (
    <PageFrame>
      <PageHeader
        artwork="admin"
        icon={<Shield className="h-5 w-5" />}
        eyebrow="Quản trị hệ thống"
        title="Quản lý phân quyền (RBAC)"
        description="Quản lý danh mục quyền theo phân hệ và gán quyền trực tiếp cho Màn hình, Vai trò và Người dùng."
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setReloadTick((t) => t + 1)}
            />
            <AppButton
              label="Tạo quyền mới"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={startCreateNew}
            />
          </>
        }
      />

      <div className="ds-perm-workbench" data-mobile-view={mobileView}>
        {/* CỘT TRÁI: THƯ VIỆN QUYỀN THEO PHÂN HỆ */}
        <section className="ds-perm-library" aria-labelledby="perm-library-heading">
          <div className="ds-perm-libHead">
            <div className="flex items-center gap-2">
              <h2 id="perm-library-heading" className="text-[15px] font-bold text-primary">
                Thư viện quyền
              </h2>
              {!catalogLoading && !catalogError ? (
                <span className="ds-count-pill">
                  {catalogTotal.toLocaleString("vi-VN")}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="ds-perm-pageBtn"
              aria-label="Tải lại thư viện quyền"
              title="Tải lại thư viện quyền"
              disabled={catalogLoading}
              onClick={() => setReloadTick((t) => t + 1)}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${catalogLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="ds-perm-libSearch">
            <AppTextInput
              label="Tìm kiếm quyền"
              isLabelHidden
              size="sm"
              value={catalogSearchInput}
              onChange={setCatalogSearchInput}
              placeholder="Tìm mã quyền, tên hoặc phân hệ..."
              startIcon="search"
              hasClear
            />
          </div>

          <div className="ds-perm-catalog" aria-busy={catalogLoading}>
            {catalogError ? (
              <div className="p-2">
                <InlineErrorBanner
                  message={catalogError}
                  isUnauthorized={catalogUnauthorized}
                  loginNextPath="/admin/permission"
                  onRetry={() => setReloadTick((t) => t + 1)}
                />
              </div>
            ) : catalogLoading ? (
              <LoadingOverlay label="Đang tải thư viện quyền..." />
            ) : catalogItems.length === 0 ? (
              <AppEmptyState
                title="Chưa có quyền nào"
                description="Thử từ khóa khác hoặc tạo quyền mới."
                isCompact
              />
            ) : (
              groupedCatalog.map(([moduleName, perms]) => (
                <div key={moduleName}>
                  <h3 className="ds-perm-moduleHead">
                    <span>
                      {moduleName} · {perms.length}
                    </span>
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {perms.map((perm) => {
                      const isSelected = !isCreating && String(perm.id) === selectedParam;
                      return (
                        <li key={perm.id}>
                          <button
                            type="button"
                            onClick={() => selectPermission(perm.id)}
                            aria-current={isSelected ? "true" : undefined}
                            className="ds-perm-item"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13.5px] font-semibold leading-snug">
                                {perm.name}
                              </div>
                              <div className="ds-perm-itemCode truncate">{perm.code}</div>
                              <div className="ds-perm-itemMeta">
                                <span>Màn hình: {perm.menuCount ?? 0}</span>
                                <span>·</span>
                                <span>Vai trò: {perm.roleCount ?? 0}</span>
                                <span>·</span>
                                <span>User: {perm.userCount ?? 0}</span>
                              </div>
                            </div>
                            <span
                              className="ds-perm-itemDot"
                              data-active={String(Boolean(perm.isActive))}
                              title={perm.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                            />
                            <ChevronRight
                              className="ds-perm-itemArrow h-4 w-4 shrink-0 text-secondary"
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          <footer className="ds-perm-libFooter">
            <label className="mr-auto flex items-center gap-1.5">
              <span>Hiển thị</span>
              <select
                aria-label="Số quyền mỗi trang"
                className="ds-perm-pageSelect"
                value={pageSize}
                disabled={catalogLoading}
                onChange={(e) => updateUrlParams({ size: e.target.value, page: "1" })}
              >
                {[10, 15, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="min-w-[44px] text-center font-semibold tabular-nums text-primary">
              {catalogLoading ? "…" : `${page} / ${totalCatalogPages}`}
            </span>
            <button
              type="button"
              className="ds-perm-pageBtn"
              aria-label="Trang trước"
              disabled={catalogLoading || page <= 1}
              onClick={() => updateUrlParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="ds-perm-pageBtn"
              aria-label="Trang sau"
              disabled={catalogLoading || page >= totalCatalogPages}
              onClick={() => updateUrlParams({ page: String(page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        </section>

        {/* CỘT PHẢI: CHI TIẾT & PHÂN BỔ QUYỀN */}
        <section className="ds-perm-inspector" aria-label="Chi tiết và phân quyền">
          {!selectedParam ? (
            <div className="ds-perm-welcome ds-fade-in">
              <span className="ds-perm-welcomeIcon" aria-hidden="true">
                <Shield className="h-6 w-6" />
              </span>
              <h2 className="text-[28px] font-extrabold leading-[1.2] tracking-[-0.03em] text-primary sm:text-[32px]">
                Quyền rõ ràng.
                <br />
                Kết nối đúng người.
              </h2>
              <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-secondary">
                Chọn một quyền ở thư viện bên trái để chỉnh sửa thông tin định danh và cấp quyền
                trực tiếp cho từng màn hình, nhóm vai trò hoặc nhân sự cụ thể.
              </p>

              <dl className="ds-perm-welcomePaths">
                <div className="ds-perm-welcomePath">
                  <dt className="flex items-center gap-2 text-sm font-bold text-accent">
                    <Monitor className="h-4 w-4" aria-hidden="true" />
                    Màn hình
                  </dt>
                  <dd className="text-sm text-secondary">
                    Quy định các trang / menu được phép hiển thị và truy cập.
                  </dd>
                </div>
                <div className="ds-perm-welcomePath">
                  <dt className="flex items-center gap-2 text-sm font-bold text-accent">
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    Vai trò
                  </dt>
                  <dd className="text-sm text-secondary">
                    Cấp quyền hàng loạt theo nhóm chức năng của hệ thống.
                  </dd>
                </div>
                <div className="ds-perm-welcomePath">
                  <dt className="flex items-center gap-2 text-sm font-bold text-accent">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    Người dùng
                  </dt>
                  <dd className="text-sm text-secondary">
                    Cấp bổ sung hoặc thu hồi quyền cho từng cá nhân cụ thể.
                  </dd>
                </div>
              </dl>

              <AppButton
                label="Tạo quyền mới"
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={startCreateNew}
              />
            </div>
          ) : (
            <>
              {/* Phần đầu ngữ cảnh quyền đang mở */}
              <div className="ds-perm-context">
                <div className="ds-perm-backBtn">
                  <AppButton
                    label="Thư viện quyền"
                    variant="secondary"
                    size="sm"
                    icon={<ArrowLeft className="h-3.5 w-3.5" />}
                    onClick={() => setMobileShowCatalog(true)}
                  />
                </div>

                {!isCreating ? (
                  <button
                    type="button"
                    className="ds-perm-closeBtn"
                    aria-label="Bỏ chọn quyền"
                    title="Bỏ chọn quyền"
                    onClick={clearSelection}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 pr-10">
                  <span className="ds-perm-moduleBadge">
                    {isCreating ? "Tạo mới" : selectedDetail?.module || "Phân hệ"}
                  </span>
                  <span className="ds-perm-codeBadge">
                    {isCreating ? "NEW_PERMISSION" : selectedDetail?.code || `#${selectedParam}`}
                  </span>
                  {!isCreating && selectedDetail ? (
                    <div className="ml-auto flex items-center gap-2">
                      <PublicStatusBadge isPublic={selectedDetail.isPublic} />
                      <ActiveStatus isActive={selectedDetail.isActive} />
                    </div>
                  ) : null}
                </div>

                <h2 className="mt-2.5 pr-10 text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-primary">
                  {isCreating
                    ? "Thiết lập quyền mới"
                    : selectedDetail?.name || `Quyền #${selectedParam}`}
                </h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-secondary">
                  {isCreating
                    ? "Khai báo mã định danh và phân hệ trước, sau đó cấp quyền cho Màn hình, Vai trò và Người dùng."
                    : selectedDetail?.description?.trim() ||
                      "Quản lý thông tin mô tả và đối tượng được cấp quyền truy cập."}
                </p>
              </div>

              {/* Thanh 4 Tab chia đều kiểu Segmented trượt + vạch đỏ thương hiệu Đèo Cả */}
              <div className="ds-perm-tabSticky">
                <div
                  className="ds-perm-tabs"
                  role="tablist"
                  aria-label="Các mục quản lý quyền"
                  onKeyDown={handleTabKeyDown}
                >
                  <span
                    className="ds-perm-tabMarker"
                    aria-hidden="true"
                    style={{ transform: `translateX(${activeTabIndex * 100}%)` }}
                  />
                  {INSPECTOR_TABS.map((tabItem, index) => {
                    const Icon = tabItem.icon;
                    const selected = isCreating ? tabItem.id === "detail" : activeTab === tabItem.id;
                    const disabled = isCreating && tabItem.id !== "detail";
                    const count = getTabCount(tabItem.id);
                    return (
                      <button
                        key={tabItem.id}
                        ref={(el) => {
                          tabRefs.current[index] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        disabled={disabled}
                        className="ds-perm-tab"
                        onClick={() =>
                          guardDirty(() =>
                            updateUrlParams({
                              tab: tabItem.id === "detail" ? null : tabItem.id,
                              search: null,
                              userPage: "1",
                            }),
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{tabItem.label}</span>
                        {count !== undefined ? (
                          <span className="ds-perm-tabCount">
                            {count.toLocaleString("vi-VN")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nội dung theo từng Tab */}
              <div className="ds-perm-panelBody">
                {activeTab === "detail" || isCreating ? (
                  detailLoading ? (
                    <LoadingOverlay label="Đang tải chi tiết quyền..." />
                  ) : detailError ? (
                    <InlineErrorBanner
                      message={detailError}
                      onRetry={() => setReloadTick((t) => t + 1)}
                    />
                  ) : (
                    <form onSubmit={handleSave} className="ds-fade-in flex flex-col gap-4">
                      {saveServerError ? <InlineErrorBanner message={saveServerError} /> : null}

                      <div className="ds-form-section">
                        <div className="mb-3 flex items-center gap-2.5">
                          <span className="ds-section-icon">
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-primary">
                              {isCreating ? "Thông tin khởi tạo quyền" : "Thông tin định danh quyền"}
                            </h3>
                            <p className="text-xs text-secondary">
                              {isCreating
                                ? "Đặt mã rõ nghĩa theo quy ước để nhận diện quyền trong hệ thống."
                                : "Chỉnh sửa diễn giải, phân hệ hoặc mô tả phạm vi áp dụng."}
                            </p>
                          </div>
                        </div>

                        <AppForm>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <AppTextInput
                              label="Mã quyền (Code)"
                              value={draft.code}
                              onChange={(code) => {
                                setDraft((p) => ({ ...p, code }));
                                setFormErrors((e) => ({ ...e, code: undefined }));
                              }}
                              placeholder="VD: EVAL_VIEW"
                              isRequired
                              isReadOnly={!isCreating}
                              description={
                                !isCreating ? "Mã quyền cố định sau khi khởi tạo." : undefined
                              }
                              error={formErrors.code}
                            />
                            <AppTextInput
                              label="Phân hệ (Module)"
                              value={draft.module}
                              onChange={(module) => {
                                setDraft((p) => ({ ...p, module }));
                                setFormErrors((e) => ({ ...e, module: undefined }));
                              }}
                              placeholder="VD: Evaluation, Admin..."
                              isRequired
                              error={formErrors.module}
                            />
                          </div>

                          <AppTextInput
                            label="Diễn giải / Tên quyền"
                            value={draft.name}
                            onChange={(name) => {
                              setDraft((p) => ({ ...p, name }));
                              setFormErrors((e) => ({ ...e, name: undefined }));
                            }}
                            placeholder="VD: Xem danh sách đánh giá KPI"
                            isRequired
                            error={formErrors.name}
                          />

                          <AppTextArea
                            label="Mô tả phạm vi"
                            value={draft.description}
                            onChange={(description) => setDraft((p) => ({ ...p, description }))}
                            placeholder="Bổ sung phạm vi áp dụng hoặc ghi chú cho quyền..."
                            rows={3}
                          />
                        </AppForm>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="ds-status-card" data-active={String(draft.isActive)}>
                          <AppSwitch
                            label="Trạng thái hoạt động"
                            description="Cho phép hệ thống kiểm tra áp dụng quyền này"
                            value={draft.isActive}
                            onChange={(isActive) => setDraft((p) => ({ ...p, isActive }))}
                          />
                        </div>
                        <div className="ds-status-card" data-active={String(draft.isPublic)}>
                          <AppSwitch
                            label="Quyền công khai"
                            description="Mọi tài khoản đăng nhập đều mặc định có quyền"
                            value={draft.isPublic}
                            onChange={(isPublic) => setDraft((p) => ({ ...p, isPublic }))}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                        <div className="flex items-center gap-3">
                          {selectedDetail ? (
                            <AppButton
                              label="Xóa quyền"
                              variant="destructive"
                              size="sm"
                              icon={<Trash2 className="h-4 w-4" />}
                              isDisabled={isSaving}
                              onClick={() => setDeleteDialogOpen(true)}
                            />
                          ) : null}
                          <span className="text-xs text-secondary">
                            {isDirty
                              ? "Có thay đổi chưa lưu"
                              : isCreating
                                ? "Điền đủ thông tin để tạo mới"
                                : "Đã đồng bộ với hệ thống"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AppButton
                            label={isCreating ? "Hủy" : "Hoàn tác"}
                            variant="secondary"
                            size="sm"
                            icon={<RotateCcw className="h-4 w-4" />}
                            isDisabled={(!isCreating && !isDirty) || isSaving}
                            onClick={() => {
                              if (isCreating) {
                                clearSelection();
                                return;
                              }
                              setDraft({ ...initialDraft });
                              setFormErrors({});
                              setSaveServerError(null);
                            }}
                          />
                          <AppButton
                            type="submit"
                            label={isCreating ? "Tạo quyền" : "Lưu thay đổi"}
                            variant="primary"
                            size="sm"
                            icon={<Save className="h-4 w-4" />}
                            isLoading={isSaving}
                            isDisabled={isSaving || (!isCreating && !isDirty)}
                          />
                        </div>
                      </div>
                    </form>
                  )
                ) : (
                  <div className="ds-fade-in flex flex-col gap-3.5">
                    {/* Thanh tiêu đề + hướng dẫn lưu tức thì */}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="text-[15px] font-bold text-primary">
                          {activeTab === "menus"
                            ? "Màn hình được phép truy cập"
                            : activeTab === "roles"
                              ? "Vai trò được cấp quyền"
                              : "Người dùng được cấp quyền"}
                        </h3>
                        <p className="text-xs text-secondary">
                          Nhấp trực tiếp vào từng thẻ để cấp hoặc thu hồi quyền — thay đổi được lưu
                          ngay lập tức.
                        </p>
                      </div>

                      {activeTab !== "users" && !assignLoading ? (
                        <StatusFilterTabs
                          label="Lọc trạng thái gán quyền"
                          value={assignFilter}
                          onChange={(val) => setAssignFilter(val as AssignFilterMode)}
                          items={[
                            {
                              value: "all",
                              label: "Tất cả",
                              count: assignCounts.all,
                            },
                            {
                              value: "assigned",
                              label: "Đã gán",
                              count: assignCounts.assigned,
                              tone: "green",
                            },
                            {
                              value: "unassigned",
                              label: "Chưa gán",
                              count: assignCounts.unassigned,
                              tone: "neutral",
                            },
                          ]}
                        />
                      ) : null}
                    </div>

                    <AppTextInput
                      label="Tìm đối tượng gán quyền"
                      isLabelHidden
                      value={assignSearchInput}
                      onChange={setAssignSearchInput}
                      placeholder={
                        activeTab === "menus"
                          ? "Tìm theo tên màn hình / menu..."
                          : activeTab === "roles"
                            ? "Tìm theo tên vai trò..."
                            : "Tìm theo tên, mã nhân viên, email..."
                      }
                      startIcon="search"
                      hasClear
                    />

                    {assignError ? (
                      <InlineErrorBanner
                        message={assignError}
                        onRetry={() => setReloadTick((t) => t + 1)}
                      />
                    ) : assignLoading ? (
                      <LoadingOverlay label="Đang tải danh sách phân quyền..." />
                    ) : visibleAssignItems.length === 0 ? (
                      <AppEmptyState
                        title="Không có đối tượng phù hợp"
                        description={
                          assignSearchInput.trim() || assignFilter !== "all"
                            ? "Thử đổi từ khóa hoặc chọn lại bộ lọc Tất cả."
                            : "Danh sách hiện chưa có dữ liệu để gán quyền."
                        }
                        isCompact
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between border-b border-border pb-2 text-xs text-secondary">
                          <span>
                            {activeTab === "users" ? (
                              <>
                                Tổng{" "}
                                <strong className="font-semibold text-primary">
                                  {assignTotal.toLocaleString("vi-VN")}
                                </strong>{" "}
                                người dùng
                                {selectedDetail ? (
                                  <>
                                    {" "}
                                    · Đã cấp:{" "}
                                    <strong className="font-semibold text-accent">
                                      {(selectedDetail.userCount ?? 0).toLocaleString("vi-VN")}
                                    </strong>
                                  </>
                                ) : null}
                              </>
                            ) : (
                              <>
                                Hiển thị{" "}
                                <strong className="font-semibold text-primary">
                                  {visibleAssignItems.length}
                                </strong>{" "}
                                {activeTab === "roles" ? "vai trò" : "màn hình"} · Đã cấp:{" "}
                                <strong className="font-semibold text-accent">
                                  {assignCounts.assigned}
                                </strong>
                              </>
                            )}
                          </span>
                          <span>Tự động lưu</span>
                        </div>

                        <div className="ds-perm-assignGrid" data-kind={activeTab}>
                          {visibleAssignItems.map((item) => {
                            const lockKey = `${activeTab}:${item.id}`;
                            const isBusy = busyTargets.has(lockKey);
                            const label = item.userName || item.name || String(item.id);
                            return (
                              <button
                                key={String(item.id)}
                                type="button"
                                role="checkbox"
                                aria-checked={item.isAssigned}
                                aria-busy={isBusy}
                                disabled={isBusy}
                                data-assigned={String(item.isAssigned)}
                                data-busy={String(isBusy)}
                                className="ds-perm-tile"
                                onClick={() =>
                                  void handleToggleAssignment(activeTab, item, !item.isAssigned)
                                }
                              >
                                {activeTab === "users" ? (
                                  <div className="min-w-0 flex-1">
                                    <UserIdentityCell
                                      name={label}
                                      subtitle={
                                        [item.systemCode, item.email]
                                          .filter(Boolean)
                                          .join(" · ") || undefined
                                      }
                                      size="xsm"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <span className="ds-perm-tileIcon" aria-hidden="true">
                                      {activeTab === "menus" ? (
                                        <Monitor className="h-4 w-4" />
                                      ) : (
                                        <Shield className="h-4 w-4" />
                                      )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-[13.5px] font-semibold leading-snug text-primary">
                                        {label}
                                      </div>
                                      <div className="mt-0.5 text-[11.5px] text-secondary">
                                        {isBusy
                                          ? "Đang lưu..."
                                          : item.isAssigned
                                            ? "Đã cấp quyền"
                                            : "Chưa gán"}
                                      </div>
                                    </div>
                                  </>
                                )}

                                {activeTab === "users" ? (
                                  <span className="ds-perm-stateTag">
                                    {isBusy
                                      ? "Đang lưu..."
                                      : item.isAssigned
                                        ? "Đã cấp quyền"
                                        : "Chưa gán"}
                                  </span>
                                ) : null}

                                <span className="ds-perm-check" aria-hidden="true">
                                  {isBusy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : item.isAssigned ? (
                                    <Check className="h-3.5 w-3.5 stroke-[2.6]" />
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {activeTab === "users" && assignTotal > 0 ? (
                      <div className="pt-1">
                        <AppPagination
                          page={userPage}
                          pageSize={userSize}
                          totalItems={assignTotal}
                          pageSizeOptions={[10, 15, 30]}
                          onPageChange={(next) => updateUrlParams({ userPage: String(next) })}
                          onPageSizeChange={(nextSize) =>
                            updateUrlParams({ userSize: String(nextSize), userPage: "1" })
                          }
                          itemLabel="người dùng"
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingNav)}
        onOpenChange={(open) => {
          if (!open) setPendingNav(null);
        }}
        title="Bỏ các thay đổi chưa lưu?"
        description="Thông tin quyền đang chỉnh sửa chưa được lưu. Các lượt cấp/thu hồi quyền đã tick trước đó vẫn được giữ nguyên."
        confirmLabel="Bỏ thay đổi"
        cancelLabel="Ở lại"
        confirmVariant="destructive"
        onConfirm={() => {
          const fn = pendingNav;
          setPendingNav(null);
          fn?.();
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Xóa quyền?"
        description={
          selectedDetail
            ? `Bạn có chắc muốn xóa quyền "${selectedDetail.name}" (${selectedDetail.code})? Tất cả liên kết gán quyền liên quan sẽ bị gỡ bỏ.`
            : ""
        }
        confirmLabel="Xóa quyền"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </PageFrame>
  );
}
