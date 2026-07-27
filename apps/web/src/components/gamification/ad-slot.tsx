"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const PROFILE_SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROFILE_REWARDED;

export function adsenseConfigured() {
  return Boolean(CLIENT_ID && PROFILE_SLOT_ID);
}

export function AdSlot() {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || !PROFILE_SLOT_ID || pushed.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // El script de AdSense puede no estar listo todavía; se ignora en silencio.
    }
  }, []);

  if (!CLIENT_ID || !PROFILE_SLOT_ID) return null;

  return (
    <>
      <Script
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`}
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <ins
        ref={insRef}
        className="adsbygoogle block min-h-[100px] w-full"
        style={{ display: "block" }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={PROFILE_SLOT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
