"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
  FolderTree,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  ActiveStatus,
  AppButton,
  AppEmptyState,
  AppForm,
  AppIconButton,
  AppNumberInput,
  AppSelect,
  AppSwitch,
  AppTextInput,
  ConfirmDialog,
  InlineErrorBanner,
  LoadingOverlay,
  MasterDetailFrame,
  PageFrame,
  PageHeader,
  StatusFilterTabs,
  useAppToast,
  type SelectOption,
} from "@/components/ds";
import {
  ACTIVE_FILTER_OPTIONS,
  AVAILABLE_MENU_ICON_NAMES,
  isSupportedMenuIcon,
  resolveMenuIcon,
} from "@/design-system/registries";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import {
  collectDescendantIds,
  flattenMenuTree,
  matchesMenuQuery,
  sortMenuTree,
} from "../menuTree";
import { menuApi } from "../services/menuApi";
import type { MenuDraft, MenuDto } from "../types";

const EMPTY_DRAFT: MenuDraft = {
  code: "",
  title: "",
  url: "",
  icon: "DotFilledIcon",
  parentId: null,
  orderNo: 0,
  isActive: true,
};

function dtoToDraft(item: MenuDto): MenuDraft {
  return {
    id: item.id,
    code: item.code ?? "",
    title: item.title ?? "",
    url: item.url ?? "",
    icon: item.icon ?? "",
    parentId: item.parentId ?? null,
    orderNo: item.orderNo ?? 0,
    isActive: item.isActive !== false,
  };
}

function draftsEqual(a: MenuDraft, b: MenuDraft): boolean {
  return (
    a.id === b.id &&
    a.code === b.code &&
    a.title === b.title &&
    a.url === b.url &&
    a.icon === b.icon &&
    a.parentId === b.parentId &&
    a.orderNo === b.orderNo &&
    a.isActive === b.isActive
  );
}

function filterMenuTree(
  nodes: MenuDto[],
  query: string,
  statusFilter: "all" | "active" | "inactive",
): MenuDto[] {
  const result: MenuDto[] = [];
  for (const node of nodes) {
    const filteredChildren = filterMenuTree(node.children ?? [], query, statusFilter);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? node.isActive !== false : node.isActive === false);
    const matchesSelf = matchesStatus && matchesMenuQuery(node, query);
    if (matchesSelf || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren });
    }
  }
  return result;
}

