"use client";

import { usePathname } from "next/navigation";
import { RefObject, useLayoutEffect, useRef } from "react";

function scrollToTop(el: HTMLElement) {
  el.scrollTop = 0;
  el.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

export function ScrollToTopOnRouteChange({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
}) {
  const pathname = usePathname();
  const raf2Ref = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 1) imediatamente (antes do paint)
    scrollToTop(el);

    // 2) após próximos frames, porque o conteúdo pode aumentar e “re-setar”
    const raf1 = requestAnimationFrame(() => {
      const el2 = containerRef.current;
      if (el2) scrollToTop(el2);

      const raf2 = requestAnimationFrame(() => {
        const el3 = containerRef.current;
        if (el3) scrollToTop(el3);
      });

      raf2Ref.current = raf2;
    });

    // 3) e um timeout curto (pega hidratação/lazy images)
    const t = window.setTimeout(() => {
      const el4 = containerRef.current;
      if (el4) scrollToTop(el4);
    }, 50);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2Ref.current != null) {
        cancelAnimationFrame(raf2Ref.current);
      }
      window.clearTimeout(t);
    };
  }, [pathname, containerRef, raf2Ref]);

  return null;
}