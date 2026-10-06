import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Deep links that use ?focus= instead of a hash, mapped to the section id they mean. */
const FOCUS_ALIAS: Record<string, string> = {
  heatmap: "demanda",
};

const noop: () => void = () => {};

/**
 * Scrolls the window to `el`, honouring its CSS scroll-margin-top.
 * Uses a short rAF animation instead of native smooth scrolling, which Chrome
 * silently drops right after a client-side route change.
 */
function scrollToElement(el: HTMLElement, animate: boolean): () => void {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const target = Math.min(max, Math.max(0, el.getBoundingClientRect().top + window.scrollY - margin));
  const start = window.scrollY;
  const distance = target - start;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  if (!animate || reduceMotion || Math.abs(distance) < 2) {
    window.scrollTo(0, target);
    return noop;
  }

  const duration = 280;
  const t0 = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    window.scrollTo(0, start + distance * eased);
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/**
 * Keeps navigation predictable:
 * - new route without anchor → start at the top
 * - anchor (#seccion) or ?focus=seccion → scroll to it once the page has rendered
 * - same route, only query changed (periodo, filtros) → keep the current scroll
 */
export function ScrollManager() {
  const { pathname, search, hash, key } = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef(pathname);

  useEffect(() => {
    const focus = new URLSearchParams(search).get("focus");
    const targetId = hash ? decodeURIComponent(hash.slice(1)) : focus ? FOCUS_ALIAS[focus] ?? focus : null;
    const pathChanged = prevPath.current !== pathname;
    prevPath.current = pathname;

    if (targetId) {
      let tries = 0;
      let timer: number | undefined;
      let cancelAnim = noop;
      const tick = () => {
        const el = document.getElementById(targetId);
        if (el) {
          cancelAnim = scrollToElement(el, !pathChanged);
          return;
        }
        if (tries++ < 80) timer = window.setTimeout(tick, 50);
      };
      tick();
      return () => {
        window.clearTimeout(timer);
        cancelAnim();
      };
    }

    if (navType !== "POP" && pathChanged) {
      window.scrollTo(0, 0);
    }
  }, [key, pathname, search, hash, navType]);

  return null;
}
