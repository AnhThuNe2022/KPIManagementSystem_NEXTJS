"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ArrowLeftIcon, ArrowRightIcon, DashboardIcon } from "@radix-ui/react-icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useMyMenus } from "@/features/menus/components/MenuAccessGuard";
import {
  resolveWorkspaceCards,
  WORKSPACES,
  type WorkspaceIconKey,
  type WorkspaceOption,
} from "../workspaces";
import { WorkspaceAmbientWidget } from "./WorkspaceAmbientWidgets";
import "./WorkspacePortal.css";

const DRAG_ACTIVATION_PX = 6;
const SPRING_STIFFNESS = 185;
const SPRING_DAMPING = 25.5;
const TRACKPAD_PX_PER_CARD = 180;
const WHEEL_SNAP_DELAY_MS = 120;
const MAX_RELEASE_VEL = 14;

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total;
}

function shortestOffset(index: number, active: number, total: number) {
  let diff = index - active;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

function wrapContinuous(offset: number, total: number) {
  const half = total / 2;
  const value = ((offset + half) % total + total) % total - half;
  return value === -half ? half : value;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function computeCardLayout(index: number, position: number, total: number, radiusX: number) {
  const angle = (wrapContinuous(index - position, total) / total) * Math.PI * 2;
  const sin = Math.sin(angle);
  const depth = (1 + Math.cos(angle)) / 2;
  const opacity = smoothstep(0.24, 0.6, depth) * (0.5 + 0.5 * depth * depth);
  const hidden = opacity < 0.005;

  return {
    transform: `translate3d(${(sin * radiusX).toFixed(2)}px, ${((1 - depth) * 28).toFixed(2)}px, ${(-(1 - depth) * 340).toFixed(2)}px) rotateY(${(-sin * 20).toFixed(2)}deg) scale(${(0.66 + depth * 0.34).toFixed(4)})`,
    opacity: hidden ? 0 : Number(opacity.toFixed(3)),
    zIndex: Math.round(10 + depth * 40),
    visibility: (hidden ? "hidden" : "visible") as "hidden" | "visible",
    pointerEvents: (opacity < 0.08 ? "none" : "auto") as "none" | "auto",
  };
}

const INITIAL_CARD_STYLES: readonly CSSProperties[] = WORKSPACES.map((_, i) =>
  computeCardLayout(i, 0, WORKSPACES.length, 340),
);

function WorkspaceEmblem({ kind }: { kind: WorkspaceIconKey }) {
  if (kind === "kpi") {
    return (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="6" y="21" width="6" height="12" rx="2.5" fill="currentColor" opacity="0.32" />
        <rect x="17" y="14" width="6" height="19" rx="2.5" fill="currentColor" opacity="0.65" />
        <rect x="28" y="8" width="6" height="25" rx="2.5" fill="currentColor" />
        <path d="M8 15.5L17.5 10L24 12.5L32.5 5.5" stroke="rgb(var(--deoca-accent-rgb))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "p2") {
    return (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M20 7L33 14L20 21L7 14L20 7Z" fill="currentColor" opacity="0.9" />
        <path d="M7 20.5L20 27.5L33 20.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.58" />
        <path d="M7 26.5L20 33.5L33 26.5" stroke="rgb(var(--deoca-accent-rgb))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "upcoming-2") {
    return (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="2.2" opacity="0.45" />
        <circle cx="20" cy="20" r="5" stroke="currentColor" strokeWidth="2.2" />
        <path d="M20 5.5V10.5M20 29.5V34.5M5.5 20H10.5M29.5 20H34.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.72" />
      </svg>
    );
  }
  if (kind === "upcoming-3") {
    return (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="7" y="9" width="26" height="16" rx="4" stroke="currentColor" strokeWidth="2.2" opacity="0.58" />
        <path d="M12 29.5H28M15 17H25" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.82" />
        <circle cx="20" cy="17" r="2.2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="7" y="7" width="11" height="11" rx="3" stroke="currentColor" strokeWidth="2.2" opacity="0.55" />
      <rect x="22" y="7" width="11" height="11" rx="3" stroke="currentColor" strokeWidth="2.2" opacity="0.55" />
      <rect x="7" y="22" width="11" height="11" rx="3" stroke="currentColor" strokeWidth="2.2" opacity="0.55" />
      <path d="M27.5 23.5V31.5M23.5 27.5H31.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function WorkspaceSwitcherButton() {
  const { activeWorkspaceName } = useMyMenus();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="app-header__workspaceBtn"
        aria-label="Mở trang chuyển đổi Workspace"
        title="Chuyển đổi Workspace"
        onClick={() => setOpen(true)}
      >
        <DashboardIcon aria-hidden="true" />
        <span>{activeWorkspaceName || "Workspace"}</span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(<WorkspacePortal onClose={() => setOpen(false)} />, document.body)
        : null}
    </>
  );
}

function WorkspacePortal({ onClose }: { onClose: () => void }) {
  const { allMenus, activeWorkspaceId, switchWorkspace } = useMyMenus();
  const workspaces = useMemo(
    () => resolveWorkspaceCards(allMenus, activeWorkspaceId),
    [allMenus, activeWorkspaceId],
  );
  const total = workspaces.length;
  const initialIndex = useMemo(() => {
    const idx = workspaces.findIndex((ws) => ws.workspaceId === activeWorkspaceId);
    return idx >= 0 ? idx : 0;
  }, [activeWorkspaceId, workspaces]);
  const initialCardStyles = useMemo<readonly CSSProperties[]>(
    () =>
      total === INITIAL_CARD_STYLES.length && initialIndex === 0
        ? INITIAL_CARD_STYLES
        : Array.from({ length: total }, (_, idx) => computeCardLayout(idx, initialIndex, total, 340)),
    [initialIndex, total],
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [dragging, setDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const radiusXRef = useRef(340);
  const activeIndexRef = useRef(initialIndex);
  const suppressClickRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const finePointerRef = useRef(false);
  const glareCardIdxRef = useRef(-1);

  const physicsRef = useRef({
    pos: initialIndex,
    vel: 0,
    target: initialIndex,
    dragging: false,
    lastTime: 0,
    rafId: 0,
    wheelSnapTimer: 0,
  });

  const dragRef = useRef<{
    pointerId: number | null;
    startX: number;
    startPos: number;
    captured: boolean;
    samples: Array<{ x: number; t: number }>;
  }>({ pointerId: null, startX: 0, startPos: 0, captured: false, samples: [] });

  const clearCardGlare = useCallback((idx: number) => {
    if (idx >= 0) cardRefs.current[idx]?.style.setProperty("--glare-opacity", "0");
  }, []);

  const applyFrame = useCallback(
    (pos: number) => {
      const radiusX = radiusXRef.current;
      for (let i = 0; i < total; i += 1) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const layout = computeCardLayout(i, pos, total, radiusX);
        el.style.transform = layout.transform;
        el.style.opacity = String(layout.opacity);
        el.style.zIndex = String(layout.zIndex);
        el.style.visibility = layout.visibility;
        el.style.pointerEvents = layout.pointerEvents;
      }

      const nearest = wrapIndex(Math.round(pos), total);
      if (nearest !== activeIndexRef.current) {
        if (glareCardIdxRef.current === activeIndexRef.current) {
          clearCardGlare(activeIndexRef.current);
          glareCardIdxRef.current = -1;
        }
        activeIndexRef.current = nearest;
        setActiveIndex(nearest);
      }
    },
    [clearCardGlare, total],
  );

  const startLoop = useCallback(() => {
    const p = physicsRef.current;
    if (reducedMotionRef.current && !p.dragging) {
      p.pos = p.target;
      p.vel = 0;
      applyFrame(p.pos);
      return;
    }
    if (p.rafId) return;
    p.lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - p.lastTime) / 1000));
      p.lastTime = now;

      if (!p.dragging) {
        p.vel += ((p.target - p.pos) * SPRING_STIFFNESS - p.vel * SPRING_DAMPING) * dt;
        p.pos += p.vel * dt;
        applyFrame(p.pos);

        if (!p.wheelSnapTimer && Math.abs(p.target - p.pos) < 0.0008 && Math.abs(p.vel) < 0.004) {
          p.pos = p.target;
          p.vel = 0;
          applyFrame(p.pos);
          p.rafId = 0;
          return;
        }
      } else {
        applyFrame(p.pos);
      }
      p.rafId = window.requestAnimationFrame(tick);
    };

    p.rafId = window.requestAnimationFrame(tick);
  }, [applyFrame]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const reducedMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
    reducedMotionRef.current = reducedMedia.matches;
    finePointerRef.current = pointerMedia.matches;
    const onReduced = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches; };
    const onPointer = (e: MediaQueryListEvent) => { finePointerRef.current = e.matches; };
    reducedMedia.addEventListener("change", onReduced);
    pointerMedia.addEventListener("change", onPointer);
    return () => {
      document.body.style.overflow = prevOverflow;
      reducedMedia.removeEventListener("change", onReduced);
      pointerMedia.removeEventListener("change", onPointer);
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const physics = physicsRef.current;
    const update = () => {
      radiusXRef.current = Math.min(350, Math.max(175, (el.clientWidth || 960) * 0.36));
      applyFrame(physics.pos);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (physics.rafId) window.cancelAnimationFrame(physics.rafId);
      if (physics.wheelSnapTimer) window.clearTimeout(physics.wheelSnapTimer);
    };
  }, [applyFrame]);

  const goTo = useCallback(
    (next: number) => {
      const p = physicsRef.current;
      if (p.wheelSnapTimer) {
        window.clearTimeout(p.wheelSnapTimer);
        p.wheelSnapTimer = 0;
      }
      const base = Math.round(p.target);
      p.target = base + shortestOffset(wrapIndex(next, total), wrapIndex(base, total), total);
      startLoop();
    },
    [startLoop, total],
  );

  const step = useCallback(
    (delta: number) => {
      const p = physicsRef.current;
      if (p.wheelSnapTimer) {
        window.clearTimeout(p.wheelSnapTimer);
        p.wheelSnapTimer = 0;
      }
      p.target = Math.round(p.target) + delta;
      startLoop();
    },
    [startLoop],
  );

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, step]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: globalThis.WheelEvent) => {
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(raw) < 1) return;
      event.preventDefault();

      const deltaPx = event.deltaMode === 1 ? raw * 36 : event.deltaMode === 2 ? raw * 320 : raw;
      const p = physicsRef.current;
      const isNotch =
        event.deltaMode !== 0 || (event.deltaX === 0 && Math.abs(deltaPx) >= 80 && Number.isInteger(deltaPx));

      if (isNotch) {
        if (p.wheelSnapTimer) { window.clearTimeout(p.wheelSnapTimer); p.wheelSnapTimer = 0; }
        p.target = Math.round(p.target) + Math.sign(deltaPx);
      } else {
        p.target += deltaPx / TRACKPAD_PX_PER_CARD;
        if (p.wheelSnapTimer) window.clearTimeout(p.wheelSnapTimer);
        p.wheelSnapTimer = window.setTimeout(() => {
          p.wheelSnapTimer = 0;
          p.target = Math.round(p.target);
          startLoop();
        }, WHEEL_SNAP_DELAY_MS);
      }
      startLoop();
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [startLoop]);

  function handleCardPointerMove(event: PointerEvent<HTMLElement>, index: number) {
    if (
      event.pointerType !== "mouse" ||
      reducedMotionRef.current ||
      !finePointerRef.current ||
      physicsRef.current.dragging ||
      index !== activeIndexRef.current
    ) return;
    const card = cardRefs.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (glareCardIdxRef.current >= 0 && glareCardIdxRef.current !== index) clearCardGlare(glareCardIdxRef.current);
    glareCardIdxRef.current = index;
    card.style.setProperty("--glare-x", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
    card.style.setProperty("--glare-y", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
    card.style.setProperty("--glare-opacity", "1");
  }

  function handleCardPointerLeave(index: number) {
    if (glareCardIdxRef.current !== index) return;
    clearCardGlare(index);
    glareCardIdxRef.current = -1;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.button !== 0 && event.pointerType === "mouse") || (event.target as HTMLElement).closest("button, a")) return;
    const p = physicsRef.current;
    if (p.wheelSnapTimer) { window.clearTimeout(p.wheelSnapTimer); p.wheelSnapTimer = 0; }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPos: p.pos,
      captured: false,
      samples: [{ x: event.clientX, t: performance.now() }],
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const now = performance.now();

    if (!drag.captured) {
      if (Math.abs(dx) < DRAG_ACTIVATION_PX) return;
      drag.captured = true;
      drag.startX = event.clientX;
      drag.startPos = physicsRef.current.pos;
      drag.samples = [{ x: event.clientX, t: now }];
      suppressClickRef.current = true;
      physicsRef.current.dragging = true;
      physicsRef.current.vel = 0;
      if (glareCardIdxRef.current >= 0) { clearCardGlare(glareCardIdxRef.current); glareCardIdxRef.current = -1; }
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    drag.samples.push({ x: event.clientX, t: now });
    while (drag.samples.length > 2 && drag.samples[0].t < now - 90) drag.samples.shift();

    const nextPos = drag.startPos - dx / Math.max(240, radiusXRef.current * 0.92);
    physicsRef.current.pos = nextPos;
    physicsRef.current.target = nextPos;
    applyFrame(nextPos);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    const p = physicsRef.current;

    if (drag.captured) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      const pxPerCard = Math.max(240, radiusXRef.current * 0.92);
      let velCards = 0;
      if (drag.samples.length >= 2) {
        const first = drag.samples[0];
        const last = drag.samples[drag.samples.length - 1];
        const velPx = (last.x - first.x) / Math.max(0.012, (last.t - first.t) / 1000);
        velCards = Math.max(-MAX_RELEASE_VEL, Math.min(MAX_RELEASE_VEL, -velPx / pxPerCard));
      }

      p.dragging = false;
      p.vel = velCards;
      const baseSlot = Math.round(drag.startPos);
      let nextTarget = Math.round(p.pos + velCards * 0.19);
      if (nextTarget === baseSlot && Math.abs(velCards) > 1.1) nextTarget = baseSlot + (velCards > 0 ? 1 : -1);
      p.target = nextTarget;
      startLoop();
      requestAnimationFrame(() => { suppressClickRef.current = false; });
    }

    dragRef.current = { pointerId: null, startX: 0, startPos: 0, captured: false, samples: [] };
    setDragging(false);
  }

  function selectWorkspace(workspace: WorkspaceOption) {
    if (!workspace.available || !workspace.workspaceId) return;
    switchWorkspace(workspace.workspaceId);
    onClose();
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, index: number, isCenter: boolean) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (isCenter) selectWorkspace(workspaces[index]);
    else goTo(index);
  }

  const activeWorkspace = workspaces[activeIndex] ?? workspaces[0];
  const activeAura = activeWorkspace.available ? activeWorkspace.icon : "upcoming";

  return (
    <div
      className="workspace-portal__root"
      data-workspace={activeAura}
      role="dialog"
      aria-modal="true"
      aria-label="Chuyển đổi không gian làm việc"
    >
      <div className="workspace-portal__backdrop" aria-hidden="true">
        <div className="workspace-portal__pearl" />
        <div className="workspace-portal__horizon">
          <Image src="/images/deoca-coast.webp" alt="" fill priority sizes="100vw" className="workspace-portal__horizonImg" />
        </div>
        <div className="workspace-portal__aura" data-kind="kpi" data-active={activeAura === "kpi" ? "true" : undefined} />
        <div className="workspace-portal__aura" data-kind="p2" data-active={activeAura === "p2" ? "true" : undefined} />
        <div className="workspace-portal__aura" data-kind="upcoming" data-active={activeAura === "upcoming" ? "true" : undefined} />
        <div className="workspace-portal__bokeh"><span /><span /><span /><span /><span /><span /></div>
      </div>

      <header className="workspace-portal__topBar">
        <div className="workspace-portal__brand">
          <span className="workspace-portal__brandLogo">
            <Image src="/brand/deoca-icon.svg" alt="" width={34} height={34} priority />
          </span>
          <div className="workspace-portal__brandCopy">
            <strong>ĐÈO CẢ GROUP</strong>
            <span>Cổng không gian làm việc</span>
          </div>
        </div>

        <div className="workspace-portal__topActions">
          <button type="button" className="workspace-portal__backBtn" onClick={onClose}>
            <ArrowLeftIcon aria-hidden="true" />
            <span>Quay lại trang hiện tại</span>
          </button>
          <div className="workspace-portal__themeWrap">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="workspace-portal__main">
        <div className="workspace-portal__intro">
          <h1>Chọn không gian làm việc</h1>
          <p>Kéo hoặc cuộn để xoay vòng mượt mà và chọn phân hệ cần thao tác.</p>
        </div>

        <div
          ref={stageRef}
          className="workspace-portal__stage"
          data-dragging={dragging ? "true" : undefined}
          role="region"
          aria-roledescription="carousel"
          aria-label="Danh sách Workspace"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          {workspaces.map((workspace, index) => {
            const isCenter = index === activeIndex;
            return (
              <article
                key={workspace.id}
                ref={(node) => { cardRefs.current[index] = node; }}
                className="workspace-portal__card"
                data-active={isCenter ? "true" : undefined}
                data-available={workspace.available ? "true" : "false"}
                style={initialCardStyles[index]}
                tabIndex={isCenter ? 0 : -1}
                aria-current={isCenter ? "true" : undefined}
                onPointerMove={(e) => handleCardPointerMove(e, index)}
                onPointerLeave={() => handleCardPointerLeave(index)}
                onKeyDown={(e) => handleCardKeyDown(e, index, isCenter)}
                onClick={() => { if (!suppressClickRef.current && !isCenter) goTo(index); }}
              >
                <div className="workspace-portal__cardTop">
                  <span className="workspace-portal__emblem" data-kind={workspace.icon}>
                    <WorkspaceEmblem kind={workspace.icon} />
                  </span>
                  <span className="workspace-portal__status" data-available={workspace.available ? "true" : "false"}>
                    {workspace.statusLabel}
                  </span>
                </div>

                <div className="workspace-portal__cardBody">
                  <h2>{workspace.name}</h2>
                  <p>{workspace.description}</p>
                </div>

                <div className="workspace-portal__cardFoot">
                  <button
                    type="button"
                    className="workspace-portal__enterBtn"
                    disabled={!workspace.available}
                    tabIndex={isCenter ? 0 : -1}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectWorkspace(workspace);
                    }}
                  >
                    <span>{workspace.available ? "Mở không gian" : workspace.statusLabel}</span>
                    {workspace.available && <ArrowRightIcon aria-hidden="true" />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      <footer className="workspace-portal__bottomBar">
        <div className="workspace-portal__bottomLeft">
          <WorkspaceAmbientWidget />
        </div>

        <nav className="workspace-portal__dock" role="tablist" aria-label="Chọn nhanh Workspace">
          {workspaces.map((workspace, index) => {
            const active = index === activeIndex;
            return (
              <div key={workspace.id} className="workspace-portal__dockItem">
                <span className="workspace-portal__dockTooltip" aria-hidden="true">{workspace.name}</span>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={workspace.name}
                  className="workspace-portal__dockBtn"
                  data-active={active ? "true" : undefined}
                  data-kind={workspace.icon}
                  data-available={workspace.available ? "true" : "false"}
                  onClick={() => (active ? selectWorkspace(workspace) : goTo(index))}
                >
                  <WorkspaceEmblem kind={workspace.icon} />
                </button>
                <span className="workspace-portal__dockDot" data-active={active ? "true" : undefined} aria-hidden="true" />
              </div>
            );
          })}
        </nav>

        <div className="workspace-portal__bottomRight" aria-hidden="true" />
      </footer>
    </div>
  );
}
