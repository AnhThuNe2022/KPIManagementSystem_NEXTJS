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
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

