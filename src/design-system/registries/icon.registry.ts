import type { ComponentType } from "react";
import * as RadixIcons from "@radix-ui/react-icons";
import {
  Activity,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  CalendarRange,
  Clock,
  Compass,
  Cpu,
  FileText,
  Gauge,
  HardHat,
  Hash,
  HeartHandshake,
  IdCard,
  Layers,
  List,
  MessageSquareText,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tag,
  ToggleRight,
  Truck,
  Unlock,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { normalizeVietnamese } from "@/lib/format/formatters";

export type RadixIconComponent = ComponentType<{ className?: string; width?: number; height?: number }>;

const RADIX_ICON_RECORD = RadixIcons as unknown as Record<string, RadixIconComponent>;

export const AVAILABLE_MENU_ICON_NAMES: string[] = Object.keys(RADIX_ICON_RECORD)
  .filter((name) => name.endsWith("Icon") && typeof RADIX_ICON_RECORD[name] === "function")
  .sort();

export function resolveMenuIcon(iconName: string | null | undefined): RadixIconComponent {
  if (iconName && iconName in RADIX_ICON_RECORD && typeof RADIX_ICON_RECORD[iconName] === "function") {
    return RADIX_ICON_RECORD[iconName];
  }
  return RadixIcons.DotFilledIcon as unknown as RadixIconComponent;
}

export function isSupportedMenuIcon(iconName: string | null | undefined): boolean {
  if (!iconName) return true;
  return iconName in RADIX_ICON_RECORD && typeof RADIX_ICON_RECORD[iconName] === "function";
}

interface IconRule {
  keywords: string[];
  icon: LucideIcon;
}

/**
 * SINGLE SOURCE OF TRUTH for Department semantic icons (fixes legacy diacritic bug "kiem soát").
 */
const DEPARTMENT_ICON_RULES: IconRule[] = [
  { keywords: ["cong nghe", "cntt", "chuyen doi so", "phan mem", "it"], icon: Cpu },
  { keywords: ["nhan su", "dao tao", "hr"], icon: Users },
  { keywords: ["tai chinh", "ke toan", "ngan sach"], icon: Calculator },
  { keywords: ["kiem soat", "chat luong", "qa", "qc", "an toan", "phap che"], icon: ShieldCheck },
  { keywords: ["van hanh", "ham", "giao thong", "van tai"], icon: Truck },
  { keywords: ["ky thuat", "thi cong", "cong truong", "hien truong", "du an"], icon: HardHat },
  { keywords: ["hanh chinh", "van phong", "doi ngoai", "truyen thong"], icon: Briefcase },
  { keywords: ["khach hang", "dich vu", "hop tac"], icon: HeartHandshake },
  { keywords: ["cong ty", "tap doan", "chi nhanh"], icon: Building2 },
];

export function resolveDepartmentIcon(name: string | null | undefined): LucideIcon {
  const normalized = normalizeVietnamese(name);
  if (!normalized) return Layers;
  for (const rule of DEPARTMENT_ICON_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return rule.icon;
    }
  }
  return Layers;
}

/**
 * SINGLE SOURCE OF TRUTH for Table Column Header Icons across ALL DataTables.
 * Edit an icon here once to update every matching table column across all 17 screens.
 */
const TABLE_HEADER_KEY_ICON_MAP: Record<string, LucideIcon> = {
  actions: SlidersHorizontal,
  employeeCode: IdCard,
  code: Hash,
  manager: UserCheck,
  employee: Users,
  user: Users,
  userName: Users,
  company: Building2,
  companyCode: Building2,
  companyDept: Building2,
  org: Building2,
  scopeTarget: Building2,
  department: Layers,
  condition: ShieldCheck,
  scopeType: Compass,
  period: Calendar,
  periodLabel: Calendar,
  periodTemplate: Calendar,
  periodType: Calendar,
  time: Calendar,
  dateRange: CalendarRange,
  submitDate: Clock,
  submittedDate: Clock,
  approvedDate: Clock,
  template: FileText,
  templateName: FileText,
  jobPosition: Briefcase,
  jobTitle: Briefcase,
  type: Tag,
  scores: Star,
  selfScore: Star,
  completion: Gauge,
  band: Award,
  totalEval: BarChart3,
  statusPeriod: Unlock,
  isActive: ToggleRight,
  status: Activity,
  note: MessageSquareText,
  description: MessageSquareText,
};

const TABLE_HEADER_LABEL_RULES: IconRule[] = [
  { keywords: ["thao tac"], icon: SlidersHorizontal },
  { keywords: ["ma nv", "ma nhan vien"], icon: IdCard },
  { keywords: ["ma ky", "ma "], icon: Hash },
  { keywords: ["quan ly", "nguoi duyet"], icon: UserCheck },
  { keywords: ["nhan vien", "nhan su"], icon: Users },
  { keywords: ["cong ty", "don vi"], icon: Building2 },
  { keywords: ["phong ban"], icon: Layers },
  { keywords: ["dieu kien"], icon: ShieldCheck },
  { keywords: ["pham vi"], icon: Compass },
  { keywords: ["thoi han"], icon: CalendarRange },
  { keywords: ["ngay nop", "ngay gui", "ngay xu ly", "ngay duyet"], icon: Clock },
  { keywords: ["ky danh gia", "loai ky", "thoi gian", "ky &"], icon: Calendar },
  { keywords: ["bieu mau", "ten ban danh gia"], icon: FileText },
  { keywords: ["chuc danh", "vi tri"], icon: Briefcase },
  { keywords: ["ty le", "r%"], icon: Gauge },
  { keywords: ["diem"], icon: Star },
  { keywords: ["xep loai", "band"], icon: Award },
  { keywords: ["tong ho so", "tong cong"], icon: BarChart3 },
  { keywords: ["trang thai mo"], icon: Unlock },
  { keywords: ["kich hoat", "isactive"], icon: ToggleRight },
  { keywords: ["trang thai"], icon: Activity },
  { keywords: ["y kien", "mo ta", "ghi chu"], icon: MessageSquareText },
  { keywords: ["loai"], icon: Tag },
];

export function resolveTableHeaderIcon(
  columnKey?: string | null,
  headerLabel?: string | null,
): LucideIcon {
  if (columnKey && columnKey in TABLE_HEADER_KEY_ICON_MAP) {
    return TABLE_HEADER_KEY_ICON_MAP[columnKey];
  }
  const normalized = normalizeVietnamese(headerLabel);
  if (normalized) {
    for (const rule of TABLE_HEADER_LABEL_RULES) {
      if (rule.keywords.some((kw) => normalized.includes(kw))) {
        return rule.icon;
      }
    }
  }
  return List;
}
