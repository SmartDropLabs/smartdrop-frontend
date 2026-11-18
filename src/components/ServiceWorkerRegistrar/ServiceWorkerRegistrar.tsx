"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` for offline support (#528).
 *
 * Production only — a caching SW in `next dev` serves stale bundles and breaks
 * HMR. Set NEXT_PUBLIC_ENABLE_SW=false to opt out (e.g. while debugging a
 * deployment).
 */
export function shouldRegisterServiceWorker(
  env: string | undefined = process.env.NODE_ENV,
  flag: string | undefined = process.env.NEXT_PUBLIC_ENABLE_SW,
): boolean {
  if (flag === "false") return false;
  return env === "production";
}

export default function ServiceWorkerRegistrar({ basePath = "" }: { basePath?: string }) {
  useEffect(() => {
    if (!shouldRegisterServiceWorker()) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register(`${basePath}/sw.js`, { scope: `${basePath}/` })
        .catch(() => {
          // Registration failure only means no offline support; the app works.
        });
    };

    if (document.readyState === "complete") {
      register();
      return undefined;
    }
    // Defer until load so the SW install doesn't compete with first paint.
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, [basePath]);

  return null;
}
