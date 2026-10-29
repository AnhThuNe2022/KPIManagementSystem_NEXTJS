"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Toaster, toast } from "sonner";

const titles = { success: "Thành công", error: "Không thành công", warning: "Lưu ý", info: "Thông tin" };

export function notify(type: keyof typeof titles, message: string, id?: string | number) {
  const duration = type === "error" ? 6000 : 4000;
  return toast[type](titles[type], {
    description: <>{message}<span key={duration} className="app-toast-timer" aria-hidden="true" /></>,
    id,
    duration,
    style: { "--toast-duration": `${duration}ms` } as CSSProperties,
  });
}

export function AppToaster() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = document.createElement("div");
    element.className = "app-toast-host";
    element.popover = "manual";
    // Native modal dialogs make outside content inert, even above their z-index.
    const place = () => {
      const parent = document.querySelector("dialog:modal") ?? document.body;
      if (element.parentElement !== parent) {
        if (element.matches(":popover-open")) element.hidePopover();
        parent.append(element);
      }
      if (!element.matches(":popover-open")) element.showPopover();
    };
    place();
    setHost(element);
    const pause = () => { element.dataset.paused = String(document.hidden); };
    pause();
    document.addEventListener("visibilitychange", pause);
    const observer = new MutationObserver(place);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", pause); element.remove(); };
  }, []);

  return host && createPortal(<Toaster
    className="app-toasts"
    position="top-right"
    offset={{ top: "calc(var(--app-header-height) + 12px)", right: 24 }}
    mobileOffset={{ top: "calc(env(safe-area-inset-top) + 16px)", right: 16, left: 16 }}
    closeButton
    containerAriaLabel="Thông báo thao tác"
    toastOptions={{ className: "app-toast", closeButtonAriaLabel: "Đóng thông báo" }}
    icons={{
      success: <Image src="/svg/deo-ca-success.svg" alt="" width={32} height={32} />,
      error: <Image src="/svg/deo-ca-error.svg" alt="" width={32} height={32} />,
      warning: <Image src="/svg/deo-ca-warning.svg" alt="" width={32} height={32} />,
      info: <Image src="/svg/deo-ca-info.svg" alt="" width={32} height={32} />,
    }}
  />, host);
}
