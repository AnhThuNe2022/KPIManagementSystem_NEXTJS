"use client";

import { useEffect, useRef, useState } from "react";

interface CityOption {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

const CITIES: readonly CityOption[] = [
  { id: "hcm", name: "TP. Hồ Chí Minh", lat: 10.8231, lon: 106.6297 },
  { id: "hn", name: "Hà Nội", lat: 21.0285, lon: 105.8542 },
  { id: "dn", name: "Đà Nẵng", lat: 16.0544, lon: 108.2022 },
  { id: "py", name: "Phú Yên (Đèo Cả)", lat: 12.8886, lon: 109.4061 },
  { id: "kh", name: "Khánh Hòa", lat: 12.2388, lon: 109.1967 },
];

const CITY_STORAGE_KEY = "dcg-workspace-city";

interface WeatherSnapshot {
  temp: number;
  code: number;
}

type WeatherKind = "clear" | "partly" | "cloudy" | "rain" | "storm";

function weatherDescription(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: "Trời quang", kind: "clear" };
  if (code <= 2) return { label: "Ít mây", kind: "partly" };
  if (code === 3 || code === 45 || code === 48) return { label: "Nhiều mây", kind: "cloudy" };
  if (code >= 95) return { label: "Có dông", kind: "storm" };
  return { label: "Có mưa", kind: "rain" };
}

function WeatherGlyph({ kind }: { kind: WeatherKind }) {
  if (kind === "clear") {
    return (
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" aria-hidden="true">
        <circle cx="14" cy="14" r="5" />
        <path d="M14 4v2.2M14 21.8V24M4 14h2.2M21.8 14H24M6.9 6.9l1.6 1.6M19.5 19.5l1.6 1.6M21.1 6.9l-1.6 1.6M8.5 19.5l-1.6 1.6" />
      </svg>
    );
  }
  if (kind === "partly") {
    return (
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.5 6.5v1.6M5.2 11.8H3.6M6.8 8.1l1.1 1.1M14.2 8.1l-1.1 1.1" />
        <path d="M8 13.8a3.8 3.8 0 0 1 6.4-2.4" />
        <path d="M9.5 21.5h10.2a3.8 3.8 0 0 0 .4-7.6 5.2 5.2 0 0 0-9.9-1.1A3.4 3.4 0 0 0 9.5 21.5Z" />
      </svg>
    );
  }
  if (kind === "rain" || kind === "storm") {
    return (
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8.5 18.2h11.2a3.6 3.6 0 0 0 .5-7.2 5.4 5.4 0 0 0-10.3-1.4 3.5 3.5 0 0 0-1.4 8.6Z" />
        {kind === "storm" ? (
          <path d="M14.2 18.5 12 22.3h2.8L13 25.5" />
        ) : (
          <path d="M10.5 21.2l-1 2.4M14.5 21.2l-1 2.4M18.5 21.2l-1 2.4" />
        )}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.2 20.5h11.6a3.8 3.8 0 0 0 .5-7.6 5.5 5.5 0 0 0-10.6-1.5 3.6 3.6 0 0 0-1.5 9.1Z" />
    </svg>
  );
}

const clockFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
});

export function WorkspaceAmbientWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [cityId, setCityId] = useState("hcm");
  const [menuOpen, setMenuOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CITY_STORAGE_KEY);
      if (saved && CITIES.some((item) => item.id === saved)) setCityId(saved);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const city = CITIES.find((item) => item.id === cityId) ?? CITIES[0];

  useEffect(() => {
    const controller = new AbortController();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code&timezone=auto`;

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (controller.signal.aborted || !data?.current) return;
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          code: Number(data.current.weather_code ?? 0),
        });
      })
      .catch(() => {
        // Keep clock-only mode quietly if offline
      });

    return () => controller.abort();
  }, [city.lat, city.lon]);

  function selectCity(nextId: string) {
    setCityId(nextId);
    setMenuOpen(false);
    try {
      localStorage.setItem(CITY_STORAGE_KEY, nextId);
    } catch {
      // ignore storage errors
    }
  }

  if (!now) return <div className="workspace-portal__ambientSlot" aria-hidden="true" />;

  const weatherInfo = weather ? weatherDescription(weather.code) : null;

  return (
    <div ref={rootRef} className="workspace-portal__ambientCard">
      <div className="workspace-portal__ambientPrimary">
        <time className="workspace-portal__ambientTime" dateTime={now.toISOString()}>
          {clockFormatter.format(now)}
        </time>

        {weather && weatherInfo && (
          <>
            <span className="workspace-portal__ambientDot" aria-hidden="true">·</span>
            <span className="workspace-portal__weatherIcon">
              <WeatherGlyph kind={weatherInfo.kind} />
            </span>
            <span className="workspace-portal__ambientTemp">{weather.temp}°</span>
            <span className="workspace-portal__ambientCond">{weatherInfo.label}</span>
          </>
        )}
      </div>

      <div className="workspace-portal__ambientMeta">
        <span className="workspace-portal__ambientDate">{dateFormatter.format(now)}</span>

        {weather && (
          <>
            <span className="workspace-portal__ambientDot" aria-hidden="true">·</span>
            <div className="workspace-portal__cityWrap">
              <button
                type="button"
                className="workspace-portal__cityBtn"
                aria-expanded={menuOpen}
                aria-haspopup="listbox"
                title="Đổi khu vực thời tiết"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {city.name}
              </button>

              {menuOpen && (
                <ul className="workspace-portal__cityMenu" role="listbox" aria-label="Chọn khu vực">
                  {CITIES.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={option.id === city.id}
                        className="workspace-portal__cityOption"
                        data-active={option.id === city.id ? "true" : undefined}
                        onClick={() => selectCity(option.id)}
                      >
                        {option.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
