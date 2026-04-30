"use client";

import { useRef } from "react";
import { ScrollToTopOnRouteChange } from "./ScrollToTopOnRouteChange";

export function DashboardMain({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const mainRef = useRef<HTMLElement | null>(null);

  return (
    <main
      ref={mainRef}
      className="flex-1 min-w-0 p-2 lg:p-6 lg:h-[calc(100vh-96px)] lg:overflow-y-auto overflow-x-hidden"
    >
      <ScrollToTopOnRouteChange containerRef={mainRef} />
      {header}
      {children}
    </main>
  );
}