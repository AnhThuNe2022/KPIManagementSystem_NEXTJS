"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, WifiOff } from "lucide-react";
import { AppButton, AppEmptyState, LoadingOverlay } from "@/components/ds";
import { useAuth } from "@/features/auth/AuthProvider";
import { MENUS_CHANGED_EVENT, subscribeAppEvent } from "@/lib/events/appEvents";
import { getErrorMessage, isAbortError } from "@/lib/http/request";
import { collectAllowedRouteKeys, isOpenRoute, isPathnameAllowed, sortMenuTree } from "../menuTree";
import { menuApi } from "../services/menuApi";
import type { MenuDto } from "../types";

interface MenuContextValue {
  navigation: MenuDto[];
  allowedKeys: Set<string>;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [navigation, setNavigation] = useState<MenuDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((v) => v + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    setError(null);
    menuApi
      .my(ctrl.signal)
      .then((items) => {
        if (!ctrl.signal.aborted) {
          setNavigation(sortMenuTree(items));
        }
      })
      .catch((cause) => {
        if (!isAbortError(cause)) {
          setError(getErrorMessage(cause, "Không thể tải danh mục phân quyền."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoading(false);
      });
    return () => ctrl.abort();
  }, [revision]);

  useEffect(() => subscribeAppEvent(MENUS_CHANGED_EVENT, reload), [reload]);

  const allowedKeys = useMemo(() => collectAllowedRouteKeys(navigation), [navigation]);
  const value = useMemo<MenuContextValue>(
    () => ({ navigation, allowedKeys, isLoading, error, reload }),
    [navigation, allowedKeys, isLoading, error, reload],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMyMenus(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMyMenus must be used within MenuProvider");
  return ctx;
}

export function MenuRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { logout } = useAuth();
  const { allowedKeys, isLoading, error, reload } = useMyMenus();

  if (isOpenRoute(pathname)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <LoadingOverlay label="Đang kiểm tra quyền truy cập..." />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <AppEmptyState
          title="Lỗi tải phân quyền"
          description={error}
          icon={<WifiOff className="h-8 w-8 text-error" />}
          actions={
            <div className="flex flex-wrap justify-center gap-2">
              <AppButton label="Thử lại" variant="primary" onClick={reload} />
              <AppButton label="Về Tổng quan" variant="secondary" href="/dashboard" />
              <AppButton
                label="Đăng xuất"
                variant="ghost"
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                  router.refresh();
                }}
              />
            </div>
          }
        />
      </div>
    );
  }

  if (!isPathnameAllowed(pathname, allowedKeys)) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <AppEmptyState
          title="403 · Không có quyền truy cập"
          description="Tài khoản của bạn hiện chưa được cấp quyền truy cập màn hình này. Vui lòng liên hệ quản trị viên hệ thống."
          icon={<ShieldAlert className="h-8 w-8 text-error" />}
          actions={
            <div className="flex flex-wrap justify-center gap-2">
              <AppButton label="Về Tổng quan" variant="primary" href="/dashboard" />
              <AppButton label="Quay lại" variant="secondary" onClick={() => router.back()} />
            </div>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
