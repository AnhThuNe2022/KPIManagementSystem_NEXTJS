import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/features/auth/components/user-menu";
import { NotificationBell } from "./notification-bell";
import styles from "./app-header.module.css";

export function AppHeader({ userName }: { userName: string }) {
  return (
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand} aria-label="Đèo Cả KPI — Trang tổng quan">
        <span className={styles.logo}>
          <Image src="/brand/deoca-icon.png" alt="" width={36} height={36} priority />
        </span>
        <span className={styles.brandText}>
          <span className={styles.company}>ĐÈO CẢ GROUP</span>
          <span className={styles.title}>Hệ thống KPI</span>
        </span>
      </Link>

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
