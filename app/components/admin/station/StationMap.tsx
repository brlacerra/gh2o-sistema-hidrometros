"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, MapRef, Source, Layer, Popup } from "react-map-gl/maplibre";
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
    propertyGeojson?: any;
    propertyPopupNode?: React.ReactNode;
}

const DEFAULT_VIEW = { latitude: 0, longitude: 0, zoom: 2 };

export function StationMap({
    position,
    initialViewState,
    followPosition = true,
    className,
    propertyGeojson,
    propertyPopupNode,
}: props){
    const mapRef = useRef<MapRef | null>(null);
    const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

    const [viewState, setViewState] = useState(initialViewState ?? DEFAULT_VIEW);
    const [popupInfo, setPopupInfo] = useState<{lng: number, lat: number} | null>(null);

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
        interactiveLayerIds={propertyGeojson ? ["propriedade-fill"] : undefined}
        onClick={(e) => {
          if (e.features && e.features.length > 0 && e.features[0].layer.id === "propriedade-fill") {
            setPopupInfo({ lng: e.lngLat.lng, lat: e.lngLat.lat });
          } else {
            setPopupInfo(null);
          }
        }}
        cursor={propertyGeojson ? "pointer" : "auto"}
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
        {position ? (
          <Marker
            latitude={position.latitude}
            longitude={position.longitude}
            anchor="bottom"
          >
            <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow" />
          </Marker>
        ) : null}

        {popupInfo && propertyPopupNode && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
            anchor="left"
            className="z-50"
            offset={15}
          >
            {propertyPopupNode}
          </Popup>
        )}
      </Map>
    </div>
    );
}

