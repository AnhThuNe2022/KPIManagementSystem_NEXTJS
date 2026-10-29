"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, HomeIcon } from "@radix-ui/react-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/features/auth/components/user-menu";
import { NotificationBell } from "./notification-bell";
import styles from "./app-header.module.css";

const headerPages: Record<string, readonly [string, string]> = {
  "/dashboard": ["", "Dashboard"],
  "/user-infor": ["Thông tin chung", "Thông tin tài khoản cá nhân"],
  "/my-evaluation": ["Đánh giá", "Bản đánh giá của tôi"],
  "/notifications": ["", "Thông báo"],
  "/manager/pending": ["Quản lý", "Danh sách NS chờ đánh giá"],
  "/manager/reviewed": ["Quản lý", "Danh sách NS đã đánh giá"],
  "/hr/pending": ["Quản lý Nhân sự", "Danh sách chờ nhận xét"],
  "/hr/reviewed": ["Quản lý Nhân sự", "Đã nhận xét"],
  "/admin/evaluationList": ["HR tổng hợp", "Danh sách đánh giá"],
  "/admin/permission": ["Cấu hình", "Quản lý quyền"],
  "/admin/menu": ["Cấu hình", "Quản lý menu"],
};

export function AppHeader({ userName }: { userName: string }) {
  const page = headerPages[usePathname()];
  return (
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand} aria-label="Đèo Cả KPI — Trang tổng quan">
        <span className={styles.logo}>
          <Image src="/brand/deoca-icon.png" alt="" width={44} height={44} priority />
        </span>
        <span className={styles.brandText}>
          <span className={styles.title}>Hệ thống KPI</span>
          <span className={styles.company}>ĐÈO CẢ GROUP</span>
        </span>
      </Link>

      {page && <nav className={styles.breadcrumbs} aria-label="Đường dẫn trang"><ol>
        <li><Link href="/dashboard" aria-label="Trang tổng quan"><HomeIcon aria-hidden="true" /></Link></li>
        {page[0] && <li><ChevronRightIcon aria-hidden="true" /><span>{page[0]}</span></li>}
        <li aria-current="page"><ChevronRightIcon aria-hidden="true" /><span title={page[1]}>{page[1]}</span></li>
      </ol></nav>}

      <div className={styles.actions}>
        <div className={styles.tools}>
          <NotificationBell />
          <ThemeToggle />
        </div>
        <div className={styles.account}>
          <UserMenu userName={userName} />
        </div>
      </div>
    </header>
  );
}
