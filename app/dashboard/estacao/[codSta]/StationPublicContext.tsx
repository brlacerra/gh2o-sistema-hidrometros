"use client";

import { createContext, useContext } from "react";

export type StationPublicInfo = {
  stationLabel: string;
  lat: number | null;
  long: number | null;
};

const StationPublicContext = createContext<StationPublicInfo | null>(null);

export function StationPublicProvider({
  value,
  children,
}: {
  value: StationPublicInfo;
  children: React.ReactNode;
}) {
  return (
    <StationPublicContext.Provider value={value}>
      {children}
    </StationPublicContext.Provider>
  );
}

export function useStationPublicInfo() {
  const ctx = useContext(StationPublicContext);
  if (!ctx) throw new Error("useStationPublicInfo must be used within StationPublicProvider");
  return ctx;
}