export function MenuManagementView() {
  const showToast = useAppToast();

  const [tree, setTree] = useState<MenuDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<MenuDraft>(EMPTY_DRAFT);
  const [initialDraft, setInitialDraft] = useState<MenuDraft>(EMPTY_DRAFT);
  const [formErrors, setFormErrors] = useState<{ code?: string; title?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCtrlRef = useRef<AbortController | null>(null);

  const loadTree = useCallback(async () => {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const list = await menuApi.tree(ctrl.signal);
      if (ctrl.signal.aborted) return;
      const sorted = sortMenuTree(list);
      setTree(sorted);
      setExpandedIds((prev) => {
        if (prev.size > 0) return prev;
        return new Set(flattenMenuTree(sorted).map((n) => n.item.id));
      });
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Không thể tải cây menu."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
    return () => fetchCtrlRef.current?.abort();
  }, [loadTree, reloadTick]);

  const flatAll = useMemo(() => flattenMenuTree(tree), [tree]);
  const nodeById = useMemo(() => {
    const map = new Map<number, MenuDto>();
    for (const entry of flatAll) map.set(entry.item.id, entry.item);
    return map;
  }, [flatAll]);

  const selectedNode = selectedId !== null ? nodeById.get(selectedId) ?? null : null;
  const isDirty = !draftsEqual(draft, initialDraft);

  // Sync initial selection when tree loads and nothing is selected
  useEffect(() => {
    if (selectedId !== null && !nodeById.has(selectedId)) {
      setSelectedId(null);
      setDraft(EMPTY_DRAFT);
      setInitialDraft(EMPTY_DRAFT);
    }
  }, [nodeById, selectedId]);

  const filteredTree = useMemo(
    () => filterMenuTree(tree, searchQuery, statusFilter),
    [searchQuery, statusFilter, tree],
  );
  const visibleFlat = useMemo(() => {
    const flattened = flattenMenuTree(filteredTree);
    const forceExpand = Boolean(searchQuery.trim() || statusFilter !== "all");
    if (forceExpand) return flattened;
    return flattened.filter((node) =>
      node.ancestorIds.every((ancestorId) => expandedIds.has(ancestorId)),
    );
  }, [expandedIds, filteredTree, searchQuery, statusFilter]);

  const guardDirty = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      return;
    }
    action();
  };

  const selectMenu = (item: MenuDto) => {
    guardDirty(() => {
      const next = dtoToDraft(item);
      setSelectedId(item.id);
      setDraft(next);
      setInitialDraft(next);
      setFormErrors({});
    });
  };

  const startCreateRoot = () => {
    guardDirty(() => {
      const next: MenuDraft = {
        ...EMPTY_DRAFT,
        orderNo: tree.length + 1,
      };
      setSelectedId(null);
      setDraft(next);
      setInitialDraft(next);
      setFormErrors({});
    });
  };

  const startCreateChild = (parent: MenuDto) => {
    guardDirty(() => {
      const next: MenuDraft = {
        ...EMPTY_DRAFT,
        parentId: parent.id,
        orderNo: (parent.children?.length ?? 0) + 1,
      };
      setSelectedId(null);
      setDraft(next);
      setInitialDraft(next);
      setFormErrors({});
      setExpandedIds((prev) => new Set([...prev, parent.id]));
    });
  };

  // Prevent cycle: exclude self & all descendants from parent selector
  const excludedParentIds = useMemo(() => {
    if (!selectedNode) return new Set<number>();
    const ids = collectDescendantIds(selectedNode);
    ids.add(selectedNode.id);
    return ids;
  }, [selectedNode]);

  const parentOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [{ value: "", label: "— Menu gốc (không có cha) —" }];
    for (const node of flatAll) {
      if (excludedParentIds.has(node.item.id)) continue;
      const prefix = node.depth > 0 ? `${"— ".repeat(node.depth)}` : "";
      opts.push({
        value: String(node.item.id),
        label: `${prefix}${node.item.title} (${node.item.code})`,
      });
    }
    return opts;
  }, [excludedParentIds, flatAll]);

  const iconOptions = useMemo<SelectOption[]>(() => {
    const list = AVAILABLE_MENU_ICON_NAMES.map((name) => {
      const IconComp = resolveMenuIcon(name);
      return {
        value: name,
        label: name,
        icon: <IconComp className="h-4 w-4" />,
      };
    });
    if (draft.icon && !AVAILABLE_MENU_ICON_NAMES.includes(draft.icon)) {
      list.unshift({
        value: draft.icon,
        label: `${draft.icon} (không chuẩn)`,
        icon: <span className="text-xs text-warning">!</span>,
      });
    }
    return list;
  }, [draft.icon]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { code?: string; title?: string } = {};
    if (!draft.code.trim()) nextErrors.code = "Vui lòng nhập mã menu.";
    if (!draft.title.trim()) nextErrors.title = "Vui lòng nhập tên hiển thị.";
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      await menuApi.save(draft);
      showToast(
        "success",
        draft.id ? "Đã cập nhật menu thành công." : "Đã tạo menu mới thành công.",
      );
      setInitialDraft({ ...draft });
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể lưu menu."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedNode) return;
    setIsDeleting(true);
    try {
      await menuApi.remove(selectedNode.id);
      showToast("success", `Đã xóa menu "${selectedNode.title}".`);
      setDeleteDialogOpen(false);
      setSelectedId(null);
      setDraft(EMPTY_DRAFT);
      setInitialDraft(EMPTY_DRAFT);
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể xóa menu."));
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(flatAll.map((n) => n.item.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const PreviewIcon = resolveMenuIcon(draft.icon);
  const iconUnsupported = Boolean(draft.icon.trim() && !isSupportedMenuIcon(draft.icon.trim()));
  const selectedDescendantsCount = selectedNode ? collectDescendantIds(selectedNode).size : 0;

  return (
    <PageFrame>
      <PageHeader
        artwork="admin"
        icon={<FolderTree className="h-5 w-5" />}
        eyebrow="Quản trị hệ thống"
        title="Quản lý cây menu điều hướng"
        description="Cấu hình cấu trúc thanh điều hướng, đường dẫn, biểu tượng và thứ tự hiển thị."
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setReloadTick((t) => t + 1)}
            />
            <AppButton
              label="Thêm menu mới"
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={startCreateRoot}
            />
          </>
        }
      />

      <MasterDetailFrame
        isDetailOpen
        detailWidth="lg:w-[460px] xl:w-[520px]"
        main={
          <Card padding={4} elevation="low">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusFilterTabs
                  label="Lọc trạng thái menu"
                  items={ACTIVE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}
                />
                <div className="inline-flex items-center gap-1">
                  <AppIconButton
                    label="Mở rộng toàn bộ cây"
                    icon={<ChevronsUpDown className="h-4 w-4" />}
                    onClick={expandAll}
                  />
                  <AppIconButton
                    label="Thu gọn toàn bộ cây"
                    icon={<ChevronsDownUp className="h-4 w-4" />}
                    onClick={collapseAll}
                  />
                </div>
              </div>

              <AppTextInput
                label="Tìm kiếm menu"
                isLabelHidden
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Tìm theo tiêu đề, mã hoặc URL (không phân biệt dấu)..."
                startIcon="search"
                hasClear
              />

              {error ? (
                <InlineErrorBanner
                  message={error}
                  isUnauthorized={isUnauthorized}
                  loginNextPath="/admin/menu"
                  onRetry={() => setReloadTick((t) => t + 1)}
                />
              ) : isLoading ? (
                <LoadingOverlay label="Đang tải cây menu..." />
              ) : visibleFlat.length === 0 ? (
                <AppEmptyState
                  title="Không tìm thấy menu phù hợp"
                  description="Thử từ khóa khác hoặc tạo mới một mục menu."
                  isCompact
                />
              ) : (
                <ul className="flex max-h-[620px] flex-col gap-1 overflow-y-auto pr-1">
                  {visibleFlat.map(({ item, depth, hasChildren }) => {
                    const ItemIcon = resolveMenuIcon(item.icon);
                    const isSelected = selectedId === item.id;
                    const isExpanded = expandedIds.has(item.id);
                    return (
                      <li key={item.id}>
                        <div
                          className={`group flex items-center gap-2 rounded-md px-2.5 py-2 ds-interactive ${
                            isSelected
                              ? "border border-blue-ring bg-blue-subtle/70 text-primary"
                              : "border border-transparent hover:bg-overlay-hover"
                          }`}
                          style={{ paddingLeft: `${depth * 20 + 10}px` }}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
                              onClick={() => toggleExpand(item.id)}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-secondary hover:bg-muted"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <span className="w-6 shrink-0" />
                          )}

                          <button
                            type="button"
                            onClick={() => selectMenu(item)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                              <ItemIcon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-primary">
                                {item.title}
                              </div>
                              <div className="truncate text-xs text-secondary">
                                {item.code}
                                {item.url ? ` · ${item.url}` : ""}
                              </div>
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs tabular-nums text-secondary">
                              #{item.orderNo}
                            </span>
                            <ActiveStatus isActive={item.isActive} compact />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        }
        detail={
          <Card padding={5} elevation="low">
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                <div>
                  <Heading level={4}>
                    {selectedNode ? `Chỉnh sửa: ${selectedNode.title}` : "Tạo menu mới"}
                  </Heading>
                  <Text type="supporting">
                    {selectedNode
                      ? `ID #${selectedNode.id} · Mã: ${selectedNode.code}`
                      : draft.parentId
                        ? `Menu con trực thuộc #${draft.parentId}`
                        : "Điền thông tin để thêm mục mới vào thanh điều hướng."}
                  </Text>
                </div>
                {selectedNode ? (
                  <AppButton
                    label="Thêm menu con"
                    variant="secondary"
                    size="sm"
                    icon={<FolderPlus className="h-4 w-4" />}
                    onClick={() => startCreateChild(selectedNode)}
                  />
                ) : null}
              </div>

              {/* Live Sidebar Preview */}
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="mb-1.5 text-xs font-medium text-secondary">
                  Xem trước trên thanh điều hướng
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-subtle text-blue-vivid">
                      <PreviewIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-primary">
                        {draft.title.trim() || "Tên menu hiển thị"}
                      </div>
                      <div className="truncate text-xs text-secondary">
                        {draft.url.trim() || "(Nhóm menu cha — không có URL)"}
                      </div>
                    </div>
                  </div>
                  <ActiveStatus isActive={draft.isActive} compact />
                </div>
              </div>

              {iconUnsupported ? (
                <Banner
                  status="warning"
                  title="Biểu tượng chưa có trong danh mục chuẩn"
                  description={`Biểu tượng "${draft.icon}" không khớp với bộ Radix Icons; giao diện sẽ hiển thị dấu chấm mặc định cho đến khi chọn biểu tượng hợp lệ.`}
                />
              ) : null}

              <AppForm>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <AppTextInput
                    label="Mã menu (Code)"
                    value={draft.code}
                    onChange={(code) => {
                      setDraft((p) => ({ ...p, code }));
                      setFormErrors((e) => ({ ...e, code: undefined }));
                    }}
                    placeholder="VD: ADMIN_MENU"
                    isRequired
                    error={formErrors.code}
                  />
                  <AppNumberInput
                    label="Thứ tự hiển thị"
                    value={draft.orderNo}
                    onChange={(val) => setDraft((p) => ({ ...p, orderNo: val ?? 0 }))}
                    min={0}
                  />
                </div>

                <AppTextInput
                  label="Tiêu đề hiển thị"
                  value={draft.title}
                  onChange={(title) => {
                    setDraft((p) => ({ ...p, title }));
                    setFormErrors((e) => ({ ...e, title: undefined }));
                  }}
                  placeholder="VD: Quản lý menu"
                  isRequired
                  error={formErrors.title}
                />

                <AppTextInput
                  label="Đường dẫn (URL)"
                  value={draft.url}
                  onChange={(url) => setDraft((p) => ({ ...p, url }))}
                  placeholder="VD: /admin/menu (để trống nếu là nhóm cha)"
                  hasClear
                />

                <AppSelect
                  label="Menu cha"
                  value={draft.parentId ? String(draft.parentId) : ""}
                  onChange={(val) =>
                    setDraft((p) => ({ ...p, parentId: val ? Number(val) : null }))
                  }
                  options={parentOptions}
                  placeholder="Chọn menu cha..."
                  hasClear={false}
                />

                <AppSelect
                  label="Biểu tượng (Radix Icon)"
                  value={draft.icon}
                  onChange={(icon) => setDraft((p) => ({ ...p, icon }))}
                  options={iconOptions}
                  placeholder="Chọn biểu tượng..."
                />

                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <AppSwitch
                    label="Trạng thái kích hoạt"
                    description="Menu tạm ngưng sẽ ẩn khỏi thanh điều hướng và không cấp quyền truy cập tuyến đường."
                    value={draft.isActive}
                    onChange={(isActive) => setDraft((p) => ({ ...p, isActive }))}
                  />
                </div>
              </AppForm>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <div>
                  {selectedNode ? (
                    <AppButton
                      label="Xóa menu"
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
                    }}
                  />
                  <AppButton
                    type="submit"
                    label={selectedNode ? "Lưu thay đổi" : "Tạo menu"}
                    variant="primary"
                    size="sm"
                    icon={<Save className="h-4 w-4" />}
                    isLoading={isSaving}
                    isDisabled={isSaving || (Boolean(selectedNode) && !isDirty)}
                  />
                </div>
              </div>
            </form>
          </Card>
        }
      />

      <ConfirmDialog
        isOpen={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title="Bỏ các thay đổi chưa lưu?"
        description="Biểu mẫu menu hiện tại có chỉnh sửa chưa lưu. Bạn có muốn bỏ qua để tiếp tục?"
        confirmLabel="Bỏ thay đổi"
        cancelLabel="Ở lại"
        confirmVariant="destructive"
        onConfirm={() => {
          const fn = pendingAction;
          setPendingAction(null);
          fn?.();
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Xóa mục menu?"
        description={
          selectedNode
            ? selectedDescendantsCount > 0
              ? `Menu "${selectedNode.title}" hiện có ${selectedDescendantsCount} menu con trực thuộc. Xóa menu này có thể ảnh hưởng tới toàn bộ nhánh con. Bạn có chắc chắn tiếp tục?`
              : `Bạn có chắc chắn muốn xóa menu "${selectedNode.title}"? Thao tác này không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xóa menu"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </PageFrame>
  );
}
