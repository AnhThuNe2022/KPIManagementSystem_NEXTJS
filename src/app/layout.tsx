import "@/styles/globals.css";
import type { Metadata } from "next";
import { DesignSystemProvider } from "@/components/ds";
import { AuthProvider } from "@/features/auth/AuthProvider";

export const metadata: Metadata = {
  title: "Hệ thống Quản lý Đánh giá KPI | Đèo Cả Group",
  description: "Cổng quản trị và đánh giá hiệu suất KPI Tập đoàn Đèo Cả (Astryx + Tailwind v4).",
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('dcg-theme');
    var isDark = saved === 'dark' || ((!saved || saved === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.colorMode = isDark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-body text-primary antialiased">
        <DesignSystemProvider>
          <AuthProvider>{children}</AuthProvider>
        </DesignSystemProvider>
      </body>
    </html>
  );
}
