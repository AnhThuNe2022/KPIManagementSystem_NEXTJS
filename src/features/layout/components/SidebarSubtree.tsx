"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { resolveMenuIcon } from "@/design-system/registries";
import { normalizeMenuHref, normalizeRouteKey } from "@/features/menus/menuTree";
import type { MenuDto } from "@/features/menus/types";

export function menuContainsPath(menu: MenuDto, normalizedPathname: string): boolean {
  const key = normalizeRouteKey(menu.url);
  if (key && (normalizedPathname === key || normalizedPathname.startsWith(`${key}/`))) {
    return true;
  }
  return Array.isArray(menu.children)
    ? menu.children.some((child) => menuContainsPath(child, normalizedPathname))
    : false;
}

/**
 * SINGLE SOURCE OF TRUTH recursive submenu renderer shared across:
 * 1) Expanded sidebar accordion
 * 2) Collapsed sidebar hover flyout
 * 3) Fullscreen glassmorphic dock popup
 * 4) Mobile NavigationDrawer
 */
export function SidebarSubtree({
  items,
  normalizedPathname,
  openGroups,
  onToggleGroup,
  onNavigate,
  onInteract,
  depth = 0,
}: {
  items: MenuDto[];
  normalizedPathname: string;
  openGroups: Record<number, boolean>;
  onToggleGroup: (id: number, currentOpen: boolean) => void;
  onNavigate: () => void;
  onInteract?: () => void;
  depth?: number;
}) {
  return (
    <>
      {items.map((child) => {
        const IconComp = resolveMenuIcon(child.icon);
        const children = Array.isArray(child.children) ? child.children : [];
        const hasChildren = children.length > 0;
        const href = normalizeMenuHref(child.url);
        const isCurrent = menuContainsPath(child, normalizedPathname);
        const isOpen = openGroups[child.id] ?? isCurrent;

        const inner = (
          <>
            <IconComp className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1">{child.title}</span>
            {hasChildren ? (
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            ) : null}
          </>
        );

        return (
          <div key={child.id}>
            {hasChildren ? (
              <button
                type="button"
                className="dcg-sidebar-subitem"
                aria-expanded={isOpen}
                onPointerEnter={onInteract}
                onClick={() => onToggleGroup(child.id, isOpen)}
              >
                {inner}
              </button>
            ) : href === "#" ? (
              <button
                type="button"
                className="dcg-sidebar-subitem"
                disabled
                title="Menu chưa có đường dẫn"
              >
                {inner}
              </button>
            ) : (
              <Link
                href={href}
                className="dcg-sidebar-subitem"
                aria-current={isCurrent ? "page" : undefined}
                onPointerEnter={onInteract}
                onClick={onNavigate}
              >
                {inner}
              </Link>
            )}

            {hasChildren && isOpen ? (
              <div
                className="ml-3 border-l border-border pl-2"
                style={{ marginTop: depth === 0 ? 2 : 1 }}
              >
                <SidebarSubtree
                  items={children}
                  normalizedPathname={normalizedPathname}
                  openGroups={openGroups}
                  onToggleGroup={onToggleGroup}
                  onNavigate={onNavigate}
                  onInteract={onInteract}
                  depth={depth + 1}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
