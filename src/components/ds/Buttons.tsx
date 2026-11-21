"use client";

import React, { type ReactNode } from "react";
import { Button, type ButtonProps } from "@astryxdesign/core/Button";
import { IconButton, type IconButtonProps } from "@astryxdesign/core/IconButton";
import { DropdownMenu, type DropdownMenuOption } from "@astryxdesign/core/DropdownMenu";
import { MoreHorizontal } from "lucide-react";

export type AppButtonProps = ButtonProps;

export function AppButton({ size = "md", ...props }: AppButtonProps) {
  return <Button size={size} {...props} />;
}

export type AppIconButtonProps = IconButtonProps;

export function AppIconButton({ size = "sm", variant = "ghost", ...props }: AppIconButtonProps) {
  return <IconButton size={size} variant={variant} {...props} />;
}

export interface RowActionItem {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  isDisabled?: boolean;
  onClick?: () => void;
  href?: string;
}

export function RowActionMenu({
  items,
  label = "Thao tác",
}: {
  items: RowActionItem[];
  label?: string;
}) {
  const menuItems: DropdownMenuOption[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    variant: item.variant === "destructive" ? "destructive" : undefined,
    isDisabled: item.isDisabled,
    onClick: item.onClick,
    href: item.href,
  }));

  return (
    <DropdownMenu
      items={menuItems}
      alignment="end"
      placement="below"
      hasChevron={false}
      renderTrigger={(triggerProps) => (
        <IconButton
          ref={triggerProps.ref as React.Ref<HTMLButtonElement>}
          id={triggerProps.id}
          label={label}
          variant="ghost"
          size="sm"
          icon={<MoreHorizontal className="h-4 w-4" />}
          onClick={triggerProps.onClick as unknown as (e: React.MouseEvent) => void}
          aria-expanded={triggerProps["aria-expanded"]}
          aria-haspopup={triggerProps["aria-haspopup"]}
          aria-controls={triggerProps["aria-controls"]}
        />
      )}
    />
  );
}
