"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { Theme, type ThemeMode } from "@astryxdesign/core/theme";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import viVN from "@astryxdesign/core/locales/vi-VN.generated.js";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { LinkProvider } from "@astryxdesign/core/Link";
import { ToastViewport } from "@astryxdesign/core/Toast";
import { deocaTheme } from "@/design-system/theme/deoca";

const STORAGE_KEY = "dcg-theme";

interface ColorModeContextValue {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

interface NextLinkAdapterProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

function NextLinkAdapter({ href, children, className, style, ...rest }: NextLinkAdapterProps) {
  const isExternal = /^(https?:|mailto:|tel:)/i.test(href);
  if (isExternal) {
    return (
      <a href={href} className={className} style={style} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} className={className} style={style} {...rest}>
      {children}
    </NextLink>
  );
}

export function DesignSystemProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const mq = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    if (mq) setSystemDark(mq.matches);
    let saved: string | null = null;
    try {
      saved = typeof window !== "undefined" && typeof window.localStorage?.getItem === "function"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    } catch {
      saved = null;
    }
    if (saved === "dark" || saved === "light" || saved === "system") {
      setModeState(saved);
    } else if (mq?.matches) {
      setModeState("dark");
    }

    if (!mq) return;
    const onMediaChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onMediaChange);
    return () => mq.removeEventListener("change", onMediaChange);
  }, []);

  const resolvedMode: "light" | "dark" =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedMode === "dark");
    root.dataset.colorMode = resolvedMode;
    root.style.colorScheme = resolvedMode;
  }, [resolvedMode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      if (typeof window !== "undefined" && typeof window.localStorage?.setItem === "function") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(resolvedMode === "dark" ? "light" : "dark");
  }, [resolvedMode, setMode]);

  const ctxValue = useMemo<ColorModeContextValue>(
    () => ({ mode, resolvedMode, setMode, toggleMode }),
    [mode, resolvedMode, setMode, toggleMode],
  );

  return (
    <ColorModeContext.Provider value={ctxValue}>
      <Theme theme={deocaTheme} mode={resolvedMode}>
        <InternationalizationProvider locale="vi-VN" messages={{ "vi-VN": viVN }}>
          <LayerProvider>
            <LinkProvider component={NextLinkAdapter}>
              {children}
              <ToastViewport position="topEnd" />
            </LinkProvider>
          </LayerProvider>
        </InternationalizationProvider>
      </Theme>
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within DesignSystemProvider");
  }
  return ctx;
}
