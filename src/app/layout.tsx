import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KPI Management System",
  description: "DCG KPI management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try { const theme = localStorage.getItem('dcg-theme'); const isDark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.classList.toggle('dark', isDark); } catch {}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
