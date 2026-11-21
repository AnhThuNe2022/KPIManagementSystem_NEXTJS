"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import {
  KeyRound,
  LayoutList,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import {
  ActiveStatus,
  AppButton,
  AppCheckbox,
  AppEmptyState,
  AppForm,
  AppPagination,
  AppSwitch,
  AppTabs,
  AppTextArea,
  AppTextInput,
  ConfirmDialog,
  InlineErrorBanner,
  LoadingOverlay,
  MasterDetailFrame,
  PageFrame,
  PageHeader,
  PublicStatusBadge,
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

export function PermissionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showToast = useAppToast();

  // URL-synced state
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
  const [reloadTick, setReloadTick] = useState(0);

  // Catalog state
  const [catalogItems, setCatalogItems] = useState<PermissionDto[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogUnauthorized, setCatalogUnauthorized] = useState(false);

  // Detail state
  const [selectedDetail, setSelectedDetail] = useState<PermissionDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionDraft>(EMPTY_DRAFT);
  const [initialDraft, setInitialDraft] = useState<PermissionDraft>(EMPTY_DRAFT);
  const [formErrors, setFormErrors] = useState<{ code?: string; name?: string; module?: string }>({});
  const [saveServerError, setSaveServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Assignments state
  const [assignItems, setAssignItems] = useState<PermissionAssignmentItem[]>([]);
  const [assignTotal, setAssignTotal] = useState(0);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [busyTargets, setBusyTargets] = useState<Set<string>>(() => new Set());

  // Confirm dialogs
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const catalogCtrlRef = useRef<AbortController | null>(null);

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

  // Sync local search inputs when URL changes externally
  useEffect(() => setCatalogSearchInput(queryKeyword), [queryKeyword]);
  useEffect(() => setAssignSearchInput(assignSearchParam), [assignSearchParam]);

  // Debounce catalog search -> URL `q`
  useEffect(() => {
    const trimmed = catalogSearchInput.trim();
    if (trimmed === queryKeyword) return;
    const timer = window.setTimeout(() => {
      updateUrlParams({ q: trimmed || null, page: "1" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [catalogSearchInput, queryKeyword, updateUrlParams]);

  // Debounce assignment search -> URL `search`
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

  // Load catalog
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

  // Load selected permission detail
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

  // Load assignments when on menus/roles/users tab
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

  // Group catalog by module
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
      // Preserve exact backend validation message
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
      setAssignItems((prev) =>
        prev.map((row) =>
          String(row.id) === String(item.id) ? { ...row, isAssigned: nextChecked } : row,
        ),
      );
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
      showToast(
        "success",
        nextChecked ? "Đã gán quyền thành công." : "Đã thu hồi quyền thành công.",
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
      updateUrlParams({ permission: String(id), search: null, userPage: "1" });
    });
  };

  const startCreateNew = () => {
    guardDirty(() => {
      updateUrlParams({ permission: "new", tab: "detail", search: null });
    });
  };

  return (
    <PageFrame>
      <PageHeader
        artwork="admin"
        icon={<Shield className="h-5 w-5" />}
        eyebrow="Quản trị hệ thống"
        title="Quản lý phân quyền (RBAC)"
        description="Quản lý danh mục quyền theo phân hệ và gán quyền trực tiếp cho Menu, Vai trò và Người dùng."
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

      <MasterDetailFrame
        isDetailOpen
        detailWidth="lg:w-[54%] xl:w-[58%]"
        main={
          <div className="flex flex-col gap-3">
            <Card padding={4} elevation="low">
              <div className="flex flex-col gap-3">
                <AppTextInput
                  label="Tìm kiếm quyền"
                  isLabelHidden
                  value={catalogSearchInput}
                  onChange={setCatalogSearchInput}
                  placeholder="Tìm theo mã quyền, tên quyền, phân hệ..."
                  startIcon="search"
                  hasClear
                />

                {catalogError ? (
                  <InlineErrorBanner
                    message={catalogError}
                    isUnauthorized={catalogUnauthorized}
                    loginNextPath="/admin/permission"
                    onRetry={() => setReloadTick((t) => t + 1)}
                  />
                ) : catalogLoading ? (
                  <LoadingOverlay label="Đang tải danh mục quyền..." />
                ) : catalogItems.length === 0 ? (
                  <AppEmptyState
                    title="Chưa có quyền nào"
                    description="Thử từ khóa khác hoặc tạo quyền mới."
                    isCompact
                  />
                ) : (
                  <div className="flex max-h-[600px] flex-col gap-4 overflow-y-auto pr-1">
                    {groupedCatalog.map(([moduleName, perms]) => (
                      <section key={moduleName} className="flex flex-col gap-1.5">
                        <div className="sticky top-0 z-10 bg-surface py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                          {moduleName} ({perms.length})
                        </div>
                        <ul className="flex flex-col gap-1">
                          {perms.map((perm) => {
                            const isSelected = !isCreating && String(perm.id) === selectedParam;
                            return (
                              <li key={perm.id}>
                                <button
                                  type="button"
                                  onClick={() => selectPermission(perm.id)}
                                  className={`flex w-full flex-col gap-1.5 rounded-md border px-3 py-2.5 text-left ds-interactive ${
                                    isSelected
                                      ? "border-blue-ring bg-blue-subtle/70"
                                      : "border-border bg-surface hover:bg-overlay-hover"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-primary">
                                        {perm.name}
                                      </div>
                                      <div className="truncate font-mono text-xs text-secondary">
                                        {perm.code}
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      <PublicStatusBadge isPublic={perm.isPublic} />
                                      <ActiveStatus isActive={perm.isActive} compact />
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
                                    <span>Menu: {perm.menuCount ?? 0}</span>
                                    <span>Vai trò: {perm.roleCount ?? 0}</span>
                                    <span>Người dùng: {perm.userCount ?? 0}</span>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {catalogTotal > 0 ? (
              <AppPagination
                page={page}
                pageSize={pageSize}
                totalItems={catalogTotal}
                pageSizeOptions={[10, 15, 30]}
                onPageChange={(next) => updateUrlParams({ page: String(next) })}
                onPageSizeChange={(nextSize) =>
                  updateUrlParams({ size: String(nextSize), page: "1" })
                }
                itemLabel="quyền"
              />
            ) : null}
          </div>
        }
        detail={
          <Card padding={5} elevation="low">
            {!selectedParam ? (
              <AppEmptyState
                title="Chọn một quyền để xem hoặc phân bổ"
                description="Chọn bất kỳ quyền nào ở cột bên trái để chỉnh sửa thông tin và gán Menu, Vai trò hoặc Người dùng."
                icon={<KeyRound className="h-8 w-8 text-accent" />}
                actions={
                  <AppButton
                    label="Tạo quyền mới"
                    variant="primary"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={startCreateNew}
                  />
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Heading level={4}>
                      {isCreating
                        ? "Tạo quyền mới"
                        : selectedDetail?.name || `Quyền #${selectedParam}`}
                    </Heading>
                    {selectedDetail ? (
                      <Text type="supporting">
                        Mã: {selectedDetail.code} · Phân hệ: {selectedDetail.module}
                      </Text>
                    ) : null}
                  </div>
                  {selectedDetail ? (
                    <div className="flex items-center gap-2">
                      <PublicStatusBadge isPublic={selectedDetail.isPublic} />
                      <ActiveStatus isActive={selectedDetail.isActive} />
                    </div>
                  ) : null}
                </div>

                {!isCreating ? (
                  <AppTabs
                    size="sm"
                    value={activeTab}
                    onChange={(tab) => {
                      updateUrlParams({ tab, search: null, userPage: "1" });
                    }}
                    items={[
                      {
                        value: "detail",
                        label: "Chi tiết",
                        icon: <KeyRound className="h-3.5 w-3.5" />,
                      },
                      {
                        value: "menus",
                        label: "Menu",
                        count: selectedDetail?.menuCount,
                        icon: <LayoutList className="h-3.5 w-3.5" />,
                      },
                      {
                        value: "roles",
                        label: "Vai trò",
                        count: selectedDetail?.roleCount,
                        icon: <Shield className="h-3.5 w-3.5" />,
                      },
                      {
                        value: "users",
                        label: "Người dùng",
                        count: selectedDetail?.userCount,
                        icon: <Users className="h-3.5 w-3.5" />,
                      },
                    ]}
                  />
                ) : null}

                {activeTab === "detail" || isCreating ? (
                  detailLoading ? (
                    <LoadingOverlay label="Đang tải chi tiết quyền..." />
                  ) : detailError ? (
                    <InlineErrorBanner
                      message={detailError}
                      onRetry={() => setReloadTick((t) => t + 1)}
                    />
                  ) : (
                    <form onSubmit={handleSave} className="flex flex-col gap-4">
                      {saveServerError ? <InlineErrorBanner message={saveServerError} /> : null}
                      <AppForm>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <AppTextInput
                            label="Mã quyền (Code)"
                            value={draft.code}
                            onChange={(code) => {
                              setDraft((p) => ({ ...p, code }));
                              setFormErrors((e) => ({ ...e, code: undefined }));
                            }}
                            placeholder="VD: KPI.EVALUATION.VIEW"
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
                          label="Tên quyền"
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
                          label="Mô tả"
                          value={draft.description}
                          onChange={(description) => setDraft((p) => ({ ...p, description }))}
                          placeholder="Mô tả phạm vi áp dụng của quyền..."
                          rows={3}
                        />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-border bg-muted/40 p-3">
                            <AppSwitch
                              label="Kích hoạt"
                              description="Cho phép hệ thống kiểm tra quyền này"
                              value={draft.isActive}
                              onChange={(isActive) => setDraft((p) => ({ ...p, isActive }))}
                            />
                          </div>
                          <div className="rounded-lg border border-border bg-muted/40 p-3">
                            <AppSwitch
                              label="Quyền công khai"
                              description="Mọi tài khoản đăng nhập đều có quyền"
                              value={draft.isPublic}
                              onChange={(isPublic) => setDraft((p) => ({ ...p, isPublic }))}
                            />
                          </div>
                        </div>
                      </AppForm>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                        <div>
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
                        </div>
                        <div className="flex items-center gap-2">
                          <AppButton
                            label="Hoàn tác"
                            variant="secondary"
                            size="sm"
                            icon={<RotateCcw className="h-4 w-4" />}
                            isDisabled={!isDirty || isSaving}
                            onClick={() => {
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
                  <div className="flex flex-col gap-3">
                    <AppTextInput
                      label="Tìm đối tượng gán quyền"
                      isLabelHidden
                      value={assignSearchInput}
                      onChange={setAssignSearchInput}
                      placeholder={
                        activeTab === "menus"
                          ? "Tìm theo tên menu..."
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
                      <LoadingOverlay label="Đang tải danh sách gán quyền..." />
                    ) : assignItems.length === 0 ? (
                      <AppEmptyState
                        title="Không có đối tượng phù hợp"
                        description="Thử nhập từ khóa khác."
                        isCompact
                      />
                    ) : (
                      <ul className="flex max-h-[460px] flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
                        {assignItems.map((item) => {
                          const lockKey = `${activeTab}:${item.id}`;
                          const isBusy = busyTargets.has(lockKey);
                          return (
                            <li
                              key={String(item.id)}
                              className="flex items-center justify-between gap-3 px-3.5 py-2.5 ds-interactive hover:bg-overlay-hover"
                            >
                              {activeTab === "users" ? (
                                <UserIdentityCell
                                  name={item.userName || item.name || String(item.id)}
                                  subtitle={
                                    [item.systemCode, item.email].filter(Boolean).join(" · ") ||
                                    undefined
                                  }
                                  size="xsm"
                                />
                              ) : (
                                <span className="truncate text-sm font-medium text-primary">
                                  {item.name || String(item.id)}
                                </span>
                              )}

                              <div className="shrink-0">
                                <AppCheckbox
                                  label={item.isAssigned ? "Đã gán" : "Gán"}
                                  value={item.isAssigned}
                                  isLoading={isBusy}
                                  isDisabled={isBusy}
                                  onChange={(checked) =>
                                    void handleToggleAssignment(activeTab, item, checked)
                                  }
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {activeTab === "users" && assignTotal > 0 ? (
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
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </Card>
        }
      />

      <ConfirmDialog
        isOpen={Boolean(pendingNav)}
        onOpenChange={(open) => {
          if (!open) setPendingNav(null);
        }}
        title="Bỏ các thay đổi chưa lưu?"
        description="Thông tin quyền đang chỉnh sửa chưa được lưu. Bạn có chắc muốn chuyển sang mục khác?"
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
            ? `Bạn có chắc muốn xóa quyền "${selectedDetail.name}" (${selectedDetail.code})? Tất cả gán quyền liên quan sẽ bị gỡ bỏ.`
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
