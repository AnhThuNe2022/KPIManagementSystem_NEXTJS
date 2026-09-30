"use client";

import { useState } from "react";
import { ChangePasswordDto } from "@/types/employee";

interface PasswordChangeProps {
  isAdmin?: boolean;

  onPasswordSubmit: (
    model: ChangePasswordDto
  ) => Promise<void> | void;
}

export default function PasswordChange({
  isAdmin = false,
  onPasswordSubmit,
}: PasswordChangeProps) {
  type PasswordChangeMethod = "cms" | "kpi";

  const [form, setForm] =
    useState<ChangePasswordDto>({});

  const [isSaving, setIsSaving] =
    useState(false);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [showCmsPassword, setShowCmsPassword] =
    useState(false);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [changeMethod, setChangeMethod] =
    useState<PasswordChangeMethod>("kpi");

  const updateField = <
    K extends keyof ChangePasswordDto
  >(
    field: K,
    value: ChangePasswordDto[K]
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));

    setErrors(prev => ({
      ...prev,
      [field]: "",
    }));
  };

  const validate = () => {
    const nextErrors: Record<
      string,
      string
    > = {};

    if (!form.newPassword?.trim()) {
      nextErrors.newPassword =
        "Vui lòng nhập mật khẩu mới.";
    }

    if (!form.confirmPassword?.trim()) {
      nextErrors.confirmPassword =
        "Vui lòng xác nhận mật khẩu.";
    }

    if (
      form.newPassword &&
      form.confirmPassword &&
      form.newPassword !==
        form.confirmPassword
    ) {
      nextErrors.confirmPassword =
        "Mật khẩu xác nhận không khớp.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      await onPasswordSubmit({
        ...form,
      });
    } finally {
      setIsSaving(false);
    }
  };

const handleChangeMethod = (
  method: PasswordChangeMethod
) => {
  setChangeMethod(method);

  if (method === "cms") {
    updateField("currentPassword", "");
  } else {
    updateField("cmsUsername", "");
    updateField("cmsPassword", "");
  }
};

