"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { SearchableItem } from "@astryxdesign/core/Typeahead";
import {
  AppAsyncCombobox,
  AppForm,
  AppSelect,
  AppTextInput,
  FormDialog,
  type SelectOption,
} from "@/components/ds";
import { AssignmentType } from "@/design-system/registries";
import type { CompanyDto } from "@/features/company/types";
import { departmentApi } from "@/features/department/services/departmentApi";
import type { DepartmentDto } from "@/features/department/types";
import { isAbortError } from "@/lib/http/request";
import { userOrganizationApi } from "../services/userOrganizationApi";
import type { UserOrganizationDto } from "../types";

interface ManagerAux {
  userId: string;
  fullName: string;
  jobTitle?: string | null;
  departmentName?: string | null;
  companyName?: string | null;
  organizationId?: number | null;
}

interface FormErrors {
  assignmentType?: string;
  employeeCode?: string;
  companyId?: string;
  departmentId?: string;
  jobTitle?: string;
  managerId?: string;
}

export function AssignmentFormDialog({
  isOpen,
  onOpenChange,
  userId,
  model,
  hasPrimaryAssignment,
  companies,
  isDirector,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  model: UserOrganizationDto | null;
  hasPrimaryAssignment: boolean;
  companies: CompanyDto[];
  isDirector: boolean;
  onSubmit: (value: UserOrganizationDto) => void;
}) {
  // Saved DB records lock structural fields; unsaved drafts remain fully editable
  const isSavedRecord = Boolean(model?.id && model.id > 0);

  const [form, setForm] = useState<UserOrganizationDto | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen || !model) return;
    const next: UserOrganizationDto = {
      ...model,
      userId,
      assignmentType:
        model.assignmentType ||
        (hasPrimaryAssignment ? AssignmentType.Concurrent : AssignmentType.Primary),
    };
    setForm(next);
    setInitialSnapshot(JSON.stringify(next));
    setErrors({});
  }, [hasPrimaryAssignment, isOpen, model, userId]);

  useEffect(() => {
    if (!isOpen || !form?.companyId || isSavedRecord) {
      setDepartments([]);
      return;
    }
    const ctrl = new AbortController();
    setLoadingDepts(true);
    departmentApi
      .getAll(form.companyId, { signal: ctrl.signal })
      .then((list) => {
        if (!ctrl.signal.aborted) setDepartments(list);
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) {
          setDepartments([]);
          setErrors((e) => ({ ...e, departmentId: "Không thể tải danh sách phòng ban." }));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoadingDepts(false);
      });
    return () => ctrl.abort();
  }, [form?.companyId, isOpen, isSavedRecord]);

  const selectedManagerItem = useMemo<SearchableItem<ManagerAux> | null>(() => {
    if (!form?.managerID) return null;
    return {
      id: form.managerID,
      label: form.managerName || form.managerID,
      auxiliaryData: {
        userId: form.managerID,
        fullName: form.managerName || form.managerID,
        jobTitle: form.managerJobTitle,
        departmentName: form.managerDepartmentName,
        companyName: form.managerCompanyName,
        organizationId: form.managerOrganizationId,
      },
    };
  }, [
    form?.managerCompanyName,
    form?.managerDepartmentName,
    form?.managerID,
    form?.managerJobTitle,
    form?.managerName,
    form?.managerOrganizationId,
  ]);

  const handleManagerSearch = useCallback(
    async (query: string, signal: AbortSignal): Promise<SearchableItem<ManagerAux>[]> => {
      const results = await userOrganizationApi.searchManagers(userId, query, signal);
      return results
        .filter((item) => Boolean(item.userId))
        .map((item) => {
          const uid = String(item.userId);
          const name = item.userName?.trim() || uid;
          return {
            id: uid,
            label: name,
            auxiliaryData: {
              userId: uid,
              fullName: name,
              jobTitle: item.jobTitle,
              departmentName: item.departmentName,
              companyName: item.companyName,
              organizationId: item.id,
            },
          };
        });
    },
    [userId],
  );

  const assignmentTypeOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: String(AssignmentType.Primary),
        label: "Chính",
        disabled: hasPrimaryAssignment && form?.assignmentType !== AssignmentType.Primary,
      },
      {
        value: String(AssignmentType.Concurrent),
        label: "Kiêm nhiệm",
      },
    ],
    [form?.assignmentType, hasPrimaryAssignment],
  );

  const isDirty = Boolean(form && JSON.stringify(form) !== initialSnapshot);

  const handleSubmit = () => {
    if (!form) return;
    const nextErrors: FormErrors = {};
    if (!form.assignmentType) nextErrors.assignmentType = "Vui lòng chọn loại đơn vị công tác.";
    if (!form.employeeCode?.trim()) nextErrors.employeeCode = "Vui lòng nhập mã nhân viên.";
    if (!form.companyId) nextErrors.companyId = "Vui lòng chọn công ty.";
    if (!form.departmentId) nextErrors.departmentId = "Vui lòng chọn phòng ban.";
    if (!form.jobTitle?.trim()) nextErrors.jobTitle = "Vui lòng nhập chức danh.";
    if (!isDirector && !form.managerID) {
      nextErrors.managerId = "Vui lòng chọn quản lý trực tiếp.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      ...form,
      userId,
      employeeCode: form.employeeCode?.trim(),
      jobTitle: form.jobTitle?.trim(),
      isActive: form.isActive ?? true,
      isDeleted: form.isDeleted ?? false,
    });
  };

  return (
    <FormDialog
      isOpen={isOpen && Boolean(form)}
      onOpenChange={onOpenChange}
      title={model?.id || model?._localKey ? "Cập nhật đơn vị công tác" : "Thêm đơn vị công tác"}
      subtitle={
        isSavedRecord
          ? "Bản ghi đã lưu chỉ cho phép cập nhật Mã nhân viên và Quản lý trực tiếp."
          : "Điền đầy đủ thông tin đơn vị công tác và chọn quản lý trực tiếp."
      }
      width={640}
      isDirty={isDirty}
      submitLabel={model?.id || model?._localKey ? "Cập nhật bản nháp" : "Thêm vào danh sách"}
      onSubmit={handleSubmit}
    >
      {form ? (
        <AppForm>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isSavedRecord ? (
              <AppTextInput
                label="Loại đơn vị công tác"
                value={
                  form.assignmentType === AssignmentType.Primary ? "Chính" : "Kiêm nhiệm"
                }
                onChange={() => {}}
                isReadOnly
              />
            ) : (
              <AppSelect
                label="Loại đơn vị công tác"
                value={form.assignmentType ? String(form.assignmentType) : ""}
                onChange={(val) => {
                  setForm((p) => (p ? { ...p, assignmentType: Number(val) } : p));
                  setErrors((e) => ({ ...e, assignmentType: undefined }));
                }}
                options={assignmentTypeOptions}
                placeholder="Chọn loại..."
                isRequired
                hasClear={false}
                hasSearch={false}
                error={errors.assignmentType}
              />
            )}

            <AppTextInput
              label="Mã nhân viên"
              value={form.employeeCode ?? ""}
              onChange={(employeeCode) => {
                setForm((p) => (p ? { ...p, employeeCode } : p));
                setErrors((e) => ({ ...e, employeeCode: undefined }));
              }}
              placeholder="VD: DCG-00123"
              isRequired
              error={errors.employeeCode}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isSavedRecord ? (
              <AppTextInput
                label="Công ty"
                value={form.companyName ?? ""}
                onChange={() => {}}
                isReadOnly
              />
            ) : (
              <AppSelect
                label="Công ty"
                value={form.companyId ? String(form.companyId) : ""}
                onChange={(val) => {
                  const company = companies.find((c) => String(c.id) === val);
                  setForm((p) =>
                    p
                      ? {
                          ...p,
                          companyId: company?.id ?? 0,
                          companyName: company?.companyName ?? "",
                          companyCode: company?.companyCode ?? null,
                          departmentId: 0,
                          departmentName: "",
                          managerID: undefined,
                          managerName: undefined,
                          managerJobTitle: undefined,
                          managerDepartmentName: undefined,
                          managerCompanyName: undefined,
                          managerOrganizationId: undefined,
                        }
                      : p,
                  );
                  setErrors((e) => ({
                    ...e,
                    companyId: undefined,
                    departmentId: undefined,
                    managerId: undefined,
                  }));
                }}
                options={companies.map((c) => ({ value: String(c.id), label: c.companyName }))}
                placeholder="Chọn công ty..."
                isRequired
                hasClear={false}
                error={errors.companyId}
              />
            )}

            {isSavedRecord ? (
              <AppTextInput
                label="Phòng ban"
                value={form.departmentName ?? ""}
                onChange={() => {}}
                isReadOnly
              />
            ) : (
              <AppSelect
                label="Phòng ban"
                value={form.departmentId ? String(form.departmentId) : ""}
                onChange={(val) => {
                  const dept = departments.find((d) => String(d.id) === val);
                  setForm((p) =>
                    p
                      ? {
                          ...p,
                          departmentId: dept?.id ?? 0,
                          departmentName: dept?.name ?? "",
                          managerID: undefined,
                          managerName: undefined,
                          managerJobTitle: undefined,
                          managerDepartmentName: undefined,
                          managerCompanyName: undefined,
                          managerOrganizationId: undefined,
                        }
                      : p,
                  );
                  setErrors((e) => ({ ...e, departmentId: undefined, managerId: undefined }));
                }}
                options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                placeholder={
                  !form.companyId
                    ? "Chọn công ty trước"
                    : loadingDepts
                      ? "Đang tải phòng ban..."
                      : "Chọn phòng ban..."
                }
                isDisabled={!form.companyId || loadingDepts}
                isRequired
                hasClear={false}
                error={errors.departmentId}
              />
            )}
          </div>

          <AppTextInput
            label="Chức danh"
            value={form.jobTitle ?? ""}
            onChange={(jobTitle) => {
              setForm((p) => (p ? { ...p, jobTitle } : p));
              setErrors((e) => ({ ...e, jobTitle: undefined }));
            }}
            placeholder="VD: Chuyên viên Phân tích nghiệp vụ"
            isRequired
            isReadOnly={isSavedRecord}
            error={errors.jobTitle}
          />

          <AppAsyncCombobox<ManagerAux>
            label="Quản lý trực tiếp"
            value={selectedManagerItem}
            onChange={(item) => {
              const aux = item?.auxiliaryData;
              setForm((p) =>
                p
                  ? {
                      ...p,
                      managerID: aux?.userId,
                      managerName: aux?.fullName,
                      managerJobTitle: aux?.jobTitle,
                      managerDepartmentName: aux?.departmentName,
                      managerCompanyName: aux?.companyName,
                      managerOrganizationId: aux?.organizationId,
                    }
                  : p,
              );
              setErrors((e) => ({ ...e, managerId: undefined }));
            }}
            onSearch={handleManagerSearch}
            renderItem={(item) => {
              const aux = item.auxiliaryData;
              const sub = [aux?.jobTitle, aux?.departmentName, aux?.companyName]
                .filter(Boolean)
                .join(" · ");
              return (
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-medium text-primary">{item.label}</span>
                  {sub ? <span className="truncate text-xs text-secondary">{sub}</span> : null}
                </div>
              );
            }}
            placeholder="Nhập tên hoặc mã quản lý trực tiếp..."
            description={
              isDirector
                ? "Cấp Giám đốc không bắt buộc chọn quản lý trực tiếp."
                : "Tìm kiếm quản lý trực tiếp trong hệ thống."
            }
            isRequired={!isDirector}
            error={errors.managerId}
          />
        </AppForm>
      ) : null}
    </FormDialog>
  );
}
