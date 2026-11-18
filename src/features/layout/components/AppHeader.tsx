"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, HomeIcon } from "@radix-ui/react-icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HeaderSnowman } from "@/components/ui/HeaderSnowman";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import "./AppHeader.css";

const headerPages: Record<string, readonly [string, string]> = {
  "/dashboard": ["", "Dashboard"],
  "/user-infor": ["Thông tin chung", "Thông tin tài khoản cá nhân"],
  "/my-evaluation": ["Đánh giá", "Bản đánh giá của tôi"],
  "/notifications": ["", "Thông báo"],
  "/manager/pending": ["Quản lý", "Danh sách NS chờ đánh giá"],
  "/manager/reviewed": ["Quản lý", "Danh sách NS đã đánh giá"],
  "/manager/kpi-evaluation-periods": ["Quản lý", "Danh sách kỳ đánh giá KPI"],
  "/hr/pending": ["Quản lý Nhân sự", "Danh sách chờ nhận xét"],
  "/hr/reviewed": ["Quản lý Nhân sự", "Đã nhận xét"],
  "/admin/evaluationList": ["HR tổng hợp", "Danh sách đánh giá"],
  "/admin/permission": ["Cấu hình", "Quản lý quyền"],
  "/admin/menu": ["Cấu hình", "Quản lý menu"],
  "/departments": ["HR tổng hợp", "Quản lý phòng ban"],
  "/summary/summary-list/HrSummary": ["HR tổng hợp", "Danh sách tổng hợp"],
  "/summary/summary-list-detail/HrSummary": ["HR tổng hợp", "Chi tiết tổng hợp"],
  "/summary/summary-list/SummaryDirector": ["Tổng hợp cấp cao", "Danh sách tổng hợp"],
  "/summary/summary-list-detail/SummaryDirector": ["Tổng hợp cấp cao", "Chi tiết tổng hợp"],
};

export function AppHeader({ userName }: { userName: string }) {
  const pathname = usePathname();
  const page = headerPages[pathname] ?? Object.entries(headerPages).find(([path]) => pathname.startsWith(path + "/"))?.[1];
  return (
    <header className="app-header__header">
      <Link href="/dashboard" className="app-header__brand" aria-label="Đèo Cả KPI — Trang tổng quan">
        <span className="app-header__logo">
          <svg className="app-header__santaHat" viewBox="0 0 64 44" aria-hidden="true">
            <defs>
              <linearGradient id="santa-hat-red" x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor="#ff3b47" />
                <stop offset="55%" stopColor="#dc1424" />
                <stop offset="100%" stopColor="#990d18" />
              </linearGradient>
            </defs>
            <g stroke="#ffffff" strokeWidth="2.4" strokeLinejoin="round">
              <path d="M55 26 C50 13, 38 6, 23 9 C13 11, 7 18, 7 25 L14 25 C15 20, 20 17, 27 17 C31 17, 34 18, 35 19 L55 26 Z" fill="url(#santa-hat-red)" />
              <circle cx="8" cy="27" r="5.5" fill="#ffffff" />
              <path d="M12 29 C10 27, 11 24, 14 23 L33 15 C34.5 14.3, 36 14.3, 37.5 15 L55 23 C58 24, 58 28, 55 29 C48 26, 40 22, 35 20.5 C30 22, 20 27, 14 30 C13 30.5, 12.5 29.8, 12 29 Z" fill="#ffffff" />
            </g>
            <path d="M55 26 C50 13, 38 6, 23 9 C13 11, 7 18, 7 25 L14 25 C15 20, 20 17, 27 17 C31 17, 34 18, 35 19 L55 26 Z" fill="url(#santa-hat-red)" />
            <path d="M22 13 C29 10, 38 11, 44 16" fill="none" stroke="#880b14" strokeWidth="1.7" strokeLinecap="round" opacity="0.5" />
            <path d="M12 29 C10 27, 11 24, 14 23 L33 15 C34.5 14.3, 36 14.3, 37.5 15 L55 23 C58 24, 58 28, 55 29 C48 26, 40 22, 35 20.5 C30 22, 20 27, 14 30 C13 30.5, 12.5 29.8, 12 29 Z" fill="#ffffff" />
            <circle cx="8" cy="27" r="5.5" fill="#ffffff" />
          </svg>
          <Image src="/brand/deoca-icon.svg" alt="" width={44} height={44} priority />
        </span>
        <span className="app-header__brandText">
          <span className="app-header__title">Hệ thống KPI</span>
          <span className="app-header__company">ĐÈO CẢ GROUP</span>
        </span>
      </Link>

      {page && <nav className="app-header__breadcrumbs" aria-label="Đường dẫn trang"><ol>
        <li><Link href="/dashboard" aria-label="Trang tổng quan"><HomeIcon aria-hidden="true" /></Link></li>
        {page[0] && <li><ChevronRightIcon aria-hidden="true" /><span>{page[0]}</span></li>}
        <li aria-current="page"><ChevronRightIcon aria-hidden="true" /><span title={page[1]}>{page[1]}</span></li>
      </ol></nav>}

      <div className="app-header__actions">
        <HeaderSnowman />
        <div className="app-header__tools">
          <NotificationBell />
          <ThemeToggle />
        </div>
        <div className="app-header__account">
          <UserMenu userName={userName} />
        </div>
      </div>

      <div className="app-header__xmasLights" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span key={index} style={{ animationDelay: `${(index % 4) * 0.65}s` }} />
        ))}
      </div>
    </header>
  );
}
