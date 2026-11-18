"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { LoginSilkCanvas } from "./LoginSilkBackground";

export type LoginFocusField = "username" | "password" | null;
export type LoginPhase = "idle" | "entering";

type LoginCinemaContextValue = {
  focusedField: LoginFocusField;
  setFocusedField: (field: LoginFocusField) => void;
  armed: boolean;
  setArmed: (armed: boolean) => void;
  phase: LoginPhase;
  triggerEnter: () => void;
  pulseError: () => void;
};

const LoginCinemaContext = createContext<LoginCinemaContextValue | null>(null);

export function useLoginCinema() {
  return useContext(LoginCinemaContext);
}

export function LoginCinemaShell({ children }: { children: ReactNode }) {
  const [focusedField, setFocusedField] = useState<LoginFocusField>(null);
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<LoginPhase>("idle");
  const [errorPulse, setErrorPulse] = useState(false);

  const stageRef = useRef<HTMLElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerEnter = useCallback(() => {
    setPhase("entering");
  }, []);

  const pulseError = useCallback(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorPulse(false);
    requestAnimationFrame(() => {
      setErrorPulse(true);
      errorTimerRef.current = setTimeout(() => setErrorPulse(false), 1100);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (reducedMotion || coarsePointer) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      stage.style.setProperty("--spot-x", `${event.clientX.toFixed(1)}px`);
      stage.style.setProperty("--spot-y", `${event.clientY.toFixed(1)}px`);

      const panel = stage.querySelector<HTMLElement>(".login-panel");
      if (panel) {
        const rect = panel.getBoundingClientRect();
        panel.style.setProperty("--mx", `${(event.clientX - rect.left).toFixed(1)}px`);
        panel.style.setProperty("--my", `${(event.clientY - rect.top).toFixed(1)}px`);
      }

      const submitBtn = stage.querySelector<HTMLElement>(".login-submit");
      if (submitBtn) {
        const rect = submitBtn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 140) {
          const pull = 1 - dist / 140;
          submitBtn.style.setProperty("--mag-x", `${(dx * 0.045 * pull).toFixed(2)}px`);
          submitBtn.style.setProperty("--mag-y", `${(dy * 0.08 * pull).toFixed(2)}px`);
        } else {
          submitBtn.style.setProperty("--mag-x", "0px");
          submitBtn.style.setProperty("--mag-y", "0px");
        }
      }
    };

    const handlePointerLeave = () => {
      const submitBtn = stage.querySelector<HTMLElement>(".login-submit");
      if (submitBtn) {
        submitBtn.style.setProperty("--mag-x", "0px");
        submitBtn.style.setProperty("--mag-y", "0px");
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      focusedField,
      setFocusedField,
      armed,
      setArmed,
      phase,
      triggerEnter,
      pulseError,
    }),
    [focusedField, armed, phase, triggerEnter, pulseError],
  );

  return (
    <LoginCinemaContext.Provider value={contextValue}>
      <main
        ref={stageRef}
        className="login-page"
        data-focus={focusedField ?? "idle"}
        data-armed={armed}
        data-error={errorPulse}
        data-phase={phase}
      >
        <div className="login-studio-backdrop" aria-hidden="true">
          <LoginSilkCanvas
            focusedField={focusedField}
            phase={phase}
            errorPulse={errorPulse}
          />
          <div className="login-studio-grid" />
          <div className="login-studio-watermark">DEOCA</div>
          <div className="login-studio-portal" />
          <div className="login-studio-grain" />
        </div>

        {children}
      </main>
    </LoginCinemaContext.Provider>
  );
}

export function LoginRevealLine({
  children,
  delayMs = 0,
  accent = false,
}: {
  children: ReactNode;
  delayMs?: number;
  accent?: boolean;
}) {
  return (
    <span className="login-reveal">
      <span
        className={accent ? "login-reveal-text is-accent" : "login-reveal-text"}
        style={{ "--reveal-delay": `${delayMs}ms` } as CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}

export function LoginOpticalAperture() {
  const apertureRef = useRef<HTMLDivElement>(null);

  return (
    <figure
      ref={apertureRef}
      className="login-aperture"
      onPointerMove={(event) => {
        if (event.pointerType === "touch") return;
        const el = apertureRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--lx", `${(event.clientX - rect.left).toFixed(1)}px`);
        el.style.setProperty("--ly", `${(event.clientY - rect.top).toFixed(1)}px`);
        const nx = (event.clientX - rect.left) / rect.width - 0.5;
        const ny = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty("--px", `${(nx * -5).toFixed(2)}px`);
        el.style.setProperty("--py", `${(ny * -4).toFixed(2)}px`);
      }}
      onPointerLeave={() => {
        const el = apertureRef.current;
        if (!el) return;
        el.style.setProperty("--px", "0px");
        el.style.setProperty("--py", "0px");
      }}
    >
      <div className="login-aperture-media">
        <Image
          src="/images/deoca-coast.webp"
          alt="Cung đường ven biển dẫn vào cửa Hầm Đèo Cả, giữa núi xanh và biển"
          fill
          priority
          quality={95}
          sizes="(max-width: 820px) 100vw, 1200px"
          className="login-aperture-img is-active"
        />
        <div className="login-aperture-loupe" aria-hidden="true" />
        <div className="login-aperture-scrim" aria-hidden="true" />

        <figcaption className="login-aperture-overlay">
          <div className="login-aperture-copy">
            <span className="login-aperture-tag">
              <span className="login-aperture-tagDot" aria-hidden="true" />
              Dấu ấn Đèo Cả
            </span>
            <strong>Kết nối những hành trình.</strong>
          </div>
          <a
            href="https://deoca.vn/"
            target="_blank"
            rel="noreferrer"
            className="login-aperture-link"
            aria-label="Khám phá website Tập đoàn Đèo Cả (mở tab mới)"
          >
            Khám phá <span aria-hidden="true">↗</span>
          </a>
        </figcaption>
      </div>
    </figure>
  );
}
