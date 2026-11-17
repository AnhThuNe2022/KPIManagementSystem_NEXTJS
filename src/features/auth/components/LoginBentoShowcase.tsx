"use client";

import { useState } from "react";
import Image from "next/image";
import { CountUp, useLoginTransition } from "@/features/auth/components/LoginShell";

const SCENES = [
  {
    id: "tunnel",
    code: "01 // PORTAL",
    title: "Cửa Hầm Đôi Đèo Cả",
    coords: "12°53'N 109°24'E • CAO TỐC BẮC – NAM",
    src: "/images/deoca-coast.webp",
    alt: "Cung đường ven biển dẫn vào cửa Hầm Đèo Cả",
  },
  {
    id: "bridge",
    code: "02 // VIADUCT",
    title: "Nhịp Cầu Vượt Biển",
    coords: "HẠ TẦNG GIAO THÔNG • TẬP ĐOÀN ĐÈO CẢ",
    src: "/images/sidebar-bridge-night.webp",
    alt: "Cầu vượt biển Đèo Cả trong ánh sáng ban đêm",
  },
] as const;

export function LoginBentoShowcase() {
  const transition = useLoginTransition();
  const [sceneIndex, setSceneIndex] = useState(0);
  const activeScene = SCENES[sceneIndex];

  const isTyping = (transition?.energy ?? 0) > 0;
  const isReady = (transition?.energy ?? 0) >= 1;

  return (
    <div className="lp-bento">
      {/* CARD 1: MAIN ARCHITECTURAL VISUAL SPOTLIGHT + 3D FLYTHROUGH TRIGGER */}
      <article className="lp-tile lp-tile--hero">
        <div className="lp-hero-media">
          <Image
            key={activeScene.src}
            src={activeScene.src}
            alt={activeScene.alt}
            fill
            priority
            sizes="(max-width: 980px) 92vw, 480px"
            className="lp-hero-img"
          />
          <div className="lp-hero-scrim" />
          <span className="lp-hero-watermark" aria-hidden="true">
            ĐÈO CẢ
          </span>
        </div>

        <div className="lp-hero-top">
          <div className="lp-scene-switcher" role="tablist" aria-label="Chọn bối cảnh công trình Đèo Cả">
            {SCENES.map((scene, idx) => (
              <button
                key={scene.id}
                type="button"
                role="tab"
                aria-selected={sceneIndex === idx}
                className={`lp-scene-tab ${sceneIndex === idx ? "is-active" : ""}`}
                onClick={() => setSceneIndex(idx)}
              >
                {scene.code}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="lp-3d-btn"
            onClick={() => transition?.previewTunnel()}
            title="Chạy hiệu ứng chuyển cảnh 3D xuyên Hầm Đèo Cả"
          >
            <span className="lp-3d-btn-dot" aria-hidden="true" />
            <span>Xuyên Hầm 3D</span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="lp-hero-bottom">
          <span className="lp-hero-coords">{activeScene.coords}</span>
          <strong className="lp-hero-caption">{activeScene.title}</strong>
        </div>
      </article>

      {/* CARD 2: CHROMATIC TELEMETRY & KPI MOMENTUM (Inspired by Ref #7 '99%' Card) */}
      <article
        className={`lp-tile lp-tile--telemetry ${isTyping ? "is-energized" : ""}`}
        aria-label="Chỉ số đồng bộ mục tiêu KPI"
      >
        <div className="lp-tele-head">
          <span className="lp-tele-code">SYS.KPI // REALTIME</span>
          <span className={`lp-tele-pill ${isReady ? "is-ready" : ""}`}>
            {isReady ? "SẴN SÀNG" : "TRỰC TUYẾN"}
          </span>
        </div>

        <div className="lp-tele-metric">
          <strong>
            99.4<small>%</small>
          </strong>
          <span>Đồng bộ mục tiêu toàn tập đoàn</span>
        </div>

        <div className="lp-tele-bars" aria-hidden="true">
          <span style={{ "--h": "58%" } as React.CSSProperties} />
          <span style={{ "--h": "76%" } as React.CSSProperties} />
          <span style={{ "--h": "64%" } as React.CSSProperties} />
          <span style={{ "--h": "88%" } as React.CSSProperties} />
          <span style={{ "--h": "96%" } as React.CSSProperties} />
          <span style={{ "--h": "82%" } as React.CSSProperties} />
          <span style={{ "--h": "100%" } as React.CSSProperties} />
        </div>
      </article>

      {/* CARD 3: BAUHAUS / BRUTALIST GEOMETRIC MILESTONE CARD (Inspired by Ref #2 & #5) */}
      <article className="lp-tile lp-tile--milestone" aria-label="Cột mốc Hầm Đèo Cả 4.125m">
        <div className="lp-mile-pattern" aria-hidden="true" />
        <div className="lp-mile-top">
          <span>KM 001 — ĐÈO CẢ PASS</span>
          <span>DX // 26</span>
        </div>
        <div className="lp-mile-body">
          <strong>
            <CountUp to={4125} />
            <small>m</small>
          </strong>
          <span>Hầm đường bộ xuyên sơn • Nghĩ khác biệt, tạo cách biệt</span>
        </div>
      </article>
    </div>
  );
}
