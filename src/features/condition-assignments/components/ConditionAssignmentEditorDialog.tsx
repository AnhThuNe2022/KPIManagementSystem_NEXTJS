"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  AppForm,
  AppRadioList,
  AppSelect,
  AppSwitch,
  AppTextArea,
  ConditionStatusTag,
  FormDialog,
  ScopeTypeBadge,
  useAppToast,
  type SelectOption,
} from "@/components/ds";
import {
  AssignmentScopeType,
  CONDITION_STATUS_REGISTRY,
  type ConditionStatus,
} from "@/design-system/registries";
import type { CompanyDto } from "@/features/company/types";
import { departmentApi } from "@/features/department/services/departmentApi";
import type { DepartmentDto } from "@/features/department/types";
import { getErrorMessage, isAbortError } from "@/lib/http/request";
import { conditionAssignmentApi } from "../services/conditionAssignmentApi";
import type {
  ConditionAssignmentDto,
  ConditionAssignmentUserOption,
} from "../types";

interface FormState {
  userId: string;
  statusCondition: string;
  scopeType: number;
  companyId: string;
  departmentId: string;
  isActive: boolean;
  description: string;
}

export function ConditionAssignmentEditorDialog({
  isOpen,
  onOpenChange,
  editingItem,
  users,
  companies,
  allowedConditions,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ConditionAssignmentDto | null;
  users: ConditionAssignmentUserOption[];
  companies: CompanyDto[];
  allowedConditions: ConditionStatus[];
  onSaved: () => void;
}) {
  const showToast = useAppToast();

  const [form, setForm] = useState<FormState>({
    userId: "",
    statusCondition: "",
    scopeType: AssignmentScopeType.Company,
    companyId: "",
    departmentId: "",
    isActive: true,
    description: "",
  });
  const [initialSnapshot, setInitialSnapshot] = useState<FormState | null>(null);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});

    if (editingItem) {
      const isDeptScope = Number(editingItem.scopeType) === AssignmentScopeType.Department;
      const next: FormState = {
        userId: editingItem.userId,
        statusCondition: String(editingItem.statusCondition ?? ""),
        scopeType: isDeptScope ? AssignmentScopeType.Department : AssignmentScopeType.Company,
        companyId: editingItem.companyId
          ? String(editingItem.companyId)
          : !isDeptScope && editingItem.idValue
            ? String(editingItem.idValue)
            : "",
        departmentId: isDeptScope
          ? String(editingItem.departmentId ?? editingItem.idValue ?? "")
          : "",
        isActive: Boolean(editingItem.isActive),
        description: editingItem.description ?? "",
      };
      setForm(next);
      setInitialSnapshot(next);

      // Reverse-lookup company when editing a department-scoped record whose companyId was missing
      if (isDeptScope && !next.companyId && next.departmentId) {
        const ctrl = new AbortController();
        departmentApi
          .list("", "", { byUnitHrCompile: false, signal: ctrl.signal })
          .then((allDepts) => {
            if (ctrl.signal.aborted) return;
            const found = allDepts.find((d) => String(d.id) === next.departmentId);
            if (found?.companyId) {
              const patched = { ...next, companyId: String(found.companyId) };
              setForm(patched);
              setInitialSnapshot(patched);
            }
          })
          .catch(() => {});
        return () => ctrl.abort();
      }
      return;
    }

    const defaultState: FormState = {
      userId: "",
      statusCondition: allowedConditions[0] ?? "",
      scopeType: AssignmentScopeType.Company,
      companyId: "",
      departmentId: "",
      isActive: true,
      description: "",
    };
    setForm(defaultState);
    setInitialSnapshot(defaultState);
  }, [allowedConditions, editingItem, isOpen]);

  // Load departments whenever scopeType === Department and companyId is selected
  useEffect(() => {
    if (!isOpen || form.scopeType !== AssignmentScopeType.Department || !form.companyId) {
      setDepartments([]);
      return;
    }
    const ctrl = new AbortController();
    setIsLoadingDepts(true);
    departmentApi
      .getAll(form.companyId, { signal: ctrl.signal })
      .then((list) => {
        if (!ctrl.signal.aborted) setDepartments(list);
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) setDepartments([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoadingDepts(false);
      });
    return () => ctrl.abort();
  }, [form.companyId, form.scopeType, isOpen]);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return JSON.stringify(form) !== JSON.stringify(initialSnapshot);
  }, [form, initialSnapshot]);

  const userOptions = useMemo<SelectOption[]>(() => {
    const list = users.map((u) => ({
      value: u.id,
      label: u.systemCode ? `${u.fullName} (${u.systemCode})` : u.fullName,
    }));
    if (editingItem && !users.some((u) => u.id === editingItem.userId)) {
      list.unshift({
        value: editingItem.userId,
        label: editingItem.fullName
          ? `${editingItem.fullName}${editingItem.systemCodeUser ? ` (${editingItem.systemCodeUser})` : ""}`
          : editingItem.userId,
      });
    }
    return list;
  }, [editingItem, users]);

  const conditionOptions = useMemo<SelectOption[]>(() => {
    const keys = new Set<string>(allowedConditions);
    if (editingItem?.statusCondition) keys.add(String(editingItem.statusCondition));
    return Array.from(keys).map((key) => ({
      value: key,
      label:
        CONDITION_STATUS_REGISTRY[key as ConditionStatus]?.label ??
        editingItem?.conditionName ??
        key,
    }));
  }, [allowedConditions, editingItem]);

  const selectedUser = users.find((u) => u.id === form.userId);
  const selectedCompany = companies.find((c) => String(c.id) === form.companyId);
  const selectedDept = departments.find((d) => String(d.id) === form.departmentId);

  const handleSubmit = async () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.userId) nextErrors.userId = "Vui lòng chọn nhân sự.";
    if (!form.statusCondition) nextErrors.statusCondition = "Vui lòng chọn điều kiện phân quyền.";
    if (!form.companyId) nextErrors.companyId = "Vui lòng chọn công ty.";
    if (form.scopeType === AssignmentScopeType.Department && !form.departmentId) {
      nextErrors.departmentId = "Vui lòng chọn phòng ban.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const idValue =
      form.scopeType === AssignmentScopeType.Department ? form.departmentId : form.companyId;

    setIsSubmitting(true);
    try {
      await conditionAssignmentApi.save({
        id: editingItem?.id,
        userId: form.userId,
        fullName: selectedUser?.fullName ?? editingItem?.fullName ?? "",
        systemCodeUser: selectedUser?.systemCode ?? editingItem?.systemCodeUser ?? "",
        statusCondition: form.statusCondition,
        scopeType: form.scopeType,
        idValue,
        isActive: form.isActive,
        description: form.description,
      });
      showToast(
        "success",
        editingItem
          ? "Đã cập nhật phân quyền điều kiện thành công."
          : "Đã tạo phân quyền điều kiện mới thành công.",
      );
      onSaved();
      onOpenChange(false);
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể lưu phân quyền điều kiện."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={editingItem ? "Cập nhật phân quyền điều kiện" : "Thêm phân quyền điều kiện"}
      subtitle="Gán vai trò phê duyệt hoặc tổng hợp theo phạm vi Công ty hoặc Phòng ban."
      width={620}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      submitLabel={editingItem ? "Cập nhật" : "Tạo phân quyền"}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4">
        {/* Live flow preview */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-primary">
            {selectedUser?.fullName || editingItem?.fullName || "Chọn nhân sự"}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-secondary" />
          <ConditionStatusTag statusCondition={form.statusCondition} />
          <ArrowRight className="h-3.5 w-3.5 text-secondary" />
          <ScopeTypeBadge scopeType={form.scopeType} />
          <span className="text-secondary">
            {form.scopeType === AssignmentScopeType.Department
              ? selectedDept?.name || editingItem?.departmentName || "Chưa chọn phòng ban"
              : selectedCompany?.companyName || editingItem?.companyName || "Chưa chọn công ty"}
          </span>
        </div>

        <AppForm>
          <AppSelect
            label="Nhân sự được gán"
            value={form.userId}
            onChange={(userId) => {
              setForm((p) => ({ ...p, userId }));
              setErrors((e) => ({ ...e, userId: undefined }));
            }}
            options={userOptions}
            placeholder="Tìm và chọn nhân sự..."
            isRequired
            hasClear={false}
            error={errors.userId}
          />

          <AppSelect
            label="Điều kiện / Vai trò nghiệp vụ"
            value={form.statusCondition}
            onChange={(statusCondition) => {
              setForm((p) => ({ ...p, statusCondition }));
              setErrors((e) => ({ ...e, statusCondition: undefined }));
            }}
            options={conditionOptions}
            placeholder="Chọn điều kiện..."
            isRequired
            hasClear={false}
            error={errors.statusCondition}
          />

          <AppRadioList
            label="Phạm vi áp dụng"
            value={String(form.scopeType)}
            onChange={(val) => {
              const scopeType =
                val === String(AssignmentScopeType.Department)
                  ? AssignmentScopeType.Department
                  : AssignmentScopeType.Company;
              setForm((p) => ({ ...p, scopeType, departmentId: "" }));
              setErrors((e) => ({ ...e, departmentId: undefined }));
            }}
            options={[
              {
                value: String(AssignmentScopeType.Company),
                label: "Toàn công ty",
                description: "Áp dụng cho toàn bộ nhân sự trong công ty được chọn",
              },
              {
                value: String(AssignmentScopeType.Department),
                label: "Theo phòng ban",
                description: "Giới hạn trong một phòng ban cụ thể của công ty",
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AppSelect
              label="Công ty"
              value={form.companyId}
              onChange={(companyId) => {
                setForm((p) => ({ ...p, companyId, departmentId: "" }));
                setErrors((e) => ({ ...e, companyId: undefined, departmentId: undefined }));
              }}
              options={companies.map((c) => ({ value: String(c.id), label: c.companyName }))}
              placeholder="Chọn công ty..."
              isRequired
              hasClear={false}
              error={errors.companyId}
            />

            {form.scopeType === AssignmentScopeType.Department ? (
              <AppSelect
                label="Phòng ban"
                value={form.departmentId}
                onChange={(departmentId) => {
                  setForm((p) => ({ ...p, departmentId }));
                  setErrors((e) => ({ ...e, departmentId: undefined }));
                }}
                options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                placeholder={
                  !form.companyId
                    ? "Chọn công ty trước"
                    : isLoadingDepts
                      ? "Đang tải phòng ban..."
                      : "Chọn phòng ban..."
                }
                isDisabled={!form.companyId || isLoadingDepts}
                isRequired
                hasClear={false}
                error={errors.departmentId}
              />
            ) : null}
          </div>

          <AppTextArea
            label="Mô tả / Ghi chú"
            value={form.description}
            onChange={(description) => setForm((p) => ({ ...p, description }))}
            placeholder="Ghi chú phạm vi phụ trách (không bắt buộc)..."
            rows={3}
          />

          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <AppSwitch
              label="Kích hoạt phân quyền"
              description="Tắt nếu muốn tạm ngừng hiệu lực phân quyền này mà không cần xóa."
              value={form.isActive}
              onChange={(isActive) => setForm((p) => ({ ...p, isActive }))}
            />
          </div>
        </AppForm>
      </div>
    </FormDialog>
  );
}
