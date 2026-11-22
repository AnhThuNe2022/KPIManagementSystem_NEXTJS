"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Check,
  IdCard,
  Lock,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from "lucide-react";
import {
  AppButton,
  AppIconButton,
  AppTabs,
  AssignmentTypeBadge,
  CompanyChip,
  ConfirmDialog,
  DataTable,
  InlineErrorBanner,
  LoadingOverlay,
  PageFrame,
  PageHeader,
  UserIdentityCell,
  pixel,
  proportional,
  useAppToast,
  type TableColumn,
} from "@/components/ds";
import { AssignmentType } from "@/design-system/registries";
import { useAuth } from "@/features/auth/AuthProvider";
import { companyApi } from "@/features/company/services/companyApi";
import type { CompanyDto } from "@/features/company/types";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import {
  getAssignmentKey,
  getVisibleAssignments,
  hasActivePrimaryAssignment,
  removeLocalAssignment,
  upsertLocalAssignment,
} from "../assignmentState";
import { userApi } from "../services/userApi";
import { userOrganizationApi } from "../services/userOrganizationApi";
import type { EmployeeInforDto, UserOrganizationDto } from "../types";
import { AssignmentFormDialog } from "./AssignmentFormDialog";
import { ComplaintDialog } from "./ComplaintDialog";
import { PasswordChangeView } from "./PasswordChangeView";