return (
  <form
    id="password-form"
    onSubmit={handleSubmit}
    className="space-y-5"
  >
    {/* =========================
        METHOD
    ========================== */}
    {!isAdmin && (
      <div>
        <label className="mb-3 block text-sm font-medium text-[rgb(var(--color-text))]">
          Phương thức đổi mật khẩu
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* CMS */}
          <label
            className={`
              flex
              cursor-pointer
              items-start
              gap-3
              rounded-md
              border
              p-4
              transition
              ${
                changeMethod === "cms"
                  ? `
                    border-[rgb(var(--color-brand))]
                    bg-[rgb(var(--color-brand))]/5
                  `
                  : `
                    border-[rgb(var(--color-border))]
                    hover:bg-[rgb(var(--color-page))]
                  `
              }
            `}
          >
            <input
              type="radio"
              name="passwordChangeMethod"
              value="cms"
              checked={changeMethod === "cms"}
              onChange={() =>
                handleChangeMethod("cms")
              }
              disabled={isSaving}
              className="
                mt-0.5
                h-4
                w-4
                accent-[rgb(var(--color-brand))]
              "
            />

            <div>
              <div className="text-sm font-medium text-[rgb(var(--color-text))]">
                Tài khoản CMS
              </div>

              <div className="mt-1 text-xs text-[rgb(var(--color-muted))]">
                Sử dụng tài khoản CMS để xác thực
              </div>
            </div>
          </label>

          {/* KPI */}
          <label
            className={`
              flex
              cursor-pointer
              items-start
              gap-3
              rounded-md
              border
              p-4
              transition
              ${
                changeMethod === "kpi"
                  ? `
                    border-[rgb(var(--color-brand))]
                    bg-[rgb(var(--color-brand))]/5
                  `
                  : `
                    border-[rgb(var(--color-border))]
                    hover:bg-[rgb(var(--color-page))]
                  `
              }
            `}
          >
            <input
              type="radio"
              name="passwordChangeMethod"
              value="kpi"
              checked={changeMethod === "kpi"}
              onChange={() =>
                handleChangeMethod("kpi")
              }
              disabled={isSaving}
              className="
                mt-0.5
                h-4
                w-4
                accent-[rgb(var(--color-brand))]
              "
            />

            <div>
              <div className="text-sm font-medium text-[rgb(var(--color-text))]">
                Mật khẩu KPI hiện tại
              </div>

              <div className="mt-1 text-xs text-[rgb(var(--color-muted))]">
                Sử dụng mật khẩu KPI hiện tại
              </div>
            </div>
          </label>
        </div>
      </div>
    )}

    {/* =========================
        CMS METHOD
    ========================== */}
    {!isAdmin && changeMethod === "cms" && (
      <div className="space-y-4">
        {/* CMS Username */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[rgb(var(--color-text))]">
            Tên người dùng CMS
          </label>

          <input
            type="text"
            value={form.cmsUsername ?? ""}
            onChange={e =>
              updateField(
                "cmsUsername",
                e.target.value
              )
            }
            disabled={isSaving}
            className="
              w-full
              rounded-md
              border
              border-[rgb(var(--color-border))]
              bg-[rgb(var(--color-surface))]
              px-3
              py-2
              text-[rgb(var(--color-text))]
              outline-none
              transition
              placeholder:text-[rgb(var(--color-muted))]
              focus:border-[rgb(var(--color-brand))]
            "
          />
        </div>

        {/* CMS Password */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[rgb(var(--color-text))]">
            Mật khẩu CMS
          </label>

          <div className="relative">
            <input
              type={
                showCmsPassword
                  ? "text"
                  : "password"
              }
              value={form.cmsPassword ?? ""}
              onChange={e =>
                updateField(
                  "cmsPassword",
                  e.target.value
                )
              }
              disabled={isSaving}
              className="
                w-full
                rounded-md
                border
                border-[rgb(var(--color-border))]
                bg-[rgb(var(--color-surface))]
                px-3
                py-2
                pr-10
                text-[rgb(var(--color-text))]
                outline-none
                transition
                focus:border-[rgb(var(--color-brand))]
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowCmsPassword(
                  prev => !prev
                )
              }
              disabled={isSaving}
              aria-label={
                showCmsPassword
                  ? "Ẩn mật khẩu"
                  : "Hiện mật khẩu"
              }
              title={
                showCmsPassword
                  ? "Ẩn mật khẩu"
                  : "Hiện mật khẩu"
              }
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                text-[rgb(var(--color-muted))]
                transition
                hover:text-[rgb(var(--color-text))]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {showCmsPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.58 10.58a2 2 0 002.84 2.84"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.88 5.09A10.94 10.94 0 0112 4.88c5.23 0 8.87 4.12 9.93 7.12a11.8 11.8 0 01-3.01 4.55"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.61 6.61A11.8 11.8 0 002.07 12C3.13 15 6.77 19.12 12 19.12c1.61 0 3.05-.35 4.3-.91"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.07 12C3.13 9 6.77 4.88 12 4.88S20.87 9 21.93 12C20.87 15 17.23 19.12 12 19.12S3.13 15 2.07 12z"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* =========================
        KPI METHOD
    ========================== */}
    {!isAdmin && changeMethod === "kpi" && (
      <div>
        <label className="mb-1 block text-sm font-medium text-[rgb(var(--color-text))]">
          Mật khẩu KPI hiện tại
        </label>

        <div className="relative">
          <input
            type={
              showCurrentPassword
                ? "text"
                : "password"
            }
            value={form.currentPassword ?? ""}
            onChange={e =>
              updateField(
                "currentPassword",
                e.target.value
              )
            }
            disabled={isSaving}
            className="
              w-full
              rounded-md
              border
              border-[rgb(var(--color-border))]
              bg-[rgb(var(--color-surface))]
              px-3
              py-2
              pr-10
              text-[rgb(var(--color-text))]
              outline-none
              transition
              focus:border-[rgb(var(--color-brand))]
            "
          />

          <button
            type="button"
            onClick={() =>
              setShowCurrentPassword(
                prev => !prev
              )
            }
            disabled={isSaving}
            aria-label={
              showCurrentPassword
                ? "Ẩn mật khẩu"
                : "Hiện mật khẩu"
            }
            title={
              showCurrentPassword
                ? "Ẩn mật khẩu"
                : "Hiện mật khẩu"
            }
            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              text-[rgb(var(--color-muted))]
              transition
              hover:text-[rgb(var(--color-text))]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {showCurrentPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3l18 18"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.58 10.58a2 2 0 002.84 2.84"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.88 5.09A10.94 10.94 0 0112 4.88c5.23 0 8.87 4.12 9.93 7.12a11.8 11.8 0 01-3.01 4.55"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.61 6.61A11.8 11.8 0 002.07 12C3.13 15 6.77 19.12 12 19.12c1.61 0 3.05-.35 4.3-.91"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.07 12C3.13 9 6.77 4.88 12 4.88S20.87 9 21.93 12C20.87 15 17.23 19.12 12 19.12S3.13 15 2.07 12z"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    )}

    {/* =========================
        NEW PASSWORD
    ========================== */}
    <div>
      <label className="mb-1 block text-sm font-medium text-[rgb(var(--color-text))]">
        Mật khẩu mới
      </label>

      <div className="relative">
        <input
          type={
            showNewPassword
              ? "text"
              : "password"
          }
          value={form.newPassword ?? ""}
          onChange={e =>
            updateField(
              "newPassword",
              e.target.value
            )
          }
          disabled={isSaving}
          className="
            w-full
            rounded-md
            border
            border-[rgb(var(--color-border))]
            bg-[rgb(var(--color-surface))]
            px-3
            py-2
            pr-10
            text-[rgb(var(--color-text))]
            outline-none
            transition
            focus:border-[rgb(var(--color-brand))]
          "
        />

        <button
          type="button"
          onClick={() =>
            setShowNewPassword(
              prev => !prev
            )
          }
          disabled={isSaving}
          aria-label={
            showNewPassword
              ? "Ẩn mật khẩu"
              : "Hiện mật khẩu"
          }
          title={
            showNewPassword
              ? "Ẩn mật khẩu"
              : "Hiện mật khẩu"
          }
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-[rgb(var(--color-muted))]
            transition
            hover:text-[rgb(var(--color-text))]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {showNewPassword ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3l18 18"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.58 10.58a2 2 0 002.84 2.84"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.88 5.09A10.94 10.94 0 0112 4.88c5.23 0 8.87 4.12 9.93 7.12a11.8 11.8 0 01-3.01 4.55"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.61 6.61A11.8 11.8 0 002.07 12C3.13 15 6.77 19.12 12 19.12c1.61 0 3.05-.35 4.3-.91"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.07 12C3.13 9 6.77 4.88 12 4.88S20.87 9 21.93 12C20.87 15 17.23 19.12 12 19.12S3.13 15 2.07 12z"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
              />
            </svg>
          )}
        </button>
      </div>

      {errors.newPassword && (
        <p className="mt-1 text-sm text-red-500">
          {errors.newPassword}
        </p>
      )}
    </div>

    {/* =========================
        CONFIRM PASSWORD
    ========================== */}
    <div>
      <label className="mb-1 block text-sm font-medium text-[rgb(var(--color-text))]">
        Xác nhận mật khẩu
      </label>

      <div className="relative">
        <input
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          value={form.confirmPassword ?? ""}
          onChange={e =>
            updateField(
              "confirmPassword",
              e.target.value
            )
          }
          disabled={isSaving}
          className="
            w-full
            rounded-md
            border
            border-[rgb(var(--color-border))]
            bg-[rgb(var(--color-surface))]
            px-3
            py-2
            pr-10
            text-[rgb(var(--color-text))]
            outline-none
            transition
            focus:border-[rgb(var(--color-brand))]
          "
        />

        <button
          type="button"
          onClick={() =>
            setShowConfirmPassword(
              prev => !prev
            )
          }
          disabled={isSaving}
          aria-label={
            showConfirmPassword
              ? "Ẩn mật khẩu"
              : "Hiện mật khẩu"
          }
          title={
            showConfirmPassword
              ? "Ẩn mật khẩu"
              : "Hiện mật khẩu"
          }
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-[rgb(var(--color-muted))]
            transition
            hover:text-[rgb(var(--color-text))]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {showConfirmPassword ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3l18 18"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.58 10.58a2 2 0 002.84 2.84"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.88 5.09A10.94 10.94 0 0112 4.88c5.23 0 8.87 4.12 9.93 7.12a11.8 11.8 0 01-3.01 4.55"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.61 6.61A11.8 11.8 0 002.07 12C3.13 15 6.77 19.12 12 19.12c1.61 0 3.05-.35 4.3-.91"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.07 12C3.13 9 6.77 4.88 12 4.88S20.87 9 21.93 12C20.87 15 17.23 19.12 12 19.12S3.13 15 2.07 12z"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
              />
            </svg>
          )}
        </button>
      </div>

      {errors.confirmPassword && (
        <p className="mt-1 text-sm text-red-500">
          {errors.confirmPassword}
        </p>
      )}
    </div>

    {/* =========================
        SAVE
    ========================== */}
    <button
      type="submit"
      disabled={isSaving}
      className="
        mt-5
        flex
        w-full
        items-center
        justify-center
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
        disabled:opacity-50
      "
    >
      {isSaving ? "ĐANG LƯU..." : "LƯU"}
    </button>
  </form>
);
}