"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type StationPosition = { latitude: number; longitude: number };

type props = {
    position: StationPosition | null;
    initialViewState?: {
        latitude: number;
        longitude: number;
        zoom: number;
    }
    followPosition?: boolean;
    className?: string;
}

const DEFAULT_VIEW = { latitude: 0, longitude: 0, zoom: 2 };

export function StationMap({
    position,
    initialViewState,
    followPosition = true,
    className,
}: props){
    const mapRef = useRef<MapRef | null>(null);
    const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

    const [viewState, setViewState] = useState(initialViewState ?? DEFAULT_VIEW);

    const mapStyle = useMemo(() => {
        return `https://api.maptiler.com/maps/satellite-v4/style.json?key=${maptilerKey}`;
    }, [maptilerKey]);

    useEffect(() => {
        if (!position || !followPosition) return;

        const map = mapRef.current;
        if (!map) return;

        map.flyTo({
            center: [position.longitude, position.latitude],
            zoom: Math.max(viewState.zoom, 13),
            essential: true,
            duration: 200,
        });

    }, [position?.latitude, position?.longitude, followPosition]);

    return(
        <div className={`relative w-full rounded-md overflow-hidden border border-slate-200 ${className || ''}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        mapLib={maplibregl}
        mapStyle={mapStyle}
      >
        {position ? (
          <Marker
            latitude={position.latitude}
            longitude={position.longitude}
            anchor="bottom"
          >
            <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow" />
          </Marker>
        ) : null}
      </Map>
    </div>
    );
}

