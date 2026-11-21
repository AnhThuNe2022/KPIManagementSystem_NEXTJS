import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { AppShellFrame } from "@/features/layout/components/AppShellFrame";
import { MenuProvider, MenuRouteGuard } from "@/features/menus/components/MenuAccessGuard";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userName = cookieStore.get(appConfig.userNameCookieName)?.value?.trim() || "Người dùng";

  return (
    <MenuProvider>
      <AppShellFrame userName={userName}>
        <MenuRouteGuard>{children}</MenuRouteGuard>
      </AppShellFrame>
    </MenuProvider>
  );
}
