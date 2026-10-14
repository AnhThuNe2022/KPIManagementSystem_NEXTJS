import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import localFont from "next/font/local";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LoginForm } from "@/features/auth/components/login-form";
import { LoginBackdrop } from "@/features/auth/components/login-backdrop";
import "@/features/auth/login.css";

const manrope = localFont({ src: "../../../../public/fonts/manrope.ttf", display: "swap", variable: "--font-login" });

export const metadata: Metadata = {
  title: "Đăng nhập | Đèo Cả KPI",
  description: "Hệ thống quản trị mục tiêu và hiệu suất của Tập đoàn Đèo Cả.",
  icons: { icon: "/brand/deoca-icon.png" },
};

export default function LoginPage() {
  return (
    <main className={`${manrope.variable} login-page`}>
      <LoginBackdrop />
      <a className="login-skip-link" href="#login-panel">Đến biểu mẫu đăng nhập</a>
      <header className="login-header">
        <a className="login-brand" href="https://deoca.vn/" target="_blank" rel="noreferrer" aria-label="Website Tập đoàn Đèo Cả (mở tab mới)">
          <Image src="/brand/deoca-group.png" alt="Đèo Cả Group — Nghĩ khác biệt, tạo cách biệt" width={960} height={389} className="login-logo" priority />
        </a>
        <div className="login-workspace"><strong>KPI Workspace</strong><span>Mục tiêu chung. Giá trị riêng.</span></div>
        <div className="login-header-actions">
          <a href="https://deoca.vn/" target="_blank" rel="noreferrer" className="login-corporate-link">Tập đoàn Đèo Cả <span aria-hidden="true">↗</span></a>
          <ThemeToggle />
        </div>
      </header>
      <div className="login-stage">
        <section className="login-story" aria-labelledby="login-story-heading">
          <div className="login-story-content">
            <p className="login-story-kicker"><span aria-hidden="true" />Mỗi ngày. Một bước tiến.</p>
            <h1 id="login-story-heading">Bắt nhịp mới.<br /><span>Tiến xa hơn.</span></h1>
            <p className="login-story-description">Kết nối mục tiêu. Ghi nhận đóng góp.<br />Cùng kiến tạo giá trị Đèo Cả.</p>
          </div>
          <div className="login-scene">
            <figure className="login-photo">
              <div className="login-photo-image">
                <Image src="/images/deoca-coast.webp" alt="Cung đường ven biển dẫn vào cửa hầm, giữa núi xanh và biển" fill priority sizes="(max-width: 700px) 100vw, 46vw" className="login-landscape" />
                <figcaption className="login-photo-caption">
                  <div><span className="login-photo-label">Dấu ấn Đèo Cả</span><strong>Kết nối những hành trình.</strong></div>
                  <a href="https://deoca.vn/" target="_blank" rel="noreferrer" aria-label="Ảnh từ website Tập đoàn Đèo Cả (mở tab mới)">Khám phá <span aria-hidden="true">↗</span></a>
                </figcaption>
              </div>
            </figure>
            <div className="login-clay" aria-hidden="true">
              <Image src="/images/deoca-kpi-clay-indigo.webp" alt="" width={1536} height={1024} sizes="(max-width: 700px) 130px, 290px" className="login-clay-art" />
            </div>
          </div>
        </section>
        <section className="login-panel" id="login-panel" aria-labelledby="login-heading">
          <div className="login-panel-welcome" aria-hidden="true"><Image src="/brand/deoca-icon.png" alt="" width={32} height={32} /></div>
          <p className="login-panel-kicker">Không gian làm việc của bạn</p>
          <h2 id="login-heading">Đăng nhập</h2>
          <p className="login-panel-description">Chào mừng trở lại! Cùng Đèo Cả<br />{" "}bắt đầu một ngày làm việc hiệu quả.</p>
          <Suspense fallback={<div className="login-form-placeholder" aria-label="Đang tải biểu mẫu đăng nhập" />}><LoginForm /></Suspense>
          <details className="login-support">
            <summary>Bạn cần hỗ trợ đăng nhập?<span aria-hidden="true">↗</span></summary>
            <p>Nếu chưa có tài khoản hoặc quên mật khẩu, vui lòng liên hệ bộ phận CNTT của đơn vị để được hỗ trợ.</p>
          </details>
          <div className="login-access-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m12 3 7 3v6c0 5-7 9-7 9s-7-4-7-9V6l7-3Z" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Kết nối nội bộ. Đồng hành cùng Đèo Cả.</span></div>
        </section>
      </div>
      <footer className="login-footer">
        <span>© {new Date().getFullYear()} Công ty Cổ phần Tập đoàn Đèo Cả</span>
        <span className="login-footer-signature">Nghĩ khác biệt, tạo cách biệt.<span aria-hidden="true">↗</span></span>
      </footer>
    </main>
  );
}