export function UserInformationView() {
  const { user, isLoading: authLoading } = useAuth();
  const showToast = useAppToast();

  const [activeTab, setActiveTab] = useState<"general" | "password">("general");
  const [employee, setEmployee] = useState<EmployeeInforDto | null>(null);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [assignments, setAssignments] = useState<UserOrganizationDto[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Dialog states
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserOrganizationDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserOrganizationDto | null>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<"general" | "password" | null>(null);

  const fetchCtrlRef = useRef<AbortController | null>(null);

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const [empRes, orgRes, companyRes] = await Promise.all([
        userApi.get(user.id, ctrl.signal),
        userOrganizationApi.getPaged(user.id, ctrl.signal),
        companyApi.getCompaniesByManager({ filters: {} }, ctrl.signal).catch(() => []),
      ]);
      if (ctrl.signal.aborted) return;
      setEmployee(empRes);
      setAssignments(orgRes.items);
      setCompanies(companyRes);
      setHasPendingChanges(false);
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Không thể tải thông tin tài khoản và đơn vị công tác."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    void loadAll();
    return () => fetchCtrlRef.current?.abort();
  }, [authLoading, loadAll, reloadTick, user?.id]);

  // Browser navigation warning when there are unsaved organization drafts
  useEffect(() => {
    if (!hasPendingChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasPendingChanges]);

  const visibleAssignments = useMemo(() => getVisibleAssignments(assignments), [assignments]);

  const displayName = employee?.fullName || user?.fullName || user?.username || "Hồ sơ nhân viên";
  const displayInitials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "DC";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[parts.length - 2][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }, [displayName]);

  const primaryAssignment = useMemo(
    () =>
      visibleAssignments.find((a) => a.assignmentType === AssignmentType.Primary) ??
      visibleAssignments[0] ??
      null,
    [visibleAssignments],
  );

  const handleTabChange = (next: string) => {
    const target: "general" | "password" = next === "password" ? "password" : "general";
    if (target === activeTab) return;
    if (activeTab === "general" && hasPendingChanges) {
      setPendingTabSwitch(target);
      return;
    }
    setActiveTab(target);
  };

  const openCreateAssignment = () => {
    const hasPrimary = hasActivePrimaryAssignment(assignments);
    const model: UserOrganizationDto = {
      assignmentType: hasPrimary ? AssignmentType.Concurrent : AssignmentType.Primary,
      employeeCode: "",
      companyId: 0,
      departmentId: 0,
      jobPositionId: employee?.jobPosition?.id ?? employee?.jobPositionId ?? null,
      jobPositionName: employee?.jobPosition?.name ?? null,
      jobTitle: "",
      isActive: true,
      isDeleted: false,
    };
    setEditingAssignment(model);
    setAssignmentDialogOpen(true);
  };

  const openEditAssignment = (item: UserOrganizationDto) => {
    setEditingAssignment(item);
    setAssignmentDialogOpen(true);
  };

  const handleAssignmentSubmit = (value: UserOrganizationDto) => {
    const enriched: UserOrganizationDto = {
      ...value,
      jobPositionId: value.jobPositionId ?? employee?.jobPosition?.id ?? employee?.jobPositionId ?? null,
      jobPositionName: value.jobPositionName ?? employee?.jobPosition?.name ?? null,
    };
    setAssignments((prev) => upsertLocalAssignment(prev, enriched));
    setHasPendingChanges(true);
    setAssignmentDialogOpen(false);
    setEditingAssignment(null);
    showToast(
      "info",
      "Đã cập nhật bản nháp đơn vị công tác. Nhấn 'Lưu thay đổi' để lưu vào hệ thống.",
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setAssignments((prev) => removeLocalAssignment(prev, deleteTarget));
    setHasPendingChanges(true);
    setDeleteTarget(null);
    showToast("info", "Đã xóa khỏi danh sách nháp. Nhấn 'Lưu thay đổi' để áp dụng.");
  };

  const handleSaveAssignments = async () => {
    if (!user?.id || isSaving) return;
    setIsSaving(true);
    try {
      const res = await userOrganizationApi.upsert(user.id, assignments);
      if (res && res.success === false) {
        showToast("error", res.message || "Không thể cập nhật đơn vị công tác.");
        return;
      }
      showToast("success", "Đã lưu đơn vị công tác thành công.");
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể cập nhật đơn vị công tác."));
    } finally {
      setIsSaving(false);
    }
  };

  const columns = useMemo<TableColumn<UserOrganizationDto>[]>(
    () => [
      {
        key: "type",
        header: "Loại",
        width: pixel(126),
        renderCell: (row) => <AssignmentTypeBadge type={row.assignmentType} />,
      },
      {
        key: "employeeCode",
        header: "Mã NV",
        width: pixel(132),
        renderCell: (row) => (
          <span className="font-mono text-sm font-medium text-primary">
            {row.employeeCode || "—"}
          </span>
        ),
      },
      {
        key: "companyDept",
        header: "Công ty / Phòng ban",
        width: proportional(1.8),
        renderCell: (row) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <CompanyChip companyCode={row.companyCode} companyName={row.companyName} />
            <span className="truncate text-xs text-secondary">{row.departmentName || "—"}</span>
          </div>
        ),
      },
      {
        key: "jobTitle",
        header: "Chức danh",
        width: proportional(1.3),
        renderCell: (row) => (
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium text-primary">{row.jobTitle || "—"}</span>
            {row.jobPositionName ? (
              <span className="truncate text-xs text-secondary">{row.jobPositionName}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: "manager",
        header: "Quản lý trực tiếp",
        width: proportional(1.5),
        renderCell: (row) =>
          row.managerName ? (
            <UserIdentityCell
              name={row.managerName}
              subtitle={
                [row.managerJobTitle, row.managerDepartmentName].filter(Boolean).join(" · ") ||
                undefined
              }
              size="xsm"
            />
          ) : (
            <span className="text-xs text-secondary">Chưa chọn</span>
          ),
      },
      {
        key: "actions",
        header: "Thao tác",
        width: pixel(120),
        align: "end",
        renderCell: (row) => (
          <div className="inline-flex items-center gap-1">
            <AppIconButton
              label="Chỉnh sửa đơn vị công tác"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => openEditAssignment(row)}
            />
            <AppIconButton
              label="Xóa đơn vị công tác"
              icon={<Trash2 className="h-4 w-4 text-error" />}
              onClick={() => setDeleteTarget(row)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  if (authLoading || (isLoading && !employee)) {
    return (
      <PageFrame maxWidth="wide">
        <LoadingOverlay label="Đang tải hồ sơ cá nhân..." />
      </PageFrame>
    );
  }

  return (
    <PageFrame maxWidth="wide">
      <PageHeader
        artwork="personal"
        icon={<UserCircle2 className="h-5 w-5" />}
        eyebrow="Hồ sơ cá nhân"
        title="Thông tin tài khoản & Đơn vị công tác"
        description="Quản lý đơn vị công tác chính / kiêm nhiệm, quản lý trực tiếp và mật khẩu đăng nhập."
        actions={
          <>
            <AppButton
              label="Báo sai thông tin"
              variant="secondary"
              icon={<AlertTriangle className="h-4 w-4" />}
              onClick={() => setComplaintOpen(true)}
            />
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setReloadTick((t) => t + 1)}
            />
          </>
        }
      />

      <AppTabs
        value={activeTab}
        onChange={handleTabChange}
        items={[
          {
            value: "general",
            label: "Thông tin chung",
            count: visibleAssignments.length,
            icon: <UserCircle2 className="h-4 w-4" />,
          },
          {
            value: "password",
            label: "Đổi mật khẩu",
            icon: <Lock className="h-4 w-4" />,
          },
        ]}
      />

      {error ? (
        <InlineErrorBanner
          message={error}
          isUnauthorized={isUnauthorized}
          loginNextPath="/user-infor"
          onRetry={() => setReloadTick((t) => t + 1)}
        />
      ) : activeTab === "general" ? (
        <div className="flex flex-col gap-5 ds-fade-in">
          {/* Executive Employee Identity & Deoca Staff Credential Card */}
          <section className="ds-profile-card" aria-label="Thông tin định danh nhân sự">
            <div className="relative z-10 grid min-h-[210px] grid-cols-1 items-center gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-7 lg:px-7 lg:py-6">
              <div className="flex min-w-0 items-center gap-5">
                <div className="ds-profile-avatar" aria-hidden="true">
                  {displayInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                    Họ và tên
                  </div>
                  <div className="mt-1">
                    <Heading level={2}>{displayName}</Heading>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {primaryAssignment ? (
                      <span className="ds-profile-meta-pill">
                        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {[primaryAssignment.companyName, primaryAssignment.departmentName]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    ) : null}
                    <span className="ds-timeline-pill">
                      {visibleAssignments.length} đơn vị công tác
                    </span>
                  </div>
                </div>
              </div>

              <div className="ds-credential-scene mx-auto lg:mx-0 lg:mr-2.5" aria-hidden="true">
                <div className="ds-credential-card">
                  <div className="flex items-center gap-2.5">
                    <span className="ds-credential-logo">
                      <Image
                        src="/brand/deoca-icon.svg"
                        alt=""
                        width={26}
                        height={26}
                        className="h-full w-full object-contain"
                      />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <div className="text-[11px] font-extrabold tracking-[0.04em]">
                        ĐÈO CẢ GROUP
                      </div>
                      <div className="ds-dialog-hero-muted mt-0.5 text-[10px] font-medium tracking-[0.03em]">
                        THẺ NHÂN SỰ · KPI
                      </div>
                    </div>
                    <IdCard className="ml-auto h-5 w-5 shrink-0 opacity-70" />
                  </div>

                  <div className="mt-2 line-clamp-2 pr-4 text-[15px] font-bold leading-snug tracking-tight">
                    {displayName}
                  </div>

                  <div className="ds-dialog-hero-muted flex flex-wrap items-center justify-between gap-2 pr-7 pt-1.5 text-[11px]">
                    <span className="font-mono font-semibold tracking-[0.08em]">
                      {employee?.systemCode || "Hồ sơ nội bộ"}
                    </span>
                    <span className="font-medium">Cùng kiến tạo giá trị.</span>
                  </div>
                </div>

                <span className="ds-credential-seal">
                  <Briefcase className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 divide-y divide-border border-t border-border bg-surface/80 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="flex min-w-0 items-center gap-3.5 px-5 py-3.5 md:px-6 md:py-4">
                <span className="ds-profile-fact-icon" aria-hidden="true">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-secondary">Email</div>
                  <div
                    className="mt-0.5 truncate text-sm font-semibold text-primary"
                    title={employee?.email || user?.email || undefined}
                  >
                    {employee?.email || user?.email || "—"}
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3.5 px-5 py-3.5 md:px-6 md:py-4">
                <span className="ds-profile-fact-icon" data-tone="cyan" aria-hidden="true">
                  <IdCard className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-secondary">Mã hệ thống</div>
                  <div className="mt-1">
                    <span className="ds-profile-code-pill font-mono">
                      {employee?.systemCode || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3.5 px-5 py-3.5 md:px-6 md:py-4">
                <span className="ds-profile-fact-icon" data-tone="orange" aria-hidden="true">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-secondary">Nhóm chức vụ</div>
                  <div
                    className="mt-0.5 truncate text-sm font-semibold text-primary"
                    title={employee?.jobPosition?.name || employee?.jobTitle || undefined}
                  >
                    {employee?.jobPosition?.name || employee?.jobTitle || "—"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {hasPendingChanges ? (
            <Banner
              status="warning"
              title="Bạn có thay đổi đơn vị công tác chưa lưu"
              description="Nhấn 'Lưu thay đổi' để đồng bộ danh sách đơn vị công tác lên hệ thống KPI."
              endContent={
                <div className="flex items-center gap-2">
                  <AppButton
                    label="Hủy bản nháp"
                    variant="secondary"
                    size="sm"
                    onClick={() => setReloadTick((t) => t + 1)}
                  />
                  <AppButton
                    label="Lưu thay đổi"
                    variant="primary"
                    size="sm"
                    icon={<Save className="h-4 w-4" />}
                    isLoading={isSaving}
                    onClick={handleSaveAssignments}
                  />
                </div>
              }
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              <Heading level={4}>Danh sách đơn vị công tác</Heading>
              <Text type="supporting">({visibleAssignments.length})</Text>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AppButton
                label="Thêm đơn vị công tác"
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={openCreateAssignment}
              />
              <AppButton
                label="Lưu thay đổi"
                variant="primary"
                size="sm"
                icon={<Save className="h-4 w-4" />}
                isLoading={isSaving}
                isDisabled={!hasPendingChanges || isSaving}
                onClick={handleSaveAssignments}
              />
            </div>
          </div>

          <DataTable
            data={visibleAssignments}
            columns={columns}
            idKey={(row) => getAssignmentKey(row)}
            isLoading={isLoading}
            emptyTitle="Chưa có đơn vị công tác nào"
            emptyDescription="Thêm đơn vị công tác chính để hệ thống xác định quản lý trực tiếp và luồng duyệt KPI."
            emptyActions={
              <AppButton
                label="Thêm đơn vị công tác"
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={openCreateAssignment}
              />
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 ds-fade-in">
          <div className="lg:col-span-2">
            {user?.id ? <PasswordChangeView userId={user.id} isAdmin={false} /> : null}
          </div>
          <Card padding={5} elevation="low">
            <div className="flex flex-col gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-subtle text-red-vivid">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <Heading level={4}>Một lớp bảo vệ. An tâm làm việc.</Heading>
              <Text type="supporting">
                Giữ mật khẩu riêng cho tài khoản công việc KPI Tập đoàn Đèo Cả, tránh dùng lại mật khẩu từ các dịch vụ cá nhân khác.
              </Text>
              <ul className="flex flex-col gap-2 text-sm text-primary">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  Không chia sẻ thông tin đăng nhập cho người khác
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  Đăng xuất khi sử dụng máy tính dùng chung
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  Nên kết hợp chữ hoa, chữ số và ký tự đặc biệt
                </li>
              </ul>
            </div>
          </Card>
        </div>
      )}

      {user?.id ? (
        <AssignmentFormDialog
          isOpen={assignmentDialogOpen}
          onOpenChange={(open) => {
            setAssignmentDialogOpen(open);
            if (!open) setEditingAssignment(null);
          }}
          userId={user.id}
          model={editingAssignment}
          hasPrimaryAssignment={hasActivePrimaryAssignment(assignments, editingAssignment)}
          companies={companies}
          isDirector={false}
          onSubmit={handleAssignmentSubmit}
        />
      ) : null}

      {user?.id ? (
        <ComplaintDialog
          isOpen={complaintOpen}
          onOpenChange={setComplaintOpen}
          userId={user.id}
          employee={employee}
          assignments={assignments}
        />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa đơn vị công tác?"
        description={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa đơn vị công tác "${deleteTarget.companyName || "đã chọn"}" (${deleteTarget.departmentName || "—"})? Thay đổi sẽ có hiệu lực sau khi bạn nhấn Lưu thay đổi.`
            : ""
        }
        confirmLabel="Xóa khỏi danh sách"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingTabSwitch)}
        onOpenChange={(open) => {
          if (!open) setPendingTabSwitch(null);
        }}
        title="Rời tab với thay đổi chưa lưu?"
        description="Danh sách đơn vị công tác đang có bản nháp chưa được lưu lên hệ thống. Bạn vẫn muốn chuyển sang tab Đổi mật khẩu?"
        confirmLabel="Chuyển tab"
        cancelLabel="Ở lại"
        confirmVariant="destructive"
        onConfirm={() => {
          const next = pendingTabSwitch;
          setPendingTabSwitch(null);
          if (next) setActiveTab(next);
        }}
      />
    </PageFrame>
  );
}
