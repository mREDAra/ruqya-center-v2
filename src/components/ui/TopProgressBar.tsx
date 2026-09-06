"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "finishing">("idle");
  const [progress, setProgress] = useState(0);

  // When route changes (pathname or searchParams change), complete the progress bar
  useEffect(() => {
    if (state === "loading") {
      setProgress(100);
      setState("finishing");
      const timer = setTimeout(() => {
        setState("idle");
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept link clicks to trigger progress instantly (0ms feedback)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");

      // Skip non-navigational or external links
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      ) {
        return;
      }

      // Skip if navigating to the exact same URL
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      // Start loading bar immediately
      setState("loading");
      setProgress(25);
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  // Smoothly increment while waiting for the next page to render
  useEffect(() => {
    if (state !== "loading") return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        const remaining = 85 - prev;
        return prev + Math.max(1, remaining * 0.18);
      });
    }, 120);

    return () => clearInterval(interval);
  }, [state]);

  if (state === "idle") return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 start-0 end-0 z-[9999] pointer-events-none h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-accent via-accent-light to-primary shadow-[0_0_10px_rgba(197,160,40,0.8)]"
        style={{
          width: `${progress}%`,
          opacity: state === "finishing" ? 0 : 1,
          transitionProperty: "width, opacity",
          transitionDuration: state === "finishing" ? "300ms" : "200ms",
          transitionTimingFunction: "ease-out",
        }}
      />
    </div>
  );
}

export default function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
