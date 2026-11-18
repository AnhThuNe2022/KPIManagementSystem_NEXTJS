"use client";

import { useEffect, useRef, useState } from "react";
import type { LoginFocusField, LoginPhase } from "./LoginCinema";

const VERTEX_SHADER = `
  attribute vec2 a_pos;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

/**
 * Architectural Satin-Silk Terrain Fragment Shader
 * Computes domain-warped fBm + finite-difference surface normals
 * for true specular caustic highlights across smooth satin folds.
 */
const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 u_res;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_mouseActive;
  uniform float u_dark;
  uniform float u_privacy;
  uniform float u_error;
  uniform float u_enter;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p = rot * p * 1.92 + vec2(1.7, 9.2);
      amp *= 0.5;
    }
    return v;
  }

  float silkHeight(vec2 uv, float t, vec2 mouseN) {
    vec2 warpMouse = (uv - mouseN);
    float mDist = dot(warpMouse, warpMouse);
    float mPush = exp(-mDist * 6.5) * u_mouseActive * 0.22;

    float freqScale = mix(1.0, 1.48, u_privacy);
    vec2 p = uv * vec2(1.85, 1.35) * freqScale + vec2(t * 0.055, -t * 0.032);
    p += warpMouse * mPush * 0.6;

    vec2 q = vec2(
      fbm(p + vec2(0.0, 0.0) + t * 0.03),
      fbm(p + vec2(5.2, 1.3) - t * 0.025)
    );
    float r = fbm(p + 2.4 * q + vec2(1.7, 9.2) + t * 0.02);
    float tensionWave = sin((uv.x * 1.4 - uv.y * 1.1) * 7.5 - t * 0.35) * 0.075 * u_privacy;
    return r + mPush * 0.35 + tensionWave;
  }

  void main() {
    vec2 fragUv = gl_FragCoord.xy / u_res;
    float aspect = u_res.x / max(u_res.y, 1.0);
    vec2 uv = (fragUv - 0.5) * vec2(aspect, 1.0) + 0.5;
    vec2 mouseN = (u_mouse - 0.5) * vec2(aspect, 1.0) + 0.5;

    // Gentle center surge during portal transition
    vec2 toCenter = uv - vec2(aspect * 0.5, 0.5);
    uv -= toCenter * (u_enter * 0.16);

    float t = u_time;
    float eps = 0.012;
    float h0 = silkHeight(uv, t, mouseN);
    float hx = silkHeight(uv + vec2(eps, 0.0), t, mouseN);
    float hy = silkHeight(uv + vec2(0.0, eps), t, mouseN);

    vec3 normal = normalize(vec3((h0 - hx) * 4.2, (h0 - hy) * 4.2, 1.0));
    vec3 lightDir = normalize(vec3(0.55 + (mouseN.x - 0.5) * 0.45 * u_mouseActive, 0.65 - (mouseN.y - 0.5) * 0.35 * u_mouseActive, 0.85));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVec = normalize(lightDir + viewDir);

    float diff = clamp(dot(normal, lightDir), 0.0, 1.0);
    float spec = pow(clamp(dot(normal, halfVec), 0.0, 1.0), 14.0);
    float ribbon = smoothstep(0.32, 0.86, h0);

    // Day Studio Palette (Sculpted Pearl-White Satin with Cool Periwinkle Valleys & Crisp Specular Crests)
    vec3 dayHighlight = vec3(1.000, 1.000, 1.000);
    vec3 dayBase      = vec3(0.935, 0.955, 0.988);
    vec3 dayMid       = vec3(0.845, 0.885, 0.960);
    vec3 dayValley    = vec3(0.735, 0.798, 0.918);
    vec3 dayRoseRim   = vec3(0.955, 0.835, 0.868);
    float dayFold = smoothstep(0.24, 0.84, h0);
    vec3 dayCol = mix(dayValley, dayBase, pow(diff, 1.45));
    dayCol = mix(dayCol, dayMid, dayFold * 0.42);
    dayCol = mix(dayCol, dayRoseRim, spec * 0.36);
    dayCol = mix(dayCol, dayHighlight, smoothstep(0.18, 0.85, spec) * 0.72);
    dayCol += vec3(0.035, 0.04, 0.05) * pow(ribbon, 1.5);

    // Night Studio Palette (Obsidian Ink + Midnight Cobalt + Subtle Satin Crimson Caustic)
    vec3 nightBase  = vec3(0.022, 0.036, 0.075);
    vec3 nightMid   = vec3(0.055, 0.105, 0.225);
    vec3 nightDeep  = vec3(0.105, 0.205, 0.445);
    vec3 nightCrest = vec3(0.680, 0.175, 0.275);
    vec3 nightCol = mix(nightBase, nightMid, smoothstep(0.30, 0.80, h0));
    nightCol += nightDeep * pow(diff, 2.2) * 0.48 * ribbon;
    nightCol += nightCrest * spec * 0.34;
    nightCol += vec3(0.25, 0.42, 0.82) * spec * 0.22;

    vec3 col = mix(dayCol, nightCol, u_dark);

    // Vault mode when typing password: focus spotlight behind right form & enrich contrast
    float panelX = aspect > 1.05 ? (0.72 - 0.5) * aspect + 0.5 : 0.5;
    vec2 toPanel = uv - vec2(panelX, 0.5);
    float panelSpotlight = exp(-dot(toPanel, toPanel) * 2.4);
    float outerShade = (1.0 - panelSpotlight) * u_privacy;
    col = mix(col, mix(vec3(0.76, 0.82, 0.93), vec3(0.015, 0.025, 0.055), u_dark), outerShade * 0.42);
    col += mix(vec3(0.035, 0.04, 0.06), vec3(0.06, 0.11, 0.25), u_dark) * panelSpotlight * u_privacy * (0.45 + 0.55 * spec);

    // Interactive cursor soft keylight
    float cursorHalo = exp(-dot(uv - mouseN, uv - mouseN) * 4.5) * u_mouseActive;
    col += mix(vec3(0.04, 0.045, 0.06), vec3(0.05, 0.09, 0.20), u_dark) * cursorHalo;

    // Brief subtle crimson pulse on form error
    col = mix(col, mix(vec3(0.98, 0.91, 0.92), vec3(0.32, 0.05, 0.11), u_dark), u_error * 0.22);

    // Smoothly melt silk into the exact dashboard page tone on successful login
    vec3 targetPage = mix(vec3(0.957, 0.965, 0.976), vec3(0.043, 0.059, 0.094), u_dark);
    col = mix(col, targetPage, smoothstep(0.0, 1.0, u_enter));

    // Interleaved Gradient Noise dither to completely eliminate color banding
    float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    col += (dither - 0.5) / 255.0;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LoginSilkCanvas({
  focusedField,
  phase,
  errorPulse,
}: {
  focusedField: LoginFocusField;
  phase: LoginPhase;
  errorPulse: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetStateRef = useRef({
    privacy: 0,
    error: 0,
    enter: 0,
  });

  useEffect(() => {
    targetStateRef.current.privacy = focusedField === "password" ? 1 : 0;
  }, [focusedField]);

  useEffect(() => {
    targetStateRef.current.error = errorPulse ? 1 : 0;
  }, [errorPulse]);

  useEffect(() => {
    targetStateRef.current.enter = phase === "entering" ? 1 : 0;
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uMouseActive = gl.getUniformLocation(program, "u_mouseActive");
    const uDark = gl.getUniformLocation(program, "u_dark");
    const uPrivacy = gl.getUniformLocation(program, "u_privacy");
    const uError = gl.getUniformLocation(program, "u_error");
    const uEnter = gl.getUniformLocation(program, "u_enter");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.35);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    let mx = 0.5;
    let my = 0.5;
    let smoothMx = 0.5;
    let smoothMy = 0.5;
    let mActiveTarget = 0;
    let smoothActive = 0;
    let smoothDark = document.documentElement.classList.contains("dark") ? 1 : 0;
    let smoothPrivacy = 0;
    let smoothError = 0;
    let smoothEnter = 0;

    const onPointerMove = (event: PointerEvent) => {
      if (coarsePointer || event.pointerType === "touch") return;
      mx = event.clientX / Math.max(window.innerWidth, 1);
      my = 1 - event.clientY / Math.max(window.innerHeight, 1);
      mActiveTarget = 1;
    };

    const onPointerLeave = () => {
      mActiveTarget = 0;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onPointerLeave);

    let rafId = 0;
    const startTime = performance.now();

    const render = (now: number) => {
      if (document.hidden && !reducedMotion) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const elapsed = reducedMotion ? 2.4 : (now - startTime) * 0.001;
      const darkTarget = document.documentElement.classList.contains("dark") ? 1 : 0;

      smoothMx += (mx - smoothMx) * 0.06;
      smoothMy += (my - smoothMy) * 0.06;
      smoothActive += (mActiveTarget - smoothActive) * 0.06;
      smoothDark += (darkTarget - smoothDark) * 0.08;
      smoothPrivacy += (targetStateRef.current.privacy - smoothPrivacy) * 0.08;
      smoothError += (targetStateRef.current.error - smoothError) * 0.14;
      smoothEnter += (targetStateRef.current.enter - smoothEnter) * 0.12;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, smoothMx, smoothMy);
      gl.uniform1f(uMouseActive, smoothActive);
      gl.uniform1f(uDark, smoothDark);
      gl.uniform1f(uPrivacy, smoothPrivacy);
      gl.uniform1f(uError, smoothError);
      gl.uniform1f(uEnter, smoothEnter);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!reducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("mouseleave", onPointerLeave);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return <canvas ref={canvasRef} className="login-silk-canvas" aria-hidden="true" />;
}

const SCRAMBLE_CHARS = "0123456789ABCDEF°'\"";

export function ScrambleText({ text, delayMs = 120 }: { text: string; delayMs?: number }) {
  const [rendered, setRendered] = useState(text);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let rafId = 0;
    const totalFrames = 26;

    const timer = setTimeout(() => {
      const step = () => {
        frame++;
        const lockCount = Math.floor((frame / totalFrames) * text.length);
        const next = text
          .split("")
          .map((char, idx) => {
            if (char === " " || char === "·") return char;
            if (idx < lockCount) return char;
            return SCRAMBLE_CHARS[(frame + idx * 3) % SCRAMBLE_CHARS.length];
          })
          .join("");
        setRendered(next);
        if (frame < totalFrames) {
          rafId = requestAnimationFrame(step);
        } else {
          setRendered(text);
        }
      };
      rafId = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [text, delayMs]);

  return <span>{rendered}</span>;
}
