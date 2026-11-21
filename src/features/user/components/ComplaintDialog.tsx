"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AppForm,
  AppTextArea,
  FormDialog,
  InlineErrorBanner,
  useAppToast,
} from "@/components/ds";
import { AssignmentScopeType, ConditionStatus } from "@/design-system/registries";
import { conditionAssignmentApi } from "@/features/condition-assignments/services/conditionAssignmentApi";
import { notificationApi } from "@/features/notifications/services/notificationApi";
import { EnumCodeNoti } from "@/features/notifications/types";
import { getErrorMessage } from "@/lib/http/request";
import type { EmployeeInforDto, UserOrganizationDto } from "../types";

export function ComplaintDialog({
  isOpen,
  onOpenChange,
  userId,
  employee,
  assignments,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  employee: EmployeeInforDto | null;
  assignments: UserOrganizationDto[];
}) {
  const showToast = useAppToast();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Preserve alertGroupId & already-sent recipients across retries so no duplicate alerts are sent
  const alertGroupIdRef = useRef<string | null>(null);
  const sentUserIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setError(null);
      alertGroupIdRef.current = null;
      sentUserIdsRef.current = new Set();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập thông tin cần báo lỗi hoặc điều chỉnh.");
      return;
    }
    if (!employee) {
      setError("Không tìm thấy thông tin nhân viên.");
      return;
    }

    const companyIds = Array.from(
      new Set(
        assignments
          .filter((a) => !a.isDeleted && a.companyId > 0)
          .map((a) => a.companyId),
      ),
    );
    if (companyIds.length === 0) {
      showToast("warning", "Không tìm thấy công ty của nhân viên để xác định người tiếp nhận.");
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      const listCondition = await conditionAssignmentApi.getAll({
        statuscondition: ConditionStatus.ByUnitHRCompile,
        isactive: "true",
        scopevalue: String(AssignmentScopeType.Company),
        idvalue: companyIds.join(","),
      });

      const receivers = Array.from(
        new Map(
          listCondition
            .filter((x) => x.userId && x.userId.trim() !== "")
            .map((x) => [x.userId, x]),
        ).values(),
      );

      if (receivers.length === 0) {
        showToast("warning", "Không tìm thấy nhân sự HR tiếp nhận cho công ty của bạn.");
        return;
      }

      if (!alertGroupIdRef.current) {
        alertGroupIdRef.current =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `alert-${Date.now()}`;
      }
      const alertGroupId = alertGroupIdRef.current;

      for (const receiver of receivers) {
        if (sentUserIdsRef.current.has(receiver.userId)) continue;
        await notificationApi.sendMessage(
          {
            alertGroupId,
            userId: receiver.userId,
            senderUserId: userId,
            codeNoti: String(EnumCodeNoti.COMPLAINT),
            message: trimmed,
          },
          { silentEvent: true },
        );
        sentUserIdsRef.current.add(receiver.userId);
      }

      if (!sentUserIdsRef.current.has("admin")) {
        const listUser = receivers
          .map((x) => `${x.fullName ?? x.userId} (${x.systemCodeUser ?? "—"})`)
          .join(", ");
        await notificationApi.sendMessage({
          userId: "admin",
          alertGroupId,
          senderUserId: userId,
          codeNoti: String(EnumCodeNoti.COMPLAINT_ADMIN),
          message:
            `Nhân viên [${employee.fullName} (${employee.systemCode ?? "—"})] ` +
            `đã tạo cuộc trao đổi khiếu nại.\n` +
            `Nội dung: ${trimmed}\n` +
            `Đã gửi tới: ${listUser}`,
        });
        sentUserIdsRef.current.add("admin");
      }

      showToast("success", "Đã gửi báo lỗi tới nhân sự tiếp nhận và quản trị viên.");
      onOpenChange(false);
    } catch (err) {
      const msg = getErrorMessage(
        err,
        "Gửi báo lỗi chưa hoàn tất. Bạn có thể nhấn Gửi lại để tiếp tục gửi cho các người nhận còn lại.",
      );
      setError(msg);
      showToast("error", msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Báo sai thông tin với HR / Admin"
      subtitle="Nội dung sẽ được chuyển tự động tới HR tổng hợp phụ trách đơn vị của bạn và quản trị viên."
      isDirty={Boolean(reason.trim())}
      isSubmitting={isSending}
      submitLabel="Gửi báo lỗi"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-3">
        {error ? <InlineErrorBanner message={error} /> : null}
        <AppForm>
          <AppTextArea
            label="Thông tin sai hoặc cần điều chỉnh"
            value={reason}
            onChange={(val) => {
              setReason(val);
              if (error) setError(null);
            }}
            placeholder="Mô tả rõ thông tin cần điều chỉnh (họ tên, chức danh, đơn vị, quản lý...)"
            rows={5}
            isRequired
            isDisabled={isSending}
          />
        </AppForm>
      </div>
    </FormDialog>
  );
}
