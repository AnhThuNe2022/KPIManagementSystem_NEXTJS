"use client";

import React from "react";
import Image from "next/image";
import { Moon, ShieldCheck, Sun } from "lucide-react";
import { AppIconButton, useColorMode } from "@/components/ds";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { resolvedMode, toggleMode } = useColorMode();

  return (
    <main className="ds-auth-canvas relative isolate flex min-h-dvh flex-col overflow-clip px-4 text-primary sm:px-8 lg:px-14">
      {/* Ambient Atmospheric Orbs & Geometric Accents */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <span className="ds-auth-aura-blue absolute -right-28 -top-48 h-[680px] w-[680px] rounded-full" />
        <span className="ds-auth-aura-rose absolute -bottom-52 -left-44 h-[680px] w-[680px] rounded-full" />
        <span className="ds-auth-orb absolute right-6 top-24 hidden h-[72px] w-[72px] rounded-full sm:block lg:right-[max(32px,calc((100%-1360px)/2+24px))]" />
        <span className="ds-auth-ring absolute bottom-20 left-[max(-36px,calc((100%-1360px)/2-74px))] hidden h-[132px] w-[132px] rounded-full lg:block" />
        <span className="ds-auth-halo absolute -right-20 bottom-[9%] h-[180px] w-[180px] rounded-full sm:h-[218px] sm:w-[218px]" />
      </div>

      {/* Executive Top Header */}
      <header className="mx-auto flex min-h-[84px] w-full max-w-[1360px] items-center gap-4 sm:min-h-[100px] sm:gap-5">
        <a
          href="https://deoca.vn/"
          target="_blank"
          rel="noreferrer"
          aria-label="Website Tập đoàn Đèo Cả (mở tab mới)"
          className="ds-auth-brand shrink-0 rounded-2xl px-3 py-2 shadow-sm ds-interactive hover:-translate-y-0.5"
        >
          <Image
            src="/brand/deoca-group.svg"
            alt="Đèo Cả Group — Nghĩ khác biệt, tạo cách biệt"
            width={960}
            height={389}
            className="h-auto w-[102px] sm:w-[122px]"
            priority
          />
        </a>

        <div className="flex flex-col gap-0.5">
          <strong className="ds-auth-workspace-title inline-flex items-center gap-2 text-sm font-extrabold tracking-tight text-primary sm:text-[15.5px]">
            KPI Workspace
          </strong>
          <span className="hidden pl-3 text-xs text-secondary sm:inline">
            Mục tiêu chung. Giá trị riêng.
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <a
            href="https://deoca.vn/"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-primary ds-interactive hover:bg-surface/60 hover:text-accent md:inline-flex"
          >
            Tập đoàn Đèo Cả
            <span aria-hidden="true">↗</span>
          </a>
          <AppIconButton
            label={
              resolvedMode === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"
            }
            variant="secondary"
            size="md"
            icon={
              resolvedMode === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )
            }
            onClick={toggleMode}
          />
        </div>
      </header>

      {/* Editorial 2-Column Stage */}
      <div className="mx-auto grid w-full max-w-[1360px] flex-1 grid-cols-1 items-center gap-8 py-4 md:grid-cols-[minmax(0,1fr)_396px] md:gap-10 lg:grid-cols-[minmax(0,1fr)_468px] lg:gap-16">
        {/* Left Brand Story + Tilted Landscape & 3D Clay Sculpture */}
        <section
          className="min-w-0 pb-3 pt-1 md:pb-10"
          aria-labelledby="login-story-heading"
        >
          <div className="ds-fade-in pl-1 lg:pl-3">
            <p className="ds-auth-pill mb-5 hidden w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-secondary md:inline-flex">
              <span className="ds-auth-dot h-2 w-2 rounded-full" aria-hidden="true" />
              Mỗi ngày. Một bước tiến.
            </p>
            <h1
              id="login-story-heading"
              className="text-[34px] font-extrabold leading-[1.09] tracking-[-0.04em] text-primary sm:text-[44px] lg:text-[62px]"
            >
              Bắt nhịp mới.
              <br />
              <span className="ds-auth-headline-accent">Tiến xa hơn.</span>
            </h1>
            <p className="mt-4 hidden text-[15px] leading-relaxed text-secondary md:block">
              Kết nối mục tiêu. Ghi nhận đóng góp.
              <br />
              Cùng kiến tạo giá trị Đèo Cả.
            </p>
          </div>

          <div className="relative mt-5 md:mt-8">
            <figure className="ds-auth-photo m-0 rounded-[22px] p-1.5 md:rounded-[28px] md:p-2">
              <div className="relative isolate h-[126px] overflow-hidden rounded-[16px] bg-muted md:h-[252px] md:rounded-[20px] lg:h-[272px]">
                <Image
                  src="/images/deoca-coast.webp"
                  alt="Cung đường ven biển dẫn vào cửa hầm, giữa núi xanh và biển"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 46vw"
                  className="ds-auth-photo-img object-cover object-[55%_center]"
                />
                <div
                  className="ds-auth-photo-scrim pointer-events-none absolute inset-x-0 bottom-0 top-[38%]"
                  aria-hidden="true"
                />
                <figcaption className="ds-auth-caption absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-132px)] items-center gap-4 rounded-xl px-3 py-2 md:bottom-4 md:left-4 md:max-w-[calc(100%-184px)] md:px-4 md:py-3">
                  <div className="grid gap-0.5">
                    <span className="hidden text-[11px] font-semibold text-secondary md:inline">
                      Dấu ấn Đèo Cả
                    </span>
                    <strong className="text-xs font-bold leading-snug text-primary md:text-[13.5px]">
                      Kết nối những hành trình.
                    </strong>
                  </div>
                  <a
                    href="https://deoca.vn/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Khám phá Tập đoàn Đèo Cả (mở tab mới)"
                    className="hidden items-center gap-1 whitespace-nowrap text-xs font-bold text-accent hover:underline lg:inline-flex"
                  >
                    Khám phá <span aria-hidden="true">↗</span>
                  </a>
                </figcaption>
              </div>
            </figure>

            <div
              className="ds-auth-clay pointer-events-none absolute -bottom-6 -right-2 z-10 w-[148px] md:-bottom-12 md:-right-4 md:w-[205px] lg:-bottom-14 lg:-right-6 lg:w-[276px]"
              aria-hidden="true"
            >
              <Image
                src="/images/deoca-kpi-clay-indigo.webp"
                alt=""
                width={1536}
                height={1024}
                sizes="(max-width: 768px) 148px, 276px"
                className="ds-auth-clay-art h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* Right Frosted Glass Auth Card */}
        <section
          className="ds-auth-panel relative isolate mx-auto w-full max-w-[468px] rounded-[28px] p-7 sm:rounded-[32px] sm:p-10"
          id="login-panel"
          aria-labelledby="auth-heading"
        >
          <div
            className="ds-auth-emblem mb-5 hidden h-[56px] w-[56px] place-items-center rounded-[17px] md:inline-grid"
            aria-hidden="true"
          >
            <Image src="/brand/deoca-icon.svg" alt="" width={32} height={32} />
          </div>

          {children}

          <div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-[13px] text-secondary">
            <ShieldCheck className="h-[17px] w-[17px] shrink-0 text-accent" aria-hidden="true" />
            <span>Kết nối nội bộ · Đồng hành cùng Đèo Cả.</span>
          </div>
        </section>
      </div>

      {/* Executive Footer */}
      <footer className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-4 py-5 text-xs text-secondary">
        <span>© {new Date().getFullYear()} Công ty Cổ phần Tập đoàn Đèo Cả</span>
        <span className="hidden items-center gap-2 font-semibold sm:inline-flex">
          Nghĩ khác biệt, tạo cách biệt.
          <span className="text-sm text-error" aria-hidden="true">
            ↗
          </span>
        </span>
      </footer>
    </main>
  );
}
