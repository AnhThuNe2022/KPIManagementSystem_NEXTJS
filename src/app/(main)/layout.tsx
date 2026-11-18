import React from "react";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { Sidebar } from "@/features/layout/components/Sidebar";
import { AppHeader } from "@/features/layout/components/AppHeader";
import { MenuProvider, MenuRouteGuard } from "@/features/menus/components/MenuAccessGuard";

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();


  const userName =
    cookieStore.get(appConfig.userNameCookieName)?.value ?? "Người dùng";

  return (
    <div className="min-h-screen flow-root bg-[rgb(var(--color-page))] text-[rgb(var(--color-text))]">
      <AppHeader userName={userName} />

      <MenuProvider>
        <div className="flex">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 sm:p-6 lg:p-8">
            <MenuRouteGuard>{children}</MenuRouteGuard>
          </main>
        </div>
      </MenuProvider>
    </div>
  );
}