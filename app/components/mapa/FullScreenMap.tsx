"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, MapRef, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faExclamationTriangle, faLocationCrosshairs } from "@fortawesome/free-solid-svg-icons";
import { type Ponto } from "@/lib/utils";
import { healthFromLastReading, ReadingHealth } from "@/lib/mappers/hidroToPontos";


interface FullScreenMapProps {
  pontos: Ponto[];
  selectedPonto: Ponto | null;
  onSelectPonto: (p: Ponto | null) => void;
  focusPonto?: Ponto | null;
}

const defmapProps = {
  latitude: -18.7315157,
  longitude: -47.5004928,
  zoom: 10,
}


type meResponse = {
  user: {
    latMap: number | null;
    longMap: number | null;
    zoomMap: number | null;
    propriedade?: Array<{
      centroLat: number | null;
      centroLng: number | null;
      geojsonProp: any;
    }>;
  }
}

function colorClass(health: ReadingHealth, selected?: boolean, isActive?: boolean) {
  if (selected) return "text-yellow-300";

  switch (health) {
    case "ok":
      return "text-green-500";
    case "warn":
      return "text-orange-500";
    case "offline":
      return "text-red-500";
    case "unActive":
      return "text-red-500/70";
    default:
      return "text-gray-500";
  }
}

function getIconSizeByZoom(zoom: number) {
  if (zoom < 5) return 40;
  if (zoom < 10) return 50;
  if (zoom < 15) return 60;
  return 100;
}

function IconByTipo({
  size,
  selected,
  health,
}: {
  size: number;
  selected?: boolean;
  health: ReadingHealth;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: size * 0.6,
    transform: selected ? "scale(1.2)" : "scale(1)",
    transition: "transform 0.15s ease",
  };

  return (
    <div
      style={style}
      className={`relative flex items-center justify-center drop-shadow-md ${colorClass(health, selected)}`}
    >
      <FontAwesomeIcon icon={faClock} />
      {health === "unActive" && (
        <div
          className="absolute text-yellow-600 drop-shadow-lg"
          style={{
            top: "0%",
            right: "0%",
            fontSize: "0.6em",
          }}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </div>
      )}
    </div>
  );
}

export default function FullScreenMap({
  pontos,
  selectedPonto,
  onSelectPonto,
  focusPonto,
}: FullScreenMapProps) {
  const [viewState, setViewState] = useState({ ...defmapProps });
  const [initialView, setInitialView] = useState({ ...defmapProps });
  const [propertyGeojson, setPropertyGeojson] = useState<any>(null);
  const mapRef = useRef<MapRef | null>(null);
  const lastFocusedIdRef = useRef<string | null>(null);
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const iconSize = getIconSizeByZoom(viewState.zoom);
  const [didLoadUserView, setDidLoadUserView] = useState(false);

  // Consider it "moved" if the view is off by a small tolerance
  const hasMoved = didLoadUserView && (
    Math.abs(viewState.latitude - initialView.latitude) > 0.005 ||
    Math.abs(viewState.longitude - initialView.longitude) > 0.005 ||
    Math.abs(viewState.zoom - initialView.zoom) > 0.5
  );

  const handleRecenter = () => {
    mapRef.current?.flyTo({
      center: [initialView.longitude, initialView.latitude],
      zoom: initialView.zoom,
      essential: true,
      duration: 1200,
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Failed to fetch user data");
        }

        const data = (await res.json()) as meResponse;
        const user = data.user;

        if (cancelled) return;

        let nextView = { ...defmapProps };
        const prop = user?.propriedade?.[0];

        if (prop && prop.centroLat !== null && prop.centroLng !== null) {
          nextView = {
            latitude: Number(prop.centroLat),
            longitude: Number(prop.centroLng),
            zoom: 10,
          };
          if (prop.geojsonProp) {
            setPropertyGeojson(prop.geojsonProp);
          }
        } else if (user?.latMap !== null && user?.longMap !== null && user?.latMap !== undefined && user?.longMap !== undefined) {
          nextView = {
            latitude: Number(user.latMap),
            longitude: Number(user.longMap),
            zoom: Number(user?.zoomMap ?? defmapProps.zoom),
          };
        }

        setInitialView(nextView);

        mapRef.current?.flyTo({
          center: [nextView.longitude, nextView.latitude],
          zoom: nextView.zoom,
          essential: true,
          duration: 2000,
        });
        setDidLoadUserView(true);
      } catch {
        // se der erro, fica no default
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didLoadUserView) return;

    if (!focusPonto) {
      lastFocusedIdRef.current = null;
      return;
    }

    if (!mapRef.current) return;
    if (lastFocusedIdRef.current === focusPonto.id) return;

    lastFocusedIdRef.current = focusPonto.id;

    const currentZoom = mapRef.current.getZoom();

    mapRef.current.flyTo({
      center: [focusPonto.longitude, focusPonto.latitude],
      zoom: Math.max(currentZoom, 14),
      essential: true,
      duration: 1200,
    });
  }, [didLoadUserView, focusPonto]);

  return (
    <div className="w-screen h-screen relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapLib={maplibregl}
        mapStyle={`https://api.maptiler.com/maps/hybrid-v4/style.json?key=${maptilerKey}`}
      >
        {propertyGeojson && (
          <Source id="propriedade-source" type="geojson" data={propertyGeojson}>
            <Layer
              id="propriedade-fill"
              type="fill"
              paint={{
                "fill-color": "#eab308",
                "fill-opacity": 0.15,
              }}
            />
            <Layer
              id="propriedade-line"
              type="line"
              paint={{
                "line-color": "#ca8a04",
                "line-width": 2,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {pontos.map(ponto => (
          <Marker
            key={ponto.id}
            longitude={ponto.longitude}
            latitude={ponto.latitude}
            anchor="center"
          >
            <button
              title={ponto.descricao ?? ""}
              onClick={e => {
                e.stopPropagation();
                onSelectPonto(ponto);
              }}
            >
              <IconByTipo
                size={iconSize}
                selected={selectedPonto?.id === ponto.id}
                health={healthFromLastReading(ponto.isActive)}
              />
            </button>
          </Marker>
        ))}
      </Map>

      {hasMoved && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-6 left-4 z-20 flex items-center gap-2 px-4 py-2 bg-[var(--color-gh2ogreen)] text-white text-xs hover:bg-emerald-600 transition"
          title="Recentralizar no foco inicial"
        >
          <FontAwesomeIcon icon={faLocationCrosshairs} />
          Recentralizar
        </button>
      )}
    </div>
  );
}
