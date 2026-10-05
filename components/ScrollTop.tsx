"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function pinToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function ScrollTop() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    pinToTop();
    const frame = window.requestAnimationFrame(pinToTop);
    const soon = window.setTimeout(pinToTop, 0);
    const later = window.setTimeout(pinToTop, 120);
    const settle = window.setTimeout(pinToTop, 360);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(soon);
      window.clearTimeout(later);
      window.clearTimeout(settle);
    };
  }, [pathname]);

  useEffect(() => {
    const onShow = () => pinToTop();
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return null;
}
