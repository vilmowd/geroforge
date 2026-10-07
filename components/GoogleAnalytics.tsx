"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { readCookieChoice } from "@/lib/cookie-choice";

const MEASUREMENT_ID = "G-2FCWLXGDEP";

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(readCookieChoice() === "all");
    sync();
    window.addEventListener("forge-cookies", sync);
    return () => window.removeEventListener("forge-cookies", sync);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
