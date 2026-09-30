"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CompanyDto,
  DepartmentDto,
} from "@/types/employee";

import {
  UserOrganizationDto,
} from "@/types/organization";

import {
  AssignmentType,
} from "@/types/organization";
import { departmentApi } from "../service/departmentApi";
import ManagerSearch, { ManagerOption } from "./ManagerSearch";

interface AssignmentDialogProps {
  open: boolean;

  userId: string;

  model: UserOrganizationDto;

  isEdit: boolean;

  hasPrimaryAssignment: boolean;

  companies: CompanyDto[];

  isDirector: boolean;

  onClose: () => void;

  onSubmit: (
    value: UserOrganizationDto
  ) => void | Promise<void>;
}

interface FormErrors {
  assignmentType?: string;
  companyId?: string;
  departmentId?: string;
  managerId?: string;
  employeeCode?: string;
  jobTitle?:string;
}

export default function AssignmentDialog({
  open,
  userId,
  model,
  isEdit,
  hasPrimaryAssignment,
  companies,
  isDirector,
  onClose,
  onSubmit,
}: AssignmentDialogProps) {
  const [form, setForm] =
    useState<UserOrganizationDto>(model);

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [departmentOptions, setDepartmentOptions] =
    useState<DepartmentDto[]>([]);

const initialManager: ManagerOption | null =
  form.managerID
    ? {
        id: form.managerID,
        fullName: form.managerName ?? "",
        jobTitle: form.managerJobTitle ?? "",
        departmentName:
          form.managerDepartmentName ?? "",
        companyName:
          form.managerCompanyName ?? "",
        employeeCode:
          form.employeeCode,
        organizationId:
          form.managerOrganizationId
      }
    : null;

  const loadDepartments = useCallback(
    async (companyId?: number) => {
      if (!companyId) {
        setDepartmentOptions([]);
        return;
      }

      try {
        const result =
          await departmentApi.getAll(companyId);

        setDepartmentOptions(result ?? []);
      } catch (error) {
        console.error(
          "Load departments failed:",
          error
        );

        setDepartmentOptions([]);
      }
    },
    []
  );

  /**
   * ==========================================
   * Initialize form
   * ==========================================
   */
useEffect(() => {
  if (!open) return;

  const nextForm: UserOrganizationDto = {
    ...model,
    userId,
    assignmentType:
      model.assignmentType ??
      (hasPrimaryAssignment
        ? AssignmentType.Concurrent
        : AssignmentType.Primary),
  };

  setForm(nextForm);
  setErrors({});
  setIsSubmitting(false);

  if (nextForm.companyId) {
    loadDepartments(nextForm.companyId);
  } else {
    setDepartmentOptions([]);
  }
}, [
  open,
  model,
  userId,
  hasPrimaryAssignment,
  loadDepartments,
]);
  /**
   * ==========================================
   * Update form field
   * ==========================================
   */
  const updateField = <
    K extends keyof UserOrganizationDto
  >(
    field: K,
    value: UserOrganizationDto[K]
  ) => {

    setForm(prev => ({
      ...prev,
      [field]: value,
    }));

    setErrors(prev => ({
      ...prev,
      [field]: undefined,
    }));
  };

  /**
   * ==========================================
   * Validation
   * ==========================================
   */
  const validate = (): boolean => {

    const nextErrors: FormErrors = {};

    /**
     * Assignment type
     */
    if (
      form.assignmentType === undefined ||
      Number.isNaN(form.assignmentType)
    ) {
      nextErrors.assignmentType =
        "Vui lòng chọn loại đơn vị công tác.";
    }

    if (!form.employeeCode?.trim()) {
      nextErrors.employeeCode =
        "Vui lòng nhập mã nhân viên.";
    }

    if (!form.companyId) {
      nextErrors.companyId =
        "Vui lòng chọn công ty.";
    }

    if (!form.departmentId) {
      nextErrors.departmentId =
        "Vui lòng chọn phòng ban.";
    }

    if (!form.jobTitle?.trim()) {
      nextErrors.jobTitle =
        "Vui lòng nhập chức danh.";
    }

    if (!isDirector && !form.managerID) {
      nextErrors.managerId =
        "Vui lòng chọn quản lý trực tiếp.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  /**
   * ==========================================
   * Submit
   * ==========================================
   */
  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result: UserOrganizationDto = {
        ...form,
        userId,

        isActive:
          form.isActive ?? true,

        isDeleted:
          form.isDeleted ?? false,
      };

      await onSubmit(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManagerChange = (
    manager?: ManagerOption
  ) => {
    setForm(prev => ({
      ...prev,

      managerID: manager?.id,

      managerName:
        manager?.fullName,

      managerJobTitle:
        manager?.jobTitle,

      managerDepartmentName:
        manager?.departmentName,

      managerCompanyName:
        manager?.companyName,

      managerOrganizationId:
        manager?.organizationId,
    }));

    setErrors(prev => ({
      ...prev,
      managerId: undefined,
    }));
  };

  const handleCompanyChanged = async (
    company?: CompanyDto
  ) => {
    setForm(prev => ({
      ...prev,
      companyId: company?.id,
      companyName: company?.companyName,

      // Khi đổi công ty thì reset phòng ban
      departmentId: undefined,
      departmentName: undefined,

      // Manager cũ không còn hợp lệ
      managerID: undefined,
      managerName: undefined,
      managerJobTitle: undefined,
      managerDepartmentName: undefined,
      managerCompanyName: undefined,
      managerOrganizationId: undefined,
    }));

    // Clear lỗi company
    setErrors(prev => ({
      ...prev,
      companyId: undefined,
      departmentId: undefined,
      managerId: undefined,
    }));

    if (!company?.id) {
      setDepartmentOptions([]);
      return;
    }

    try {
      await loadDepartments(company.id);
    } catch (error) {
      console.error("Load departments error:", error);

      setDepartmentOptions([]);

      setErrors(prev => ({
        ...prev,
        departmentId:
          "Không thể tải danh sách phòng ban.",
      }));
    }
  };

  const handleDepartmentChange = (
    department?: DepartmentDto
  ) => {
    setForm(prev => ({
      ...prev,
      departmentId: department?.id,
      departmentName: department?.name,

      // Đổi phòng ban thì manager cũ không còn hợp lệ
      managerID: undefined,
      managerName: undefined,
      managerJobTitle: undefined,
      managerDepartmentName: undefined,
      managerCompanyName: undefined,
      managerOrganizationId: undefined,
    }));

    setErrors(prev => ({
      ...prev,
      departmentId: undefined,
      managerId: undefined,
    }));
  };

  /**
   * ==========================================
   * Close
   * ==========================================
   */
  const handleClose = () => {

    if (isSubmitting) {
      return;
    }

    setErrors({});

    onClose();
  };

  /**
   * ==========================================
   * Render
   * ==========================================
   */
if (!open) {
  return null;
}

return (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      overflow-y-auto
      bg-black/40
      p-4
    "
  >
    <div
      className="
        relative
        w-full
        max-w-[720px]
        overflow-visible
        rounded-md
        bg-[rgb(var(--color-surface))]
        text-[rgb(var(--color-text))]
        shadow-[var(--shadow-card)]
      "
    >
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="px-6 pt-5 pb-3">
        <h2
          className="
            text-[20px]
            font-semibold
            leading-7
            text-[rgb(var(--color-text))]
          "
        >
          {isEdit
            ? "Cập nhật đơn vị công tác"
            : "Thêm đơn vị công tác"}
        </h2>
      </div>

      {/* =====================================================
          BODY
      ===================================================== */}
      <div className="px-6 pb-5">
        <div className="space-y-3">

          {/* =================================================
              ROW 1
          ================================================= */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            {/* -----------------------------------------------
                ASSIGNMENT TYPE
            ----------------------------------------------- */}
            <div>
              <label
                htmlFor="assignmentType"
                className="
                  mb-1
                  block
                  text-[12px]
                  font-medium
                  text-[rgb(var(--color-muted))]
                "
              >
                Loại đơn vị công tác
                <span className="ml-0.5 text-red-500">*</span>
              </label>

              {isEdit ? (
                /* EDIT: READONLY */
                <input
                  id="assignmentType"
                  type="text"
                  value={
                    form.assignmentType === AssignmentType.Primary
                      ? "Chính"
                      : form.assignmentType === AssignmentType.Concurrent
                        ? "Kiêm nhiệm"
                        : ""
                  }
                  readOnly
                  className="
                    h-9
                    w-full
                    border-0
                    border-b
                    border-[rgb(var(--color-border))]
                    bg-transparent
                    px-0
                    text-sm
                    text-[rgb(var(--color-text))]
                    outline-none
                  "
                />
              ) : (
                /* ADD: EDITABLE */
                <div className="relative">
                  <select
                    id="assignmentType"
                    value={
                      form.assignmentType !== undefined &&
                      !Number.isNaN(form.assignmentType)
                        ? String(form.assignmentType)
                        : ""
                    }
                    onChange={event => {
                      const value = event.target.value;

                      updateField(
                        "assignmentType",
                        value ? Number(value) : Number.NaN
                      );
                    }}
                    className={`
                      h-9
                      w-full
                      appearance-none
                      rounded-none
                      border-0
                      border-b
                      bg-transparent
                      px-0
                      pr-7
                      text-sm
                      text-[rgb(var(--color-text))]
                      outline-none
                      transition
                      focus:border-[rgb(var(--color-brand))]
                      focus:ring-0
                      ${
                        errors.assignmentType
                          ? "border-red-500"
                          : "border-[rgb(var(--color-border))]"
                      }
                    `}
                  >
                    <option value="">
                      -- Chọn loại --
                    </option>

                    <option
                      value={AssignmentType.Primary}
                      disabled={hasPrimaryAssignment}
                    >
                      ⭐ Chính
                    </option>

                    <option value={AssignmentType.Concurrent}>
                      ● Kiêm nhiệm
                    </option>
                  </select>

                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-1
                      top-1/2
                      -translate-y-1/2
                      text-[rgb(var(--color-muted))]
                    "
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </div>
              )}

              {errors.assignmentType && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.assignmentType}
                </p>
              )}
            </div>

            {/* -----------------------------------------------
                EMPLOYEE CODE
            ----------------------------------------------- */}
            <div>
              <label
                htmlFor="employeeCode"
                className="
                  mb-1
                  block
                  text-[12px]
                  font-medium
                  text-[rgb(var(--color-muted))]
                "
              >
                Mã NV
                <span className="ml-0.5 text-red-500">*</span>
              </label>

              <input
                id="employeeCode"
                type="text"
                value={form.employeeCode ?? ""}
                onChange={event =>
                  updateField(
                    "employeeCode",
                    event.target.value
                  )
                }
                className={`
                  h-9
                  w-full
                  border-0
                  border-b
                  bg-transparent
                  px-0
                  text-sm
                  text-[rgb(var(--color-text))]
                  outline-none
                  transition
                  focus:border-[rgb(var(--color-brand))]
                  focus:ring-0
                  ${
                    errors.employeeCode
                      ? "border-red-500"
                      : "border-[rgb(var(--color-border))]"
                  }
                `}
              />

              {errors.employeeCode && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.employeeCode}
                </p>
              )}
            </div>
          </div>

          {/* =================================================
              ROW 2
          ================================================= */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            {/* -----------------------------------------------
                COMPANY
            ----------------------------------------------- */}
            <div>
              <label
                htmlFor="companyId"
                className="
                  mb-1
                  block
                  text-[12px]
                  font-medium
                  text-[rgb(var(--color-muted))]
                "
              >
                Công ty
                <span className="ml-0.5 text-red-500">*</span>
              </label>

              {isEdit ? (
                /* EDIT: READONLY */
                <input
                  id="companyId"
                  type="text"
                  value={form.companyName ?? ""}
                  readOnly
                  className="
                    h-9
                    w-full
                    border-0
                    border-b
                    border-[rgb(var(--color-border))]
                    bg-transparent
                    px-0
                    text-sm
                    text-[rgb(var(--color-text))]
                    outline-none
                  "
                />
              ) : (
                /* ADD: EDITABLE */
                <div className="relative">
                  <select
                    id="companyId"
                    value={
                      form.companyId !== undefined &&
                      form.companyId !== null
                        ? String(form.companyId)
                        : ""
                    }
                    onChange={event => {
                      const value = event.target.value;

                      const companyId = value
                        ? Number(value)
                        : undefined;

                      const company = companies.find(
                        item => item.id === companyId
                      );

                      handleCompanyChanged(company);
                    }}
                    className={`
                      h-9
                      w-full
                      appearance-none
                      rounded-none
                      border-0
                      border-b
                      bg-transparent
                      px-0
                      pr-7
                      text-sm
                      text-[rgb(var(--color-text))]
                      outline-none
                      transition
                      focus:border-[rgb(var(--color-brand))]
                      focus:ring-0
                      ${
                        errors.companyId
                          ? "border-red-500"
                          : "border-[rgb(var(--color-border))]"
                      }
                    `}
                  >
                    <option value="">
                      -- Chọn công ty --
                    </option>

                    {companies.map(company => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.companyName}
                      </option>
                    ))}
                  </select>

                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-1
                      top-1/2
                      -translate-y-1/2
                      text-[rgb(var(--color-muted))]
                    "
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </div>
              )}

              {errors.companyId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.companyId}
                </p>
              )}
            </div>

            {/* -----------------------------------------------
                DEPARTMENT
            ----------------------------------------------- */}
            <div>
              <label
                htmlFor="departmentId"
                className="
                  mb-1
                  block
                  text-[12px]
                  font-medium
                  text-[rgb(var(--color-muted))]
                "
              >
                Phòng ban
                <span className="ml-0.5 text-red-500">*</span>
              </label>

              {isEdit ? (
                /* EDIT: READONLY */
                <input
                  id="departmentId"
                  type="text"
                  value={form.departmentName ?? ""}
                  readOnly
                  className="
                    h-9
                    w-full
                    border-0
                    border-b
                    border-[rgb(var(--color-border))]
                    bg-transparent
                    px-0
                    text-sm
                    text-[rgb(var(--color-text))]
                    outline-none
                  "
                />
              ) : (
                /* ADD: EDITABLE */
                <div className="relative">
                  <select
                    id="departmentId"
                    value={
                      form.departmentId !== undefined &&
                      form.departmentId !== null
                        ? String(form.departmentId)
                        : ""
                    }
                    disabled={!form.companyId}
                    onChange={event => {
                      const value = event.target.value;

                      const departmentId = value
                        ? Number(value)
                        : undefined;

                      const department =
                        departmentOptions.find(
                          item => item.id === departmentId
                        );

                      handleDepartmentChange(department);
                    }}
                    className={`
                      h-9
                      w-full
                      appearance-none
                      rounded-none
                      border-0
                      border-b
                      bg-transparent
                      px-0
                      pr-7
                      text-sm
                      text-[rgb(var(--color-text))]
                      outline-none
                      transition
                      focus:border-[rgb(var(--color-brand))]
                      focus:ring-0
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      ${
                        errors.departmentId
                          ? "border-red-500"
                          : "border-[rgb(var(--color-border))]"
                      }
                    `}
                  >
                    <option value="">
                      {!form.companyId
                        ? "-- Chọn công ty trước --"
                        : "-- Chọn phòng ban --"}
                    </option>

                    {departmentOptions.map(department => (
                      <option
                        key={department.id}
                        value={department.id}
                      >
                        {department.name}
                      </option>
                    ))}
                  </select>

                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-1
                      top-1/2
                      -translate-y-1/2
                      text-[rgb(var(--color-muted))]
                    "
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </div>
              )}

              {errors.departmentId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.departmentId}
                </p>
              )}
            </div>
          </div>

          {/* =================================================
              JOB TITLE
          ================================================= */}
          <div>
            <label
              htmlFor="jobTitle"
              className="
                mb-1
                block
                text-[12px]
                font-medium
                text-[rgb(var(--color-muted))]
              "
            >
              Chức danh
              <span className="ml-0.5 text-red-500">*</span>
            </label>

            {isEdit ? (
              /* EDIT: READONLY */
              <input
                id="jobTitle"
                type="text"
                value={form.jobTitle ?? ""}
                readOnly
                className="
                  h-9
                  w-full
                  border-0
                  border-b
                  border-[rgb(var(--color-border))]
                  bg-transparent
                  px-0
                  text-sm
                  text-[rgb(var(--color-text))]
                  outline-none
                "
              />
            ) : (
              /* ADD: EDITABLE */
              <input
                id="jobTitle"
                type="text"
                value={form.jobTitle ?? ""}
                onChange={event =>
                  updateField(
                    "jobTitle",
                    event.target.value
                  )
                }
                className={`
                  h-9
                  w-full
                  border-0
                  border-b
                  bg-transparent
                  px-0
                  text-sm
                  text-[rgb(var(--color-text))]
                  outline-none
                  transition
                  focus:border-[rgb(var(--color-brand))]
                  focus:ring-0
                  ${
                    errors.jobTitle
                      ? "border-red-500"
                      : "border-[rgb(var(--color-border))]"
                  }
                `}
              />
            )}

            {errors.jobTitle && (
              <p className="mt-1 text-xs text-red-500">
                {errors.jobTitle}
              </p>
            )}
          </div>

          {/* =================================================
              MANAGER
          ================================================= */}
          {!isDirector && (
            <div className="pt-1">
              <div
                className={`
                  rounded-md
                  border
                  bg-[rgb(var(--color-surface))]
                  ${
                    errors.managerId
                      ? "border-red-500"
                      : "border-[rgb(var(--color-border))]"
                  }
                `}
              >
                {/* Floating label */}
                <div
                  className="
                    -mb-3
                    ml-3
                    w-fit
                    bg-[rgb(var(--color-surface))]
                    px-1
                  "
                >
                  <label
                    htmlFor="managerId"
                    className="
                      text-[12px]
                      font-medium
                      text-[rgb(var(--color-muted))]
                    "
                  >
                    Quản lý trực tiếp
                    <span className="ml-0.5 text-red-500">
                      *
                    </span>
                  </label>
                </div>

                <div className="px-3 pb-1 pt-2">
                  <ManagerSearch
                    userId={userId}
                    value={form.managerID}
                    initialManager={initialManager}
                    disabled={!form.departmentId}
                    onChange={handleManagerChange}
                  />
                </div>
              </div>

              {errors.managerId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.managerId}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <div
        className="
          flex
          items-center
          justify-end
          gap-3
          px-4
          pb-4
          pt-1
        "
      >
        {/* HỦY */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="
            rounded-md
            px-4
            py-2
            text-sm
            font-semibold
            uppercase
            text-[rgb(var(--color-text))]
            transition
            hover:bg-[rgb(var(--color-page))]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          Hủy
        </button>

        {/* LƯU */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="
            rounded-md
            bg-[rgb(var(--color-brand))]
            px-4
            py-2
            text-sm
            font-semibold
            uppercase
            text-[rgb(var(--color-on-brand))]
            shadow-sm
            transition
            hover:bg-[rgb(var(--color-brand-strong))]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {isSubmitting
            ? "Đang xử lý..."
            : "Lưu nháp thông tin"}
        </button>
      </div>
    </div>
  </div>
);
}