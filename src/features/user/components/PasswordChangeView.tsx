"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Check, Lock, ShieldCheck } from "lucide-react";
import {
  AppButton,
  AppForm,
  AppPasswordInput,
  AppRadioList,
  AppTextInput,
  InlineErrorBanner,
  useAppToast,
} from "@/components/ds";
import { getErrorMessage } from "@/lib/http/request";
import { userApi } from "../services/userApi";
import type { ChangePasswordDto } from "../types";

type PasswordMethod = "kpi" | "cms";

export function PasswordChangeView({
  userId,
  isAdmin = false,
}: {
  userId: string;
  isAdmin?: boolean;
}) {
  const showToast = useAppToast();

  const [method, setMethod] = useState<PasswordMethod>("kpi");
  const [cmsUsername, setCmsUsername] = useState("");
  const [cmsPassword, setCmsPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const strengthChecks = useMemo(
    () => [
      { label: "Từ 8 ký tự trở lên", passed: newPassword.length >= 8 },
      { label: "Có chữ in hoa (A–Z)", passed: /[A-Z]/.test(newPassword) },
      { label: "Có chữ số (0–9)", passed: /\d/.test(newPassword) },
      { label: "Có ký tự đặc biệt", passed: /[^A-Za-z0-9]/.test(newPassword) },
    ],
    [newPassword],
  );

  const strengthScore = strengthChecks.filter((c) => c.passed).length;
  const strengthLabel = strengthScore <= 1 ? "Yếu" : strengthScore <= 2 ? "Trung bình" : "Mạnh";
  const strengthBarClass =
    strengthScore <= 1 ? "bg-error" : strengthScore <= 2 ? "bg-warning" : "bg-success";
  const strengthTextClass =
    strengthScore <= 1 ? "text-error" : strengthScore <= 2 ? "text-warning" : "text-success";

  const handleMethodChange = (next: string) => {
    const parsed: PasswordMethod = next === "cms" ? "cms" : "kpi";
    setMethod(parsed);
    setErrors({});
    setServerError(null);
    if (parsed === "cms") {
      setCurrentPassword("");
    } else {
      setCmsUsername("");
      setCmsPassword("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const nextErrors: Record<string, string> = {};

    if (!isAdmin && method === "kpi" && !currentPassword.trim()) {
      nextErrors.currentPassword = "Vui lòng nhập mật khẩu KPI hiện tại.";
    }
    if (!isAdmin && method === "cms") {
      if (!cmsUsername.trim()) nextErrors.cmsUsername = "Vui lòng nhập tên người dùng CMS.";
      if (!cmsPassword.trim()) nextErrors.cmsPassword = "Vui lòng nhập mật khẩu CMS.";
    }
    if (!newPassword.trim()) {
      nextErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = "Mật khẩu mới cần ít nhất 6 ký tự.";
    } else if (!isAdmin && method === "kpi" && currentPassword && newPassword === currentPassword) {
      nextErrors.newPassword = "Mật khẩu mới không được trùng mật khẩu hiện tại.";
    }
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Vui lòng xác nhận mật khẩu mới.";
    } else if (newPassword && confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: ChangePasswordDto = {
      ...(method === "cms"
        ? { cmsUsername: cmsUsername.trim(), cmsPassword }
        : { currentPassword }),
      newPassword,
      confirmPassword,
    };

    setIsSaving(true);
    try {
      await userApi.changePassword(userId, payload);
      showToast("success", "Đã đổi mật khẩu thành công.");
      // Clear all inputs on success (fixes legacy leftover input state)
      setCmsUsername("");
      setCmsPassword("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể thay đổi mật khẩu.");
      setServerError(msg);
      showToast("error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card padding={5} elevation="low">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-5">
        <div className="flex items-start gap-3 border-b border-border pb-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-subtle text-blue-vivid">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <Heading level={4}>Đổi mật khẩu tài khoản</Heading>
            <Text type="supporting">
              Xác thực tài khoản bằng mật khẩu KPI hiện tại hoặc tài khoản CMS trước khi đặt mật khẩu mới.
            </Text>
          </div>
        </div>

        {serverError ? <InlineErrorBanner title="Đổi mật khẩu thất bại" message={serverError} /> : null}

        <AppForm>
          {!isAdmin ? (
            <AppRadioList
              label="Phương thức xác thực"
              value={method}
              onChange={handleMethodChange}
              orientation="horizontal"
              options={[
                {
                  value: "kpi",
                  label: "Mật khẩu KPI hiện tại",
                  description: "Xác thực bằng mật khẩu đang dùng trên hệ thống KPI",
                },
                {
                  value: "cms",
                  label: "Tài khoản CMS",
                  description: "Xác thực bằng tài khoản cổng CMS Tập đoàn",
                },
              ]}
            />
          ) : null}

          {!isAdmin && method === "cms" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AppTextInput
                label="Tên người dùng CMS"
                value={cmsUsername}
                onChange={(val) => {
                  setCmsUsername(val);
                  setErrors((e) => ({ ...e, cmsUsername: "" }));
                }}
                autoComplete="username"
                isRequired
                isDisabled={isSaving}
                error={errors.cmsUsername}
              />
              <AppPasswordInput
                label="Mật khẩu CMS"
                value={cmsPassword}
                onChange={(val) => {
                  setCmsPassword(val);
                  setErrors((e) => ({ ...e, cmsPassword: "" }));
                }}
                autoComplete="current-password"
                isRequired
                isDisabled={isSaving}
                error={errors.cmsPassword}
              />
            </div>
          ) : null}

          {!isAdmin && method === "kpi" ? (
            <AppPasswordInput
              label="Mật khẩu KPI hiện tại"
              value={currentPassword}
              onChange={(val) => {
                setCurrentPassword(val);
                setErrors((e) => ({ ...e, currentPassword: "" }));
              }}
              autoComplete="current-password"
              isRequired
              isDisabled={isSaving}
              error={errors.currentPassword}
            />
          ) : null}

          <AppPasswordInput
            label="Mật khẩu mới"
            value={newPassword}
            onChange={(val) => {
              setNewPassword(val);
              setErrors((e) => ({ ...e, newPassword: "" }));
            }}
            autoComplete="new-password"
            isRequired
            isDisabled={isSaving}
            error={errors.newPassword}
          />

          {newPassword ? (
            <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-3.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-secondary">Độ mạnh mật khẩu</span>
                <span className={`font-semibold ${strengthTextClass}`}>{strengthLabel}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-1.5 rounded-full ${
                      strengthScore >= step ? strengthBarClass : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {strengthChecks.map((rule) => (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-xs ${
                      rule.passed ? "font-medium text-success" : "text-secondary"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <AppPasswordInput
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={(val) => {
              setConfirmPassword(val);
              setErrors((e) => ({ ...e, confirmPassword: "" }));
            }}
            autoComplete="new-password"
            isRequired
            isDisabled={isSaving}
            error={errors.confirmPassword}
          />
        </AppForm>

        <div className="flex justify-end border-t border-border pt-4">
          <AppButton
            type="submit"
            label="Cập nhật mật khẩu"
            variant="primary"
            icon={<ShieldCheck className="h-4 w-4" />}
            isLoading={isSaving}
            isDisabled={isSaving}
          />
        </div>
      </form>
    </Card>
  );
}
