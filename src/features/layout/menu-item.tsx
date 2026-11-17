"use client";

import { useState } from "react";
import Link from "next/link";
import type { MenuDto } from "@/types/menu";

import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import BadgeIcon from "@mui/icons-material/Badge";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SummarizeIcon from "@mui/icons-material/Summarize";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import RuleIcon from "@mui/icons-material/Rule";
import EventNoteIcon from "@mui/icons-material/EventNote";
import InventoryIcon from "@mui/icons-material/Inventory";
import GroupsIcon from "@mui/icons-material/Groups";
import MenuIconMui from "@mui/icons-material/Menu";
import ChecklistRtlIcon from "@mui/icons-material/ChecklistRtl";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import BarChartIcon from "@mui/icons-material/BarChart";
import BackupTableIcon from "@mui/icons-material/BackupTable";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

type MenuItemProps = {
  menu: MenuDto;
};

const menuIcons = {
  Dashboard: DashboardIcon,
  AccountCircle: AccountCircleIcon,
  Badge: BadgeIcon,
  EditNote: EditNoteIcon,
  Assignment: AssignmentIcon,
  Assessment: AssessmentIcon,
  Summarize: SummarizeIcon,
  AccountTree: AccountTreeIcon,
  ManageAccounts: ManageAccountsIcon,
  SettingsSuggest: SettingsSuggestIcon,
  Rule: RuleIcon,
  EventNote: EventNoteIcon,
  Inventory: InventoryIcon,
  Groups: GroupsIcon,
  Menu: MenuIconMui,
  ChecklistRtl: ChecklistRtlIcon,
  Analytics: AnalyticsIcon,
  BarChart: BarChartIcon,
  BackupTable: BackupTableIcon,
};

function MenuIcon({
  name,
  className = "",
}: {
  name?: string | null;
  className?: string;
}) {
  if (!name) return null;

  const Icon = menuIcons[name as keyof typeof menuIcons];

  if (!Icon) return null;

  return (
    <Icon
      className={`shrink-0 transition-transform duration-200 ${className}`}
      fontSize="small"
    />
  );
}

export function MenuItem({ menu }: MenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const children = [...(menu.children ?? [])].sort(
    (a, b) => a.orderNo - b.orderNo
  );

  // ============================================================
  // PARENT MENU (Có menu con)
  // ============================================================
  if (children.length > 0) {
    return (
      <div className="mb-1.5 select-none">
        {/* Click vào parent để thu nhỏ / mở rộng */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`
            group flex items-center gap-3
            rounded-xl px-3 py-2.5
            text-sm font-medium
            text-[rgb(var(--color-foreground))]
            cursor-pointer
            transition-all duration-200
            hover:bg-white/[0.06]
            ${isOpen ? "bg-white/[0.04]" : ""}
          `}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgb(var(--color-brand))]/10 text-[rgb(var(--color-brand))] transition-transform group-hover:scale-105">
            <MenuIcon name={menu.icon} />
          </div>

          <span className="flex-1 truncate tracking-wide">
            {menu.title}
          </span>

          <KeyboardArrowDownIcon
            className={`
              shrink-0
              text-[rgb(var(--color-muted))]
              transition-transform duration-300
              ${isOpen ? "rotate-180 text-[rgb(var(--color-brand))]" : "opacity-60"}
            `}
            fontSize="small"
          />
        </div>

        {/* Danh sách children với hiệu ứng thu nhỏ / mở rộng mượt mà */}
        <div
          className={`
            grid transition-all duration-300 ease-in-out
            ${isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 overflow-hidden"}
          `}
        >
          <div className="overflow-hidden space-y-1 pl-4 ml-3.5 border-l border-white/10">
            {children.map((child) => (
              <MenuItem key={child.id} menu={child} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // NORMAL MENU (Menu thông thường không có con)
  // ============================================================
  return (
    <Link
      href={menu.url || "#"}
      className="
        group
        flex items-center gap-3
        rounded-xl
        px-3 py-2
        text-sm font-medium
        text-[rgb(var(--color-muted))]
        transition-all duration-200
        hover:bg-[rgb(var(--color-brand))]/10
        hover:text-[rgb(var(--color-brand))]
        active:scale-[0.98]
      "
    >
      <MenuIcon
        name={menu.icon}
        className="
          text-[rgb(var(--color-muted))]
          group-hover:text-[rgb(var(--color-brand))]
        "
      />

      <span className="truncate tracking-wide">
        {menu.title}
      </span>
    </Link>
  );
}