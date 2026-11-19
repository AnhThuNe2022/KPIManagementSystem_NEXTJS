"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  LayersIcon,
  MixerHorizontalIcon,
  PersonIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import { departmentApi } from "@/features/department/services/departmentApi";
import { requestMessage } from "@/features/evaluation/evaluationDisplay";
import {
  conditionAssignmentApi,
  type ConditionAssigneeOption,
} from "../services/conditionAssignmentApi";
import {
  AssignmentScopeType,
  getConditionMeta,
  inferScopeType,
  type ConditionAssignmentDraft,
  type ConditionAssignmentDto,
} from "../types";
import { CompanyScopeIcon, DepartmentScopeIcon } from "./ScopeIcons";

type Props = {
  item?: ConditionAssignmentDto;
  conditionOptions: SearchableSelectOption[];
  companyOptions: SearchableSelectOption[];
  fallbackUsers: ConditionAssigneeOption[];
  onClose: () => void;
  onSaved: () => void;
};

function buildInitialDraft(
  item: ConditionAssignmentDto | undefined,
  companyOptions: SearchableSelectOption[],
): ConditionAssignmentDraft {
  if (!item) {
    return {
      statusCondition: "",
      scopeType: AssignmentScopeType.Company,
      companyId: "",
      idValue: "",
      scopeValue: "",
      userId: "",
      fullName: "",
      systemCodeUser: "",
      isActive: true,
    };
  }

  const scopeType = inferScopeType(item);
  const scopeText = (item.scopeValue ?? "").trim();
  const explicitCompanyId = item.companyId != null ? String(item.companyId) : "";
  const matchedCompany =
    explicitCompanyId ||
    (scopeType === AssignmentScopeType.Company && item.idValue != null ? String(item.idValue) : "") ||
    companyOptions.find(
      (c) =>
        c.name.toLowerCase() === (item.companyName ?? scopeText).toLowerCase() ||
        scopeText.toLowerCase().includes(c.name.toLowerCase()),
    )?.id ||
    "";

  const idValue =
    item.idValue != null
      ? String(item.idValue)
      : scopeType === AssignmentScopeType.Company
        ? matchedCompany
        : item.departmentId != null
          ? String(item.departmentId)
          : "";

  return {
    statusCondition: item.statusCondition?.trim() || getConditionMeta(item.conditionName).key,
    scopeType,
    companyId: matchedCompany,
    idValue,
    scopeValue: scopeText,
    userId: item.userId ? String(item.userId) : "",
    fullName: item.fullName?.trim() || "",
    systemCodeUser: item.systemCodeUser?.trim() || "",
    description: item.description,
    isActive: item.isActive ?? true,
  };
}

