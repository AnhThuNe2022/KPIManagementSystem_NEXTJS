"use client";

import { useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { organizationApi } from "../service/organizationApi";

export interface ManagerOption {
  id: string;
  fullName?: string;
  jobTitle?: string;
  departmentName?: string;
  companyName?: string;
  employeeCode?: string;
  organizationId?: number;
}

interface ManagerSearchProps {
  userId: string;
  value?: string;
  initialManager?: ManagerOption | null;
  disabled?: boolean;
  onChange: (manager?: ManagerOption) => void;
}

export default function ManagerSearch({ userId, value, initialManager, disabled = false, onChange }: ManagerSearchProps) {
  const [keyword, setKeyword] = useState("");
  const [options, setOptions] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selected = initialManager?.id === value ? initialManager : options.find(option => option.id === value);

  useEffect(() => {
    setOptions([]);
    setError("");
    if (disabled || !userId || !keyword.trim()) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await organizationApi.searchManagers(userId, keyword.trim());
        if (!active) return;
        const managers = new Map<string, ManagerOption>();
        for (const item of result.items) {
          if (!item.userId || managers.has(item.userId)) continue;
          managers.set(item.userId, {
            id: item.userId,
            fullName: item.userName ?? "",
            jobTitle: item.jobTitle ?? "",
            departmentName: item.departmentName ?? "",
            companyName: item.companyName ?? "",
            employeeCode: item.employeeCode ?? "",
            organizationId: item.id,
          });
        }
        setOptions([...managers.values()]);
      } catch {
        if (active) setError("Không thể tìm quản lý. Vui lòng thử lại.");
      } finally {
        if (active) setLoading(false);
      }
    }, 1000);
    return () => { active = false; clearTimeout(timer); };
  }, [keyword, disabled, userId]);

  return <SearchableSelect
    id="managerId"
    label="Quản lý trực tiếp"
    value={value ?? ""}
    valueLabel={selected ? managerLabel(selected) : undefined}
    options={options.map(manager => ({ id: manager.id, name: managerLabel(manager) }))}
    placeholder={disabled ? "Vui lòng chọn phòng ban" : "Chọn quản lý trực tiếp"}
    variant="underline"
    required
    disabled={disabled}
    loading={loading}
    emptyMessage={error || (keyword.trim() ? "Không tìm thấy người quản lý" : "Nhập tên, chức vụ, công ty hoặc phòng ban để tìm.")}
    onSearchChange={setKeyword}
    onChange={id => onChange(options.find(manager => manager.id === id))}
  />;
}

function managerLabel(manager: ManagerOption) {
  return [manager.fullName, manager.jobTitle, manager.departmentName, manager.companyName].filter(Boolean).join(" - ");
}
