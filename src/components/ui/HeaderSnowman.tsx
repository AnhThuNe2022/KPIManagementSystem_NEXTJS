"use client";

import { useEffect, useRef, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import "./HeaderSnowman.css";

const FLAKES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: ((i * 37 + 13) % 98) + 1,
  size: 3 + (i % 4),
  duration: 9 + (i % 5) * 1.5,
  delay: -((i * 1.4) % 10),
  drift: (i % 2 === 0 ? 1 : -1) * (12 + (i % 4) * 8),
}));

export function HeaderSnowman() {
  const [open, setOpen] = useState(false);
  const [snowOn, setSnowOn] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="header-snowman" ref={wrapRef}>
        <button
          type="button"
          className="header-snowman__trigger"
          data-open={open}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Mở thiệp Giáng sinh"
          title={open ? "Thu ông già Noel" : "Bấm xem ông già Noel"}
          onClick={() => setOpen((value) => !value)}
        >
          <svg className="header-snowman__svg" viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <clipPath id="chimney-santa-clip">
                <rect x="0" y="0" width="64" height="44" />
              </clipPath>
            </defs>

            {/* Chimney interior shadow */}
            <rect x="17" y="42" width="30" height="4" rx="1" fill="#3f1010" />

            {/* Santa clipped at chimney rim */}
            <g clipPath="url(#chimney-santa-clip)">
              <g className="header-snowman__santa">
                {/* Gift sack behind right shoulder */}
                <path d="M36 22 C46 21, 52 28, 49 39 C47 44, 40 45, 36 42 Z" fill="#855b3c" />
                <rect x="38" y="16" width="5" height="6" rx="1" transform="rotate(-14 40 19)" fill="#dc2626" />
                <path d="M40.5 16 L40.5 22" stroke="#15803d" strokeWidth="1.3" />
                {/* Coat & belt */}
                <path d="M18 44 C18 33, 22 29, 31 29 C40 29, 43 33, 43 44 Z" fill="#dc2626" />
                <rect x="19" y="38" width="23" height="3.2" fill="#1e293b" />
                <rect x="28.5" y="37.5" width="4.5" height="4.2" rx="0.8" fill="#fbbf24" />
                {/* Beard */}
                <path d="M22 24 C21 34, 26 39, 31 39 C36 39, 40 34, 39 24 Z" fill="#f8fafc" />
                {/* Face */}
                <circle cx="31" cy="21" r="6" fill="#fed7aa" />
                <circle cx="28.6" cy="20.2" r="0.9" fill="#1e293b" />
                <circle cx="33.4" cy="20.2" r="0.9" fill="#1e293b" />
                <circle cx="31" cy="22" r="1.4" fill="#ef4444" />
                <path d="M25.5 23.5 Q28.2 25.5 31 23.8 Q33.8 25.5 36.5 23.5" fill="#ffffff" />
                {/* Hat */}
                <path d="M24.5 17 L31 6 L37.5 17 Z" fill="#dc2626" />
                <rect x="23.5" y="16" width="15" height="3.2" rx="1.6" fill="#ffffff" />
                <circle cx="31" cy="5.5" r="2.6" fill="#ffffff" />
                {/* Left mitten on chimney rim & right hand holding sack */}
                <circle cx="20" cy="41.5" r="3" fill="#0f766e" />
                <circle cx="36" cy="30" r="2.6" fill="#0f766e" />
              </g>
            </g>

            {/* Snow piles beside chimney */}
            <path d="M13 58 Q17 53 22 58 Z" fill="#f1f5f9" />
            <path d="M42 58 Q47 53 51 58 Z" fill="#f1f5f9" />

            {/* Brick Chimney */}
            <path d="M16 44 L48 44 L45 58 L19 58 Z" fill="#882424" />
            <rect x="13.5" y="40.5" width="37" height="5" rx="1.4" fill="#9f2b2b" />
            <path d="M19 48.5 H45 M20 53.5 H44 M27 45.5 V48.5 M37 45.5 V48.5 M23 48.5 V53.5 M33 48.5 V53.5 M28 53.5 V58 M38 53.5 V58" stroke="#641616" strokeWidth="1" opacity="0.55" />
          </svg>
        </button>

        {open && (
          <div className="header-snowman__popover" role="dialog" aria-label="Lời chúc Giáng sinh">
            <div className="header-snowman__popHead">
              <span>🎅 Giáng sinh an lành</span>
              <button type="button" aria-label="Đóng" onClick={() => setOpen(false)}>
                <Cross2Icon aria-hidden="true" />
              </button>
            </div>
            <p className="header-snowman__popText">
              Chúc bạn một mùa Giáng sinh ấm áp và hoàn thành xuất sắc mọi mục tiêu KPI cùng Đèo Cả Group!
            </p>
            <button
              type="button"
              className="header-snowman__snowBtn"
              data-active={snowOn}
              onClick={() => setSnowOn((value) => !value)}
            >
              <span>❄️ {snowOn ? "Đang bật tuyết rơi" : "Bật tuyết rơi nhẹ"}</span>
              <small>{snowOn ? "Tắt" : "Bật"}</small>
            </button>
          </div>
        )}
      </div>

      {snowOn && (
        <div className="header-snowman__overlay" aria-hidden="true">
          {FLAKES.map((flake) => (
            <span
              key={flake.id}
              className="header-snowman__flake"
              style={{
                left: `${flake.left}%`,
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                animationDuration: `${flake.duration}s`,
                animationDelay: `${flake.delay}s`,
                ["--snow-drift" as string]: `${flake.drift}px`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
