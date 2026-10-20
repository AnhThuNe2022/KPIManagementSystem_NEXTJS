import React from "react";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { Sidebar } from "@/features/layout/components/sidebar";
import { AppHeader } from "@/features/layout/components/app-header";

export default async function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const userName = (await cookies()).get(appConfig.userNameCookieName)?.value ?? "Người dùng";

  return (
    <div className="min-h-screen bg-[rgb(var(--color-page))] text-[rgb(var(--color-text))]">
      <AppHeader userName={userName} />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
