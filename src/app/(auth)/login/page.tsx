import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LoginForm } from "@/features/auth/components/LoginForm";
import {
  LoginCinemaShell,
  LoginOpticalAperture,
  LoginRevealLine,
} from "@/features/auth/components/LoginCinema";
import { ScrambleText } from "@/features/auth/components/LoginSilkBackground";
import "@/features/auth/login.css";

export const metadata: Metadata = {
  title: "Đăng nhập | Đèo Cả KPI",
  description: "Hệ thống quản trị mục tiêu và hiệu suất của Tập đoàn Đèo Cả.",
  icons: { icon: "/brand/deoca-icon.svg" },
};

export default function LoginPage() {
  return (
    <LoginCinemaShell>
      <a className="login-skip-link" href="#login-panel">Đến biểu mẫu đăng nhập</a>
      <header className="login-header">
        <a className="login-brand" href="https://deoca.vn/" target="_blank" rel="noreferrer" aria-label="Website Tập đoàn Đèo Cả (mở tab mới)">
          <Image src="/brand/deoca-group.svg" alt="Đèo Cả Group — Nghĩ khác biệt, tạo cách biệt" width={960} height={389} className="login-logo" priority />
        </a>
        <div className="login-header-actions">
          <span className="login-workspace-tag">KPI Workspace</span>
          <a href="https://deoca.vn/" target="_blank" rel="noreferrer" className="login-corporate-link">deoca.vn <span aria-hidden="true">↗</span></a>
          <ThemeToggle />
        </div>
      </header>

      <div className="login-stage">
        <section className="login-story" aria-labelledby="login-story-heading">
          <div className="login-story-content">
            <p className="login-story-kicker">
              <span className="login-kicker-dot" aria-hidden="true" />
              <span className="login-kicker-coords">
                <ScrambleText text={`12°53'14"N · 109°24'08"E`} delayMs={140} />
              </span>
              <span className="login-kicker-sep" aria-hidden="true">·</span>
              <span>ĐÈO CẢ GROUP</span>
            </p>
            <h1 id="login-story-heading">
              <LoginRevealLine delayMs={80}>Bắt nhịp mới.</LoginRevealLine>
              <LoginRevealLine delayMs={210} accent>Tiến xa hơn.</LoginRevealLine>
            </h1>
            <div className="login-story-rule" aria-hidden="true" />
            <p className="login-story-description">
              Kết nối mục tiêu. Ghi nhận đóng góp.
              <br />
              Cùng kiến tạo giá trị Tập đoàn Đèo Cả.
            </p>
          </div>

          <LoginOpticalAperture />
        </section>

        <div className="login-panel-slot">
          <section className="login-panel" id="login-panel" aria-labelledby="login-heading">
            <div className="login-panel-rim" aria-hidden="true" />
            <div className="login-panel-head">
              <div className="login-panel-welcome" aria-hidden="true">
                <Image src="/brand/deoca-icon.svg" alt="" width={30} height={30} />
              </div>
              <div>
                <p className="login-panel-kicker">Không gian làm việc của bạn</p>
                <h2 id="login-heading">Đăng nhập</h2>
              </div>
            </div>
            <p className="login-panel-description">Chào mừng trở lại! Cùng Đèo Cả bắt đầu một ngày làm việc hiệu quả.</p>
            <Suspense fallback={<div className="login-form-placeholder" aria-label="Đang tải biểu mẫu đăng nhập" />}>
              <LoginForm />
            </Suspense>
            <details className="login-support">
              <summary>Bạn cần hỗ trợ đăng nhập?<span aria-hidden="true">↗</span></summary>
              <p>Nếu chưa có tài khoản hoặc quên mật khẩu, vui lòng liên hệ bộ phận CNTT của đơn vị để được hỗ trợ.</p>
            </details>
            <div className="login-access-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="m12 3 7 3v6c0 5-7 9-7 9s-7-4-7-9V6l7-3Z" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Kết nối nội bộ. Đồng hành cùng Đèo Cả.</span>
            </div>
          </section>
        </div>
      </div>

      <footer className="login-footer">
        <span>© {new Date().getFullYear()} Công ty Cổ phần Tập đoàn Đèo Cả</span>
        <span className="login-footer-signature">Nghĩ khác biệt, tạo cách biệt.</span>
      </footer>
    </LoginCinemaShell>
  );
}