export function ConditionAssignmentEditor({
  item,
  conditionOptions,
  companyOptions,
  fallbackUsers,
  onClose,
  onSaved,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const editing = item != null;

  const initial = useMemo(() => buildInitialDraft(item, companyOptions), [item, companyOptions]);
  const [baseline, setBaseline] = useState<ConditionAssignmentDraft>(initial);
  const [draft, setDraft] = useState<ConditionAssignmentDraft>(initial);
  const [departments, setDepartments] = useState<SearchableSelectOption[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [editorUsers, setEditorUsers] = useState<ConditionAssigneeOption[]>(fallbackUsers);
  const [usersLoading, setUsersLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Load full assignable user list via GET /employeeInfor/get-user-by-filter
  useEffect(() => {
    const controller = new AbortController();
    setUsersLoading(true);
    conditionAssignmentApi
      .getUsers(false, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted && rows.length) {
          setEditorUsers(rows);
        }
      })
      .catch(() => {
        // Keep fallbackUsers if directory fetch fails
      })
      .finally(() => {
        if (!controller.signal.aborted) setUsersLoading(false);
      });
    return () => controller.abort();
  }, []);

  // If editing a Department-scoped row without companyId from BE, infer companyId from departments list
  useEffect(() => {
    if (
      !editing ||
      initial.scopeType !== AssignmentScopeType.Department ||
      initial.companyId ||
      !initial.idValue
    ) {
      return;
    }
    const controller = new AbortController();
    departmentApi
      .list("", "", controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        const found = rows.find((row) => String(row.id) === initial.idValue);
        if (found?.companyId) {
          const resolvedCompanyId = String(found.companyId);
          setBaseline((prev) => ({ ...prev, companyId: resolvedCompanyId }));
          setDraft((prev) => (prev.companyId ? prev : { ...prev, companyId: resolvedCompanyId }));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [editing, initial.scopeType, initial.companyId, initial.idValue]);

  useEffect(() => {
    if (draft.scopeType !== AssignmentScopeType.Department || !draft.companyId) {
      setDepartments([]);
      setDeptLoading(false);
      return;
    }
    const controller = new AbortController();
    setDeptLoading(true);
    departmentApi
      .list(draft.companyId, "", controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setDepartments(rows.map((row) => ({ id: String(row.id), name: row.name })));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setDepartments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDeptLoading(false);
      });
    return () => controller.abort();
  }, [draft.scopeType, draft.companyId]);

  const effectiveConditions = useMemo(() => {
    if (!draft.statusCondition || conditionOptions.some((o) => o.id === draft.statusCondition)) {
      return conditionOptions;
    }
    const meta = getConditionMeta(draft.statusCondition);
    return [...conditionOptions, { id: draft.statusCondition, name: meta.label }];
  }, [conditionOptions, draft.statusCondition]);

  const userOptions = useMemo<SearchableSelectOption[]>(() => {
    const map = new Map<string, string>();
    for (const user of editorUsers) {
      if (!user.id || map.has(user.id)) continue;
      map.set(user.id, user.systemCode ? `${user.fullName} · ${user.systemCode}` : user.fullName);
    }
    if (draft.userId && !map.has(draft.userId)) {
      const label =
        [item?.fullName, item?.systemCodeUser].filter(Boolean).join(" · ") || draft.userId;
      map.set(draft.userId, label);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [editorUsers, draft.userId, item?.fullName, item?.systemCodeUser]);

  const effectiveDepartments = useMemo(() => {
    if (
      draft.scopeType !== AssignmentScopeType.Department ||
      !draft.idValue ||
      departments.some((d) => d.id === draft.idValue)
    ) {
      return departments;
    }
    return [
      ...departments,
      { id: draft.idValue, name: item?.departmentName || item?.scopeValue || `Phòng ban #${draft.idValue}` },
    ];
  }, [departments, draft.scopeType, draft.idValue, item?.departmentName, item?.scopeValue]);

  const conditionMeta = getConditionMeta(draft.statusCondition);
  const previewScope =
    draft.scopeValue ||
    (draft.scopeType === AssignmentScopeType.Company
      ? companyOptions.find((c) => c.id === draft.companyId)?.name
      : effectiveDepartments.find((d) => d.id === draft.idValue)?.name) ||
    "Chưa chọn phạm vi";
  const previewUser =
    userOptions.find((u) => u.id === draft.userId)?.name || "Chưa chọn người phụ trách";

  function patch(fields: Partial<ConditionAssignmentDraft>) {
    setError("");
    setDraft((current) => ({ ...current, ...fields }));
  }

  function close() {
    if (busy || closing) return;
    if (dirty && !window.confirm("Bạn muốn bỏ các thay đổi chưa lưu?")) return;
    setClosing(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || closing || saving.current) return;

    if (!draft.statusCondition) {
      setError("Vui lòng chọn điều kiện xử lý.");
      return;
    }
    if (draft.scopeType === AssignmentScopeType.Company && !draft.companyId) {
      setError("Vui lòng chọn công ty áp dụng.");
      return;
    }
    if (draft.scopeType === AssignmentScopeType.Department) {
      if (!draft.companyId && !draft.idValue) {
        setError("Vui lòng chọn công ty và phòng ban áp dụng.");
        return;
      }
      if (!draft.idValue) {
        setError("Vui lòng chọn phòng ban áp dụng.");
        return;
      }
    }
    if (!draft.userId) {
      setError("Vui lòng chọn người phụ trách.");
      return;
    }
    if (editing && (item?.id == null || String(item.id).trim() === "")) {
      setError("Bản ghi chưa có mã ID để cập nhật.");
      return;
    }

    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await conditionAssignmentApi.save(draft, item?.id);
      notify("success", editing ? "Đã cập nhật phân công xử lý điều kiện." : "Đã thêm phân công mới.");
      onSaved();
      setClosing(true);
    } catch (cause) {
      setError(requestMessage(cause, "Không thể lưu phân công. Vui lòng thử lại."));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="ca-drawer"
      data-closing={closing}
      aria-labelledby="ca-drawer-title"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && closing) {
          dialog.current?.close();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form onSubmit={save} className="ca-drawer-core" inert={closing}>
        <header className="ca-drawer-head">
          <div>
            <span className="ca-eyebrow">
              <MixerHorizontalIcon aria-hidden="true" />
              {editing ? "Cập nhật luồng phân công" : "Tạo luồng phân công"}
            </span>
            <h2 id="ca-drawer-title">
              {editing ? "Chỉnh sửa phân công điều kiện" : "Thêm phân công mới"}
            </h2>
            <p>
              {editing
                ? "Điều chỉnh điều kiện, phạm vi hoặc người phụ trách."
                : "Chọn điều kiện, phạm vi đơn vị và gán người phụ trách xử lý."}
            </p>
          </div>
          <button
            type="button"
            className="ca-icon-btn"
            disabled={busy}
            aria-label="Đóng bảng phân công"
            onClick={close}
          >
            <Cross2Icon aria-hidden="true" />
          </button>
        </header>

        <div className="ca-drawer-body">
          <div className="ca-preview" aria-label="Xem trước quy tắc phân công">
            <div className="ca-preview-title">
              <span>Xem trước luồng xử lý</span>
              <span className="ca-status" data-active={draft.isActive}>
                <span className="ca-status-dot" aria-hidden="true" />
                {draft.isActive ? "Hoạt động" : "Tạm ngưng"}
              </span>
            </div>
            <div className="ca-preview-flow">
              <span className="ca-badge" data-tone={conditionMeta.tone}>
                <span className="ca-badge-dot" aria-hidden="true" />
                {draft.statusCondition ? conditionMeta.label : "Chọn điều kiện"}
              </span>
              <ArrowRightIcon aria-hidden="true" className="opacity-50" />
              <span className="ca-preview-node">
                {draft.scopeType === AssignmentScopeType.Department ? (
                  <DepartmentScopeIcon aria-hidden="true" />
                ) : (
                  <CompanyScopeIcon aria-hidden="true" />
                )}
                <span>{previewScope}</span>
              </span>
              <ArrowRightIcon aria-hidden="true" className="opacity-50" />
              <span className="ca-preview-node">
                <PersonIcon aria-hidden="true" />
                <span>{previewUser}</span>
              </span>
            </div>
          </div>

          <div className="ca-drawer-cols">
            <div className="ca-drawer-col">
              <div className="ca-field">
                <label htmlFor="ca-editor-condition">
                  <MixerHorizontalIcon aria-hidden="true" />
                  Điều kiện xử lý *
                </label>
                <SearchableSelect
                  id="ca-editor-condition"
                  label="Điều kiện xử lý"
                  placeholder="Chọn điều kiện"
                  required
                  options={effectiveConditions}
                  value={draft.statusCondition}
                  disabled={busy}
                  onChange={(statusCondition) => patch({ statusCondition })}
                />
              </div>

              <div className="ca-field">
                <span>
                  <LayersIcon aria-hidden="true" />
                  Loại phạm vi *
                </span>
                <div className="ca-scope-cards" role="group" aria-label="Loại phạm vi">
                  <button
                    type="button"
                    className="ca-scope-card"
                    aria-pressed={draft.scopeType === AssignmentScopeType.Company}
                    disabled={busy}
                    onClick={() =>
                      patch({
                        scopeType: AssignmentScopeType.Company,
                        idValue: draft.companyId,
                        scopeValue:
                          companyOptions.find((option) => option.id === draft.companyId)?.name ?? "",
                      })
                    }
                  >
                    <span className="ca-scope-card-orb">
                      <CompanyScopeIcon aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Công ty</strong>
                      <small>Áp dụng toàn đơn vị</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="ca-scope-card"
                    aria-pressed={draft.scopeType === AssignmentScopeType.Department}
                    disabled={busy}
                    onClick={() =>
                      patch({
                        scopeType: AssignmentScopeType.Department,
                        idValue: "",
                        scopeValue: "",
                      })
                    }
                  >
                    <span className="ca-scope-card-orb">
                      <DepartmentScopeIcon aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Phòng ban</strong>
                      <small>Áp dụng theo phòng/ban</small>
                    </span>
                  </button>
                </div>
              </div>

              <div className="ca-field">
                <label htmlFor="ca-editor-company">
                  <CompanyScopeIcon aria-hidden="true" />
                  Công ty *
                </label>
                <SearchableSelect
                  id="ca-editor-company"
                  label="Công ty"
                  placeholder="Chọn công ty"
                  required
                  options={companyOptions}
                  value={draft.companyId}
                  disabled={busy}
                  onChange={(companyId) => {
                    const companyName = companyOptions.find((option) => option.id === companyId)?.name ?? "";
                    patch({
                      companyId,
                      idValue: draft.scopeType === AssignmentScopeType.Company ? companyId : "",
                      scopeValue: draft.scopeType === AssignmentScopeType.Company ? companyName : "",
                    });
                  }}
                />
              </div>

              {draft.scopeType === AssignmentScopeType.Department && (
                <div className="ca-field ca-cascade">
                  <label htmlFor="ca-editor-department">
                    <DepartmentScopeIcon aria-hidden="true" />
                    Phòng ban *
                  </label>
                  <SearchableSelect
                    id="ca-editor-department"
                    label="Phòng ban"
                    placeholder={draft.companyId ? "Chọn phòng ban" : "Chọn công ty trước"}
                    required
                    options={effectiveDepartments}
                    value={draft.idValue}
                    disabled={busy || (!draft.companyId && !effectiveDepartments.length)}
                    loading={deptLoading}
                    onChange={(departmentId) => {
                      const deptName =
                        effectiveDepartments.find((option) => option.id === departmentId)?.name ?? "";
                      patch({ idValue: departmentId, scopeValue: deptName });
                    }}
                  />
                </div>
              )}
            </div>

            <div className="ca-drawer-col">
              <div className="ca-field">
                <label htmlFor="ca-editor-user">
                  <PersonIcon aria-hidden="true" />
                  Người phụ trách *
                </label>
                <SearchableSelect
                  id="ca-editor-user"
                  label="Người phụ trách"
                  placeholder="Tìm tên hoặc mã nhân sự"
                  required
                  options={userOptions}
                  value={draft.userId}
                  disabled={busy}
                  loading={usersLoading}
                  onChange={(userId) => {
                    const picked = editorUsers.find((user) => user.id === userId);
                    patch({
                      userId,
                      fullName: picked?.fullName ?? item?.fullName ?? "",
                      systemCodeUser: picked?.systemCode ?? item?.systemCodeUser ?? "",
                    });
                  }}
                />
              </div>

              {editing && (
                <div className="ca-field">
                  <label htmlFor="ca-editor-description">Mô tả / Ghi chú</label>
                  <textarea
                    id="ca-editor-description"
                    className="ca-textarea"
                    placeholder="Ghi chú thêm về phân công (không bắt buộc)…"
                    value={draft.description ?? ""}
                    disabled={busy}
                    onChange={(event) => patch({ description: event.target.value })}
                  />
                </div>
              )}

              <label className="ca-switch-card" data-active={draft.isActive}>
                <span>
                  <strong>Trạng thái hoạt động</strong>
                  <small>
                    {draft.isActive
                      ? "Phân công đang kích hoạt trong luồng xử lý."
                      : "Phân công đang tạm ngưng áp dụng."}
                  </small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className="sr-only"
                  checked={draft.isActive}
                  onChange={(event) => patch({ isActive: event.target.checked })}
                  disabled={busy}
                />
                <span className="ca-toggle" aria-hidden="true" />
              </label>
            </div>
          </div>

          {error && (
            <div className="ca-notice" data-kind="error" role="alert">
              <ExclamationTriangleIcon aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer className="ca-drawer-foot">
          <button type="button" className="ca-btn-ghost" onClick={close} disabled={busy}>
            Hủy
          </button>
          <button
            type="submit"
            className="ca-cta-pill"
            disabled={busy || (editing && !dirty)}
          >
            <span>{busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm phân công"}</span>
            <span className="ca-cta-orb" aria-hidden="true">
              {busy ? <ReloadIcon className="ca-spin" /> : <CheckIcon />}
            </span>
          </button>
        </footer>
      </form>
    </dialog>
  );
}
