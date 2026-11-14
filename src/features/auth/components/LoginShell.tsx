"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

export type FocusedField = "username" | "password" | null;

type LoginTransition = {
  start: () => void;
  cancel: () => void;
  previewTunnel: () => void;
  energy: number;
  setEnergy: (val: number) => void;
  focusedField: FocusedField;
  setFocusedField: (field: FocusedField) => void;
};

const LoginTransitionContext = createContext<LoginTransition | null>(null);

export const useLoginTransition = () => useContext(LoginTransitionContext);

/**
 * Real-time 3D Architectural Tunnel Fly-Through Canvas
 * Renders an authentic perspective fly-through of Hầm Đèo Cả (twin rows of ceiling LEDs,
 * ceramic-tiled lower walls, vault ribs, traffic light streams, and daylight exit bloom).
 */
function TunnelFlythroughCanvas({
  isPreview,
  onClose,
}: {
  isPreview: boolean;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let rafId = 0;
    const startTime = performance.now();
    const duration = isPreview ? 2600 : 1800;

    const render = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / duration);
      setProgress(Math.round(p * 100));

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      const width = canvas.width;
      const height = canvas.height;
      const cx = width * 0.5;
      const cy = height * 0.48;
      const fov = Math.min(width, height) * 0.88;

      // Smooth cubic ease-in-out acceleration through the 4,125m tunnel
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const camZ = eased * 1450;
      const tunnelEndZ = 1650;

      // Deep tunnel backdrop
      ctx.fillStyle = "#060913";
      ctx.fillRect(0, 0, width, height);

      const radiusX = 52;
      const radiusY = 42;
      const camY = 16;

      const project = (wx: number, wy: number, wz: number) => {
        const dz = wz - camZ;
        if (dz <= 4) return null;
        const scale = fov / dz;
        return {
          x: cx + wx * scale,
          y: cy - (wy - camY) * scale,
          scale,
          dz,
        };
      };

      // Road deck inside tunnel
      const nearZ = camZ + 6;
      const rNearL = project(-radiusX + 3, 0, nearZ);
      const rNearR = project(radiusX - 3, 0, nearZ);
      const rFarL = project(-radiusX + 3, 0, tunnelEndZ);
      const rFarR = project(radiusX - 3, 0, tunnelEndZ);

      if (rNearL && rNearR && rFarL && rFarR) {
        const roadGrad = ctx.createLinearGradient(0, rFarL.y, 0, rNearL.y);
        roadGrad.addColorStop(0, "#1e293b");
        roadGrad.addColorStop(1, "#0f172a");
        ctx.beginPath();
        ctx.moveTo(rNearL.x, rNearL.y);
        ctx.lineTo(rNearR.x, rNearR.y);
        ctx.lineTo(rFarR.x, rFarR.y);
        ctx.lineTo(rFarL.x, rFarL.y);
        ctx.closePath();
        ctx.fillStyle = roadGrad;
        ctx.fill();
      }

      // Receding 3D tunnel vault ribs & twin ceiling LED luminaire rows
      const step = 28;
      const firstRingZ = Math.floor(nearZ / step) * step + step;
      for (let z = tunnelEndZ; z >= firstRingZ; z -= step) {
        const pCenter = project(0, 0, z);
        if (!pCenter) continue;

        const rx = radiusX * pCenter.scale;
        const ry = radiusY * pCenter.scale;
        const depthFade = Math.max(0.08, 1 - (z - camZ) / 1400);

        // Concrete arch rib
        ctx.beginPath();
        ctx.ellipse(pCenter.x, pCenter.y, rx, ry, 0, Math.PI, 0, false);
        ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 * depthFade})`;
        ctx.lineWidth = Math.max(1, 2.2 * pCenter.scale);
        ctx.stroke();

        // Lower ceramic tile wall trim lines
        for (const side of [-1, 1]) {
          const w1 = project(side * (radiusX - 2), 14, z);
          const w2 = project(side * (radiusX - 2), 14, Math.max(nearZ, z - step));
          if (w1 && w2) {
            ctx.beginPath();
            ctx.moveTo(w1.x, w1.y);
            ctx.lineTo(w2.x, w2.y);
            ctx.strokeStyle = `rgba(226, 232, 240, ${0.32 * depthFade})`;
            ctx.lineWidth = Math.max(1, 1.8 * w1.scale);
            ctx.stroke();
          }
        }

        // Twin ceiling LED strips (Warm Amber & Electric Sky)
        for (const angle of [Math.PI * 0.28, Math.PI * 0.72]) {
          const lx = Math.cos(angle) * (radiusX - 2.5);
          const ly = Math.sin(angle) * (radiusY - 2.5);
          const l1 = project(lx, ly, z);
          const l2 = project(lx, ly, Math.max(nearZ, z - step * 0.65));
          if (l1 && l2) {
            ctx.beginPath();
            ctx.moveTo(l1.x, l1.y);
            ctx.lineTo(l2.x, l2.y);
            ctx.strokeStyle =
              angle < Math.PI * 0.5
                ? `rgba(251, 191, 36, ${0.85 * depthFade})`
                : `rgba(56, 189, 248, ${0.85 * depthFade})`;
            ctx.lineWidth = Math.max(1.5, 4 * l1.scale);
            ctx.stroke();
          }
        }

        // High-speed light-trails along road lanes
        if (Math.floor(z / step) % 2 === 0) {
          for (const laneX of [-18, 18]) {
            const m1 = project(laneX, 0.5, z);
            const m2 = project(laneX, 0.5, Math.max(nearZ, z - step * 0.7));
            if (m1 && m2) {
              ctx.beginPath();
              ctx.moveTo(m1.x, m1.y);
              ctx.lineTo(m2.x, m2.y);
              ctx.strokeStyle =
                laneX > 0
                  ? `rgba(225, 29, 72, ${0.75 * depthFade})`
                  : `rgba(16, 185, 129, ${0.75 * depthFade})`;
              ctx.lineWidth = Math.max(1.2, 3 * m1.scale);
              ctx.stroke();
            }
          }
        }
      }

      // Daylight portal glow at the end of Hầm Đèo Cả
      const exitProj = project(0, 14, tunnelEndZ);
      if (exitProj) {
        const exitR = Math.max(24, radiusX * exitProj.scale * (1 + p * 1.4));
        const glow = ctx.createRadialGradient(
          exitProj.x,
          exitProj.y,
          exitR * 0.08,
          exitProj.x,
          exitProj.y,
          exitR * 3.4
        );
        glow.addColorStop(0, "rgba(255, 255, 255, 1)");
        glow.addColorStop(0.35, "rgba(186, 230, 253, 0.82)");
        glow.addColorStop(0.7, "rgba(37, 99, 235, 0.28)");
        glow.addColorStop(1, "rgba(6, 9, 19, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(exitProj.x, exitProj.y, exitR * 3.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Final portal exit bloom
      if (p > 0.78) {
        const b = (p - 0.78) / 0.22;
        ctx.fillStyle = `rgba(247, 247, 245, ${b * 0.92})`;
        ctx.fillRect(0, 0, width, height);
      }

      if (p < 1) {
        rafId = requestAnimationFrame(render);
      } else if (isPreview) {
        onClose();
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [isPreview, onClose]);

  return (
    <div className="lp-tunnel-overlay" role="status" aria-live="polite">
      <canvas ref={canvasRef} className="lp-tunnel-canvas" />
      <div className="lp-tunnel-hud">
        <div className="lp-tunnel-hud-top">
          <span className="lp-tunnel-tag">DCG // 3D TUNNEL TRANSITION</span>
          <span className="lp-tunnel-coords">HẦM ĐÈO CẢ • 4.125M • {progress}%</span>
        </div>
        <div className="lp-tunnel-hud-center">
          <p className="lp-tunnel-kicker">XUYÊN SƠN MỞ LỐI</p>
          <h3>
            {isPreview
              ? "Mô phỏng hành trình xuyên Hầm Đèo Cả"
              : "Đang kết nối vào Không gian KPI Đèo Cả..."}
          </h3>
          <div className="lp-tunnel-progress">
            <div className="lp-tunnel-progress-bar" style={{ width: `${Math.max(8, progress)}%` }} />
          </div>
          {isPreview && (
            <button type="button" className="lp-tunnel-close" onClick={onClose}>
              Đóng mô phỏng ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoginShell({ className, children }: { className: string; children: ReactNode }) {
  const [going, setGoing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  const transition = useMemo<LoginTransition>(
    () => ({
      start: () => setGoing(true),
      cancel: () => setGoing(false),
      previewTunnel: () => setPreviewing(true),
      energy,
      setEnergy,
      focusedField,
      setFocusedField,
    }),
    [energy, focusedField]
  );

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = event.currentTarget;
    el.style.setProperty("--px", (event.clientX / window.innerWidth - 0.5).toFixed(3));
    el.style.setProperty("--py", (event.clientY / window.innerHeight - 0.5).toFixed(3));
  }, []);

  return (
    <LoginTransitionContext.Provider value={transition}>
      <main
        className={className}
        onPointerMove={onPointerMove}
        data-going={going || previewing || undefined}
        data-focus={focusedField || undefined}
      >
        {children}
        {(going || previewing) && (
          <TunnelFlythroughCanvas
            isPreview={previewing && !going}
            onClose={() => setPreviewing(false)}
          />
        )}
      </main>
    </LoginTransitionContext.Provider>
  );
}

/** Số đếm lên mượt (ease-out), tôn trọng prefers-reduced-motion. */
export function CountUp({ to, duration = 1600 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let frame = 0;
    const startedAt = performance.now() + 320;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
      setValue(Math.round(to * (1 - Math.pow(1 - progress, 4))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return <>{new Intl.NumberFormat("vi-VN").format(value)}</>;
}
