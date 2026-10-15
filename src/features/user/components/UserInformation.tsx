"use client";

import Image from "next/image";
import {
  BackpackIcon,
  CheckIcon,
  DrawingPinFilledIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  IdCardIcon,
  LayersIcon,
  LockClosedIcon,
  MixIcon,
  Pencil1Icon,
  PersonIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import styles from "../user-information.module.css";
import { useAuth } from "@/contexts/AuthContext";
import AssignmentDialog from "./AssignmentDialog";
import PasswordChange from "./PasswordChange";
import { organizationApi } from "../service/organizationApi";
import { userApi } from "../service/userApi";
import { useUserInfor } from "../hooks/useUserInformation";
import { useCallback, useEffect, useState } from "react";
import {
  AssignmentType,
  UserOrganizationDto,
} from "@/types/organization";

import {
  AssignmentScopeType,
  CompanyDto,
  EnumCompanyCode,
  FilterString
} from "@/types/employee";

import {
  ChangePasswordDto,
} from "@/types/employee";
import { toast } from "sonner";
import { companyApi } from "../service/companyApi";
import ComplaintDialog from "./ComplaintDialog";
import { ConditionStatus, EnumCodeNoti, NotificationDto } from "@/types/notification";
import { conditionApi } from "../service/conditionApi";
import { notificationApi } from "../service/notificationApi";

export default function UserInforPage() {
  const {
    user,
    isLoading: authLoading,
  } = useAuth();

  const {
    employee,
    isLoading: userInforLoading,
  } = useUserInfor(user?.id);

  const [activeTab, setActiveTab] =
    useState(0);

  const [assignments, setAssignments] =
    useState<UserOrganizationDto[]>([]);

  const [assignmentsLoading, setAssignmentsLoading] =
    useState(false);

  const [companies, setCompanies] =
    useState<CompanyDto[]>([]);

  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] =
    useState(false);

  const [editingAssignment, setEditingAssignment] =
    useState<UserOrganizationDto | null>(null);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [isComplaintDialogOpen, setIsComplaintDialogOpen] = useState(false);
  const [complaintReason, setComplaintReason] = useState("");

  /**
   * =========================================================
   * LOAD INITIAL DATA
   * =========================================================
   */
  const loadCompanies = useCallback(async () => {
    try {
      const result = await companyApi.getCompaniesByManager();

      setCompanies(result ?? []);
    } catch (error) {
      console.error("Load companies failed:", error);
      setCompanies([]);
    }
  }, []);

  const loadAssignments = useCallback(
    async (userId: string) => {
      try {
        setAssignmentsLoading(true);
        setError(null);

        const result =
          await organizationApi.getPaged(userId);

        setAssignments(result.items ?? []);
      } catch (err) {
        console.error(err);

        setError(
          "Không thể tải đơn vị công tác."
        );
      } finally {
        setAssignmentsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!user?.id) return;
    loadCompanies();
    loadAssignments(user.id);
  }, [user?.id, loadAssignments, loadCompanies]);

  /**
   * =========================================================
   * ASSIGNMENT
   * =========================================================
   */

    const openAddAssignment = () => {
      const model: UserOrganizationDto = {
        assignmentType:
          assignments.length === 0
            ? AssignmentType.Primary
            : AssignmentType.Concurrent,

        employeeCode: "",

        companyId: 0,

        departmentId: 0,

        // Job Position lấy từ User Information
        jobPositionId: employee?.jobPosition?.id,
        jobPositionName: employee?.jobPosition?.name,

        // Chức danh nhập trong AssignmentDialog
        jobTitle: "",

        managerID: undefined,
        managerName: undefined,
        managerJobTitle: undefined,
        managerDepartmentName: undefined,
        managerCompanyName: undefined,
        managerOrganizationId: undefined,

        isActive: true,
        isDeleted: false,
      };

      setEditingAssignment(model);
      setIsAssignmentDialogOpen(true);
  };

  const openEditAssignment = (
    assignment: UserOrganizationDto
  ) => {
    setEditingAssignment(
      assignment
    );

    setIsAssignmentDialogOpen(true);
  };

  const closeAssignmentDialog = () => {
    setIsAssignmentDialogOpen(false);
    setEditingAssignment(null);
  };

  const handleAssignmentSubmit = async (
  value: UserOrganizationDto
) => {
  console.log("========== SUBMIT ==========");
  console.log("value:", value);

  const assignment: UserOrganizationDto = {
    ...value,

    // Lấy từ User Information
    jobPositionId:
      value.jobPositionId ?? employee?.jobPosition?.id,

    jobPositionName:
      value.jobPositionName ?? employee?.jobPosition?.name,
  };

  console.log("========== ASSIGNMENT ==========");
  console.log("assignment:", assignment);

  setAssignments(prev => {
    const index = prev.findIndex(
      item => item.id === assignment.id
    );

    if (index === -1) {
      console.log("ADD:", assignment);

      return [
        ...prev,
        assignment,
      ];
    }

    const next = [...prev];

    next[index] = {
      ...next[index],
      ...assignment,
    };

    console.log("UPDATE:", next[index]);

    return next;
  });

  closeAssignmentDialog();
};

  const saveAssignments = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (assignments.length > 0) {
        const result = await organizationApi.upsert(
          user.id,
          assignments
        );

        if (!result.success) {
          setError(
            result.message ??
              "Không thể cập nhật đơn vị công tác."
          );

          return;
        }

        toast.success("Cập nhật thành công!");
      }

      await loadAssignments(user.id);
    } catch (err) {
      console.error(err);

      setError(
        "Không thể cập nhật đơn vị công tác."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * =========================================================
   * PASSWORD
   * =========================================================
   */

  const closePasswordChange = () => {
    setIsPasswordDialogOpen(false);
  };

  const handleComplaint = () => {
    setComplaintReason("");
    setIsComplaintDialogOpen(true);
  };

  const handleComplaintSubmit = async () => {
    const reason = complaintReason.trim();

    if (!reason) {
      toast.error("Vui lòng nhập nội dung báo lỗi.");
      return;
    }

    try {
      setIsLoading(true);

      const notification = await createComplaint(reason);

      if (!notification) {
        return;
      }

      setIsComplaintDialogOpen(false);
      setComplaintReason("");

      toast.success("Đã gửi thành công!");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể gửi báo lỗi.";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

const createComplaint = async (
  reason: string
): Promise<NotificationDto | null> => {
  if (!user?.id) {
    throw new Error("Không tìm thấy người dùng.");
  }

  if (!employee) {
    throw new Error(
      "Không tìm thấy thông tin nhân viên."
    );
  }

  // =====================================================
  // COMPANY IDS TỪ CÁC ĐƠN VỊ CÔNG TÁC
  // =====================================================

  const companyIds = Array.from(
    new Set(
      assignments
        .filter(
          (assignment) =>
            !assignment.isDeleted &&
            assignment.companyId != null
        )
        .map(
          (assignment) =>
            assignment.companyId!
        )
    )
  );

  // Không có company nào thì không thể xác định receiver
  if (companyIds.length === 0) {
    toast.warning(
      "Không tìm thấy công ty của nhân viên."
    );

    return null;
  }

  // Ví dụ:
  // [1, 5, 8] => "1,5,8"
  const idValue =
    companyIds.join(",");

  // =====================================================
  // BUILD FILTER STRING
  // =====================================================

  const filter: FilterString = {
    filters: {
      statuscondition:
        ConditionStatus.ByUnitHRCompile.toString(),

      isactive: "true",

      scopevalue:
        AssignmentScopeType.Company.toString(),

      idvalue: idValue,
    },
  };

  // =====================================================
  // GET RECEIVERS
  // =====================================================

  const listCondition =
    await conditionApi.getAll(filter);

  const receivers = Array.from(
    new Map(
      listCondition
        .filter(
          (x) =>
            x.userId &&
            x.userId.trim() !== ""
        )
        .map((x) => [x.userId, x])
    ).values()
  );

  if (receivers.length === 0) {
    toast.warning(
      "Không tìm thấy người tiếp nhận."
    );

    return null;
  }

  // =====================================================
  // ALERT GROUP
  // =====================================================

  const alertGroupId =
    crypto.randomUUID();

  // =====================================================
  // GỬI COMPLAINT CHO CÁC RECEIVER
  // =====================================================

  for (const receiver of receivers) {
    await notificationApi.sendMessage({
      alertGroupId,

      userId: receiver.userId,

      // currentUserId bên Blazor
      senderUserId: user.id,

      codeNoti:
        EnumCodeNoti.COMPLAINT.toString(),

      message: reason,
    });
  }

  // =====================================================
  // DANH SÁCH NGƯỜI NHẬN
  // =====================================================

  const listUser = receivers
    .map(
      (x) =>
        `${x.fullName} (${x.systemCodeUser})`
    )
    .join(", ");

  // =====================================================
  // NOTIFY ADMIN
  // =====================================================

  await notificationApi.sendMessage({
    userId: "admin",

    alertGroupId,

    senderUserId: user.id,

    codeNoti:
      EnumCodeNoti.COMPLAINT_ADMIN.toString(),

    message:
      `Nhân viên [${employee.fullName} (${employee.systemCode})] ` +
      `đã tạo cuộc trao đổi khiếu nại.\n` +
      `Nội dung: ${reason}\n` +
      `Đã gửi tới: ${listUser}`,
  });

  // =====================================================
  // RETURN NOTIFICATION
  // =====================================================

  return {
    alertGroupId,

    userId: receivers[0].userId,

    senderUserId: user.id,

    codeNoti:
      EnumCodeNoti.COMPLAINT.toString(),
  };
};

  const handlePasswordSubmit = async (
    model: ChangePasswordDto
    ) => {
    if (!user?.id) {
      setError("Không tìm thấy người dùng.");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      await userApi.changePassword(
        user.id,
        model
      );

      toast.success("Đổi mật khẩu thành công!");

      closePasswordChange();

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi mật khẩu."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAssignment = (item: UserOrganizationDto) => {
    const isOk = window.confirm(
      "Bạn có chắc chắn muốn xóa đơn vị công tác này không?"
    );

    if (!isOk) return;

    setAssignments(prev => {
      // Đã tồn tại trên DB
      if (item.id) {
        return prev.map(assignment =>
          assignment.id === item.id
            ? {
                ...assignment,
                isDeleted: true,
              }
            : assignment
        );
      }

      // Chưa tồn tại trên DB
      return prev.filter(assignment => assignment !== item);
    });
  };

  /**
   * =========================================================
   * AUTH LOADING
   * =========================================================
   */
if (authLoading || userInforLoading) {
  return (
    <div className={styles.page} role="status" aria-label="Đang tải thông tin nhân viên" aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Hồ sơ nhân viên</span>
          <h1>Thông tin cá nhân</h1>
          <p>Hồ sơ, đơn vị công tác và bảo mật tài khoản của bạn.</p>
        </div>
      </header>
      <div className={styles.toolbar}>
        <div className={styles.loadingTabs} />
      </div>
      <div className={styles.generalPanel}>
        <div className={styles.loadingProfile}>
          <div className={styles.loadingAvatar} />
          <div className={styles.loadingName} />
        </div>
        <div className={styles.loadingPanel}>
          <div /><div /><div />
        </div>
      </div>
      <span className="sr-only">Đang tải thông tin...</span>
    </div>
  );
}

  if (!user) {
    return (
      <div className="p-6">
        Không tìm thấy thông tin người dùng.
      </div>
    );
  }

  /**
 * =========================================================
 * RENDER
 * =========================================================
 */

return (
  <div className={styles.page}>

    <div
      className={styles.pageFrame}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div
        className={styles.pageHeader}
      >

        <div>
          <span className={styles.eyebrow}>Hồ sơ nhân viên</span>
          <h1 className="text-xl font-medium text-[rgb(var(--color-text))]">
            Thông tin cá nhân
          </h1>
          <p>Hồ sơ, đơn vị công tác và bảo mật tài khoản của bạn.</p>
        </div>

      <button
        type="button"
        onClick={handleComplaint}
        disabled={isLoading}
        title="Nếu sai thông tin, hãy gửi cho admin"
        aria-label="Báo lỗi thông tin"
        className={styles.button + " " + styles.reportButton}
      >
        <ExclamationTriangleIcon aria-hidden="true" />
        Báo lỗi thông tin
      </button>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}
      {error && (
        <div
          className={styles.alert}
        >
          {error}
        </div>
      )}


      {/* =====================================================
          CONTENT
      ===================================================== */}
      <div className={styles.content}>

        {/* ===================================================
            TABS
        =================================================== */}
        <div className={styles.toolbar}>

          <div className={styles.tabTrack} data-tab={activeTab} role="tablist" aria-label="Thông tin tài khoản">

            {/* TAB THÔNG TIN */}
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              role="tab"
              aria-selected={activeTab === 0}
              className={`
                relative
                px-3
                py-4
                text-sm
                font-medium
                transition
                ${
                  activeTab === 0
                    ? "text-[rgb(var(--color-brand))]"
                    : "text-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-text))]"
                }
              `}
            >
              <PersonIcon aria-hidden="true" />
              Thông tin chung

              {activeTab === 0 && (
                <span
                  className="
                    absolute
                    bottom-0
                    left-0
                    right-0
                    h-[2px]
                    bg-[rgb(var(--color-brand))]
                  "
                />
              )}
            </button>


            {/* TAB ĐỔI MẬT KHẨU */}
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              role="tab"
              aria-selected={activeTab === 1}
              className={`
                relative
                px-3
                py-4
                text-sm
                font-medium
                transition
                ${
                  activeTab === 1
                    ? "text-[rgb(var(--color-brand))]"
                    : "text-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-text))]"
                }
              `}
            >
              <LockClosedIcon aria-hidden="true" />
              Đổi mật khẩu

              {activeTab === 1 && (
                <span
                  className="
                    absolute
                    bottom-0
                    left-0
                    right-0
                    h-[2px]
                    bg-[rgb(var(--color-brand))]
                  "
                />
              )}
            </button>

          </div>

        </div>


        {/* ===================================================
            TAB THÔNG TIN CHUNG
        =================================================== */}
        {activeTab === 0 && (
          <div className={styles.generalPanel}>

            {/* -----------------------------------------------
                THÔNG TIN NHÂN VIÊN
            ------------------------------------------------ */}
            <div className={styles.identityCard}>

              <div className={styles.avatar} aria-hidden="true">
                {employee?.fullName?.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase() || "DC"}
              </div>

              <InfoRow
                label="Họ và tên"
                icon={<PersonIcon aria-hidden="true" />}
                value={employee?.fullName}
              />

              <InfoRow
                label="Email"
                icon={<EnvelopeClosedIcon aria-hidden="true" />}
                value={employee?.email}
              />

              <InfoRow
                label="Mã hệ thống"
                icon={<IdCardIcon aria-hidden="true" />}
                value={employee?.systemCode}
              />

              <InfoRow
                label="Nhóm chức vụ"
                icon={<BackpackIcon aria-hidden="true" />}
                value={employee?.jobPosition?.name}
              />

              <div className={styles.credentialScene} aria-hidden="true">
                <div className={styles.credentialCard}>
                  <div className={styles.credentialBrand}>
                    <Image src="/brand/deoca-icon.png" alt="" width={34} height={34} />
                    <span>ĐÈO CẢ GROUP<small>THẺ NHÂN SỰ · KPI</small></span>
                    <IdCardIcon />
                  </div>
                  <div className={styles.credentialName}>{employee?.fullName || "Hồ sơ nhân viên"}</div>
                  <div className={styles.credentialBottom}>
                    <span>{employee?.systemCode || "Hồ sơ nội bộ"}</span>
                    <span>Cùng kiến tạo giá trị.</span>
                  </div>
                </div>
                <span className={styles.credentialSeal}><BackpackIcon /></span>
              </div>

            </div>


            {/* =================================================
                ĐƠN VỊ CÔNG TÁC
            ================================================= */}
            <div className={styles.panel}>

              {/* Header */}
              <div className={styles.panelHeader}>

                <div>
                  <h2 className="text-lg font-semibold text-[rgb(var(--color-text))]">
                    <LayersIcon aria-hidden="true" />
                    Đơn vị công tác
                  </h2>

                  <p className="mt-1 text-xs text-[rgb(var(--color-accent))]">
                    Các đơn vị bạn đang được phân công.
                  </p>
                </div>


                {/* THÊM */}
                <button
                  type="button"
                  onClick={openAddAssignment}
                  className={styles.button}
                >
                  <PlusIcon aria-hidden="true" />
                  Thêm đơn vị
                </button>

              </div>


              {/* =================================================
                  TABLE
              ================================================= */}
              {assignmentsLoading  ? (
                <div
                  className="
                    rounded-md
                    border
                    border-[rgb(var(--color-border))]
                    p-8
                    text-center
                    text-sm
                    text-[rgb(var(--color-muted))]
                  "
                >
                  Đang tải...
                </div>
              ) : assignments.length === 0 ? (
                <div
                  className="
                    rounded-md
                    border
                    border-[rgb(var(--color-border))]
                    p-8
                    text-center
                    text-sm
                    text-[rgb(var(--color-muted))]
                  "
                >
                  Chưa có đơn vị công tác.
                </div>
              ) : (
                <div
                  className={styles.tableWrap}
                >

                  <table
                    className={styles.table}
                  >

                    <thead>

                      <tr
                        className="
                          border-b
                          border-[rgb(var(--color-border))]
                          bg-[rgb(var(--color-surface))]
                          text-left
                        "
                      >

                        <th
                          className="
                            px-4
                            py-3
                            font-semibold
                            text-[rgb(var(--color-text))]
                          "
                        >
                          <LayersIcon aria-hidden="true" />
                          Loại
                        </th>

                        <th
                          className="
                            px-4
                            py-3
                            font-semibold
                            text-[rgb(var(--color-text))]
                          "
                        >
                          <IdCardIcon aria-hidden="true" />
                          Mã NV
                        </th>

                        <th
                          className="
                            px-4
                            py-3
                            font-semibold
                            text-[rgb(var(--color-text))]
                          "
                        >
                          <HomeIcon aria-hidden="true" />
                          Công ty
                        </th>

                        <th
                          className="
                            px-4
                            py-3
                            font-semibold
                            text-[rgb(var(--color-text))]
                          "
                        >
                          <MixIcon aria-hidden="true" />
                          Phòng ban
                        </th>

                        <th
                          className="
                            px-4
                            py-3
                            font-semibold
                            text-[rgb(var(--color-text))]
                          "
                        >
                          <BackpackIcon aria-hidden="true" />
                          Chức danh
                        </th>

                        <th
                          className="
                            px-4
                            py-3
                            font-semibold
                            text-[rgb(var(--color-text))]
                          "
                        >
                          <PersonIcon aria-hidden="true" />
                          Quản lý
                        </th>

                        <th
                          className="
                            w-[80px]
                            px-4
                            py-3
                            text-center
                            font-semibold
                            text-[rgb(var(--color-text))]
                          "
                        >
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {assignments
                        .filter(assignment => !assignment.isDeleted)
                        .map((assignment, index) => (

                        <tr
                          data-primary={assignment.assignmentType === AssignmentType.Primary}
                          key={
                            assignment.id ??
                            `${assignment.companyId}-${assignment.departmentId}`
                          }
                          className="
                            border-b
                            border-[rgb(var(--color-border))]
                            transition-colors
                            hover:bg-black/[0.03]
                            dark:hover:bg-white/[0.04]
                          "
                        >

                          {/* Loại */}
                          <td data-label="Loại" className="px-4 py-5">

                            <div className="flex items-center gap-2">

                              {assignment.assignmentType ===
                                AssignmentType.Primary && (
                                <DrawingPinFilledIcon className={styles.primaryPin} aria-hidden="true" />
                              )}

                              <span className="text-[rgb(var(--color-text))]">
                                {getAssignmentTypeText(
                                  assignment.assignmentType
                                )}
                              </span>

                            </div>

                          </td>


                          {/* Mã NV */}
                          <td data-label="Mã NV" className="px-4 py-5 text-[rgb(var(--color-muted))]">
                            {assignment.employeeCode ?? "-"}
                          </td>


                          {/* Công ty */}
                          <td data-label="Công ty" className="px-4 py-5 text-[rgb(var(--color-text))]">
                            {assignment.companyName ?? "-"}
                          </td>


                          {/* Phòng ban */}
                          <td data-label="Phòng ban" className="px-4 py-5 text-[rgb(var(--color-text))]">
                            {assignment.departmentName ?? "-"}
                          </td>


                          {/* Chức danh */}
                          <td data-label="Chức danh" className="px-4 py-5 text-[rgb(var(--color-text))]">
                            {assignment.jobTitle ?? "-"}
                          </td>


                          {/* Quản lý */}
                          <td data-label="Quản lý" className="px-4 py-5 text-[rgb(var(--color-text))]">
                            {assignment.managerName ?? "-"}
                          </td>


                          {/* Action */}
                          <td data-label="Thao tác" className="px-4 py-5">

                            <div className={styles.rowActions}>

                              {/* EDIT */}
                              <button
                                type="button"
                                onClick={() =>
                                  openEditAssignment(
                                    assignment
                                  )
                                }
                                className={styles.iconButton}
                                title="Sửa"
                                aria-label={"Chỉnh sửa " + (assignment.companyName || "đơn vị công tác")}
                              >
                                <Pencil1Icon aria-hidden="true" />
                              </button>


                              {/* DELETE */}
                              <button
                                type="button"
                                className={styles.iconButton + " " + styles.deleteButton}
                                title="Xóa"
                                aria-label={"Gỡ " + (assignment.companyName || "đơn vị công tác")}
                                onClick={() =>
                                  handleDeleteAssignment(assignment)
                                }
                              >
                                <TrashIcon aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* =================================================
                  SAVE
              ================================================= */}
            <button
              type="button"
              onClick={saveAssignments}
              disabled={isLoading || assignmentsLoading}
              className={styles.primaryButton + " " + styles.saveButton}
            >
              {isLoading && (
                <span
                  className="
                    h-4
                    w-4
                    animate-spin
                    rounded-full
                    border-2
                    border-[rgb(var(--color-on-brand))]
                    border-t-transparent
                  "
                />
              )}

              {!isLoading && <CheckIcon aria-hidden="true" />}
              {isLoading ? "Đang lưu…" : "Lưu thay đổi"}
            </button>

            </div>

          </div>
        )}


        {/* ===================================================
            TAB ĐỔI MẬT KHẨU
        =================================================== */}
        {activeTab === 1 && (
          <div className={styles.panel + " " + styles.passwordLayout}>

            <PasswordChange
              isAdmin={false}
              onPasswordSubmit={handlePasswordSubmit}
            />

            <aside className={styles.passwordAside}>
              <div className={styles.lockArt} aria-hidden="true"><LockClosedIcon /></div>
              <h3>Một lớp bảo vệ.<br />An tâm làm việc.</h3>
              <p>Giữ mật khẩu riêng cho tài khoản công việc, tránh dùng lại mật khẩu từ các dịch vụ khác.</p>
              <ul>
                <li><CheckIcon aria-hidden="true" />Không chia sẻ thông tin đăng nhập</li>
                <li><CheckIcon aria-hidden="true" />Đăng xuất khi dùng thiết bị chung</li>
              </ul>
            </aside>

          </div>
        )}

      </div>


      {/* =====================================================
          ASSIGNMENT DIALOG
      ===================================================== */}
      {editingAssignment && user.id && (
        <AssignmentDialog
          open={isAssignmentDialogOpen}
          userId={user.id}
          model={editingAssignment}
          isEdit={!!editingAssignment.id}
          hasPrimaryAssignment={assignments.some(
            (x) =>
              x.assignmentType ===
              AssignmentType.Primary
          )}
          companies={companies}
          isDirector={false}
          onClose={closeAssignmentDialog}
          onSubmit={handleAssignmentSubmit}
        />
      )}

      <ComplaintDialog
        open={isComplaintDialogOpen}
        value={complaintReason}
        loading={isLoading}
        onChange={setComplaintReason}
        onClose={() => setIsComplaintDialogOpen(false)}
        onSubmit={handleComplaintSubmit}
      />

    </div>
  </div>
);
}

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */
function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={styles.infoRow}
    >
      <span className={styles.factIcon} aria-hidden="true">{icon}</span>
      <div
        className="
          mb-1
          text-xs
          text-[rgb(var(--color-muted))]
        "
      >
        {label}
      </div>

      <div
        role={label === "Họ và tên" ? "heading" : undefined}
        aria-level={label === "Họ và tên" ? 2 : undefined}
        className="
          text-sm
          text-[rgb(var(--color-text))]
        "
      >
        {value || "-"}
      </div>
    </div>
  );
}

function getAssignmentTypeText(
  type: AssignmentType
): string {
  switch (type) {
    case AssignmentType.Primary:
      return "Chính";

    case AssignmentType.Concurrent:
      return "Kiêm nhiệm";

    default:
      return "";
  }
}
