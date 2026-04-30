"use client";

import { useIdle } from "../hooks/useIdle";
import { KioskOverlay } from "./KioskOverlay";
import { useStationPublicInfo } from "../../StationPublicContext";
import { Slide } from "./KioskOverlay";

type Props = {
  idleMs?: number;
  rotateEveryMs?: number;
  aliasSta: string;

  cards: React.ReactNode[];
  overlaySlides: Slide[];
};

export function InicialPagKioskClient({ idleMs = 30_000, rotateEveryMs = 30_000, cards, overlaySlides, aliasSta }: Props) {
  const { isIdle, setIsIdle } = useIdle(idleMs);
  const slides = overlaySlides;
  const { stationLabel, lat, long } = useStationPublicInfo();

  return (
    <>
      <div className="space-y-6">{cards}</div>

      <KioskOverlay
        open={isIdle}
        rotateEveryMs={rotateEveryMs}
        onClose={() => setIsIdle(false)}
        siteUrl="https://em.h20.com.br/"
        aliasSta={stationLabel || aliasSta}
        lat={lat}
        long={long}
        slides={slides}
      />
    </>
  );
}