"use client";

import { useEffect, useRef, useState } from "react";

export function useIdle(idleMs: number) {
  const [isIdle, setIsIdle] = useState(false);
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    const clear = () => {
      if (tRef.current != null) {
        window.clearTimeout(tRef.current);
        tRef.current = null;
      }
    };

    const arm = () => {
      clear();
      tRef.current = window.setTimeout(() => setIsIdle(true), idleMs);
    };

    const onActivity = () => {
      // qualquer atividade derruba o modo kiosk e rearma o timer
      setIsIdle(false);
      arm();
    };

    arm();

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "pointerdown",
      "scroll",
      "wheel",
    ];

    for (const e of events) window.addEventListener(e, onActivity, { passive: true });

    return () => {
      clear();
      for (const e of events) window.removeEventListener(e, onActivity);
    };
  }, [idleMs]);

  return { isIdle, setIsIdle };
}