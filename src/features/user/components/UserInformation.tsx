"use client";

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
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--color-page))]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="
            h-8
            w-8
            animate-spin
            rounded-full
            border-4
            border-[rgb(var(--color-border))]
            border-t-[rgb(var(--color-brand))]
          "
        />

        <span className="text-sm text-[rgb(var(--color-muted))]">
          Đang tải thông tin...
        </span>
      </div>
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
  <div className="min-h-screen bg-[rgb(var(--color-page))] p-4 transition-colors md:p-8">

    <div
      className="
        mx-auto
        max-w-[1860px]
        rounded-md
        border
        border-[rgb(var(--color-border))]
        bg-[rgb(var(--color-surface))]
        shadow-[var(--shadow-card)]
        transition-colors
      "
    >

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-[rgb(var(--color-border))]
          px-6
          py-5
        "
      >

        <h1 className="text-xl font-medium text-[rgb(var(--color-text))]">
          Cập nhật thông tin nhân viên
        </h1>

      <button
        type="button"
        onClick={handleComplaint}
        disabled={isLoading}
        title="Nếu sai thông tin, hãy gửi cho admin"
        className="
          rounded-md
          bg-red-500
          px-4
          py-2
          text-xs
          font-semibold
          text-white
          shadow-sm
          transition
          hover:bg-red-600
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        BÁO LỖI CHO ADMIN
      </button>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}
      {error && (
        <div
          className="
            mx-6
            mt-4
            rounded-md
            border
            border-red-300
            bg-red-50
            p-3
            text-sm
            text-red-600
            dark:border-red-900
            dark:bg-red-950/30
            dark:text-red-400
          "
        >
          {error}
        </div>
      )}


      {/* =====================================================
          CONTENT
      ===================================================== */}
      <div className="px-6 pb-6">

        {/* ===================================================
            TABS
        =================================================== */}
        <div className="border-b border-[rgb(var(--color-border))]">

          <div className="flex gap-8">

            {/* TAB THÔNG TIN */}
            <button
              type="button"
              onClick={() => setActiveTab(0)}
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
              THÔNG TIN CHUNG

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
              ĐỔI MẬT KHẨU

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
          <div className="pt-4">

            {/* -----------------------------------------------
                THÔNG TIN NHÂN VIÊN
            ------------------------------------------------ */}
            <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">

              <InfoRow
                label="Họ và tên"
                value={employee?.fullName}
              />

              <InfoRow
                label="Email"
                value={employee?.email}
              />

              <InfoRow
                label="Mã hệ thống"
                value={employee?.systemCode}
              />

              <InfoRow
                label="Nhóm chức vụ"
                value={employee?.jobPosition?.name}
              />

            </div>


            {/* =================================================
                ĐƠN VỊ CÔNG TÁC
            ================================================= */}
            <div className="mt-7">

              {/* Header */}
              <div className="mb-2 flex items-center justify-between">

                <div>
                  <h2 className="text-lg font-semibold text-[rgb(var(--color-text))]">
                    Đơn vị công tác
                  </h2>

                  <p className="mt-1 text-xs text-[rgb(var(--color-accent))]">
                    Danh sách các đơn vị công tác mà nhân viên đang được phân công.
                  </p>
                </div>


                {/* THÊM */}
                <button
                  type="button"
                  onClick={openAddAssignment}
                  className="
                    inline-flex
                    items-center
                    gap-1
                    rounded-md
                    bg-[rgb(var(--color-brand))]
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-[rgb(var(--color-on-brand))]
                    shadow-sm
                    transition
                    hover:bg-[rgb(var(--color-brand-strong))]
                  "
                >
                  <span className="text-base leading-none">
                    +
                  </span>

                  THÊM
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
                  className="
                    overflow-x-auto
                    rounded-md
                    border
                    border-[rgb(var(--color-border))]
                  "
                >

                  <table
                    className="
                      w-full
                      min-w-[1100px]
                      border-collapse
                      text-sm
                    "
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
                          <td className="px-4 py-5">

                            <div className="flex items-center gap-2">

                              {assignment.assignmentType ===
                                AssignmentType.Primary && (
                                <span className="text-lg text-yellow-400">
                                  ★
                                </span>
                              )}

                              <span className="text-[rgb(var(--color-text))]">
                                {getAssignmentTypeText(
                                  assignment.assignmentType
                                )}
                              </span>

                            </div>

                          </td>


                          {/* Mã NV */}
                          <td className="px-4 py-5 text-[rgb(var(--color-muted))]">
                            {assignment.employeeCode ?? "-"}
                          </td>


                          {/* Công ty */}
                          <td className="px-4 py-5 text-[rgb(var(--color-text))]">
                            {assignment.companyName ?? "-"}
                          </td>


                          {/* Phòng ban */}
                          <td className="px-4 py-5 text-[rgb(var(--color-text))]">
                            {assignment.departmentName ?? "-"}
                          </td>


                          {/* Chức danh */}
                          <td className="px-4 py-5 text-[rgb(var(--color-text))]">
                            {assignment.jobTitle ?? "-"}
                          </td>


                          {/* Quản lý */}
                          <td className="px-4 py-5 text-[rgb(var(--color-text))]">
                            {assignment.managerName ?? "-"}
                          </td>


                          {/* Action */}
                          <td className="px-4 py-5">

                            <div className="flex flex-col items-center gap-4">

                              {/* EDIT */}
                              <button
                                type="button"
                                onClick={() =>
                                  openEditAssignment(
                                    assignment
                                  )
                                }
                                className="
                                  text-xl
                                  text-[rgb(var(--color-muted))]
                                  transition
                                  hover:text-[rgb(var(--color-brand))]
                                "
                                title="Sửa"
                              >
                                ✎
                              </button>


                              {/* DELETE */}
                              <button
                                type="button"
                                className="
                                  text-lg
                                  text-red-500
                                  transition
                                  hover:text-red-700
                                "
                                title="Xóa"
                                onClick={() =>
                                  handleDeleteAssignment(assignment)
                                }
                              >
                                ▮
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
              className="
                mt-3
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-md
                bg-[rgb(var(--color-brand))]
                px-4
                py-3
                text-sm
                font-semibold
                text-[rgb(var(--color-on-brand))]
                transition
                hover:bg-[rgb(var(--color-brand-strong))]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
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

              {isLoading ? "ĐANG LƯU..." : "LƯU"}
            </button>

            </div>

          </div>
        )}


        {/* ===================================================
            TAB ĐỔI MẬT KHẨU
        =================================================== */}
        {activeTab === 1 && (
          <div className="mx-auto max-w-2xl py-8">

            <PasswordChange
              isAdmin={false}
              onPasswordSubmit={handlePasswordSubmit}
            />

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
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div
      className="
        border-b
        border-dotted
        border-[rgb(var(--color-border))]
        py-3
      "
    >
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

  
