"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Map, { Marker, Source, Layer, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faHouse,
  faTrash,
  faSpinner,
  faLocationCrosshairs,
} from "@fortawesome/free-solid-svg-icons";
import { FileUploadButton } from "../ui/FileUploadButton";

type PropertyFormState = {
  nomeProp: string;
  cidadeProp: string;
  ufProp: string;
};

const defaultMapProps = {
  latitude: -14.235,
  longitude: -51.9253,
  zoom: 4,
};

function parseKmlText(text: string): [number, number][] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const coordElements = xmlDoc.getElementsByTagName("coordinates");

  if (coordElements.length === 0) {
    throw new Error("Não foram encontrados elementos de coordenadas no arquivo KML.");
  }

  let coordsStr = "";
  for (let i = 0; i < coordElements.length; i++) {
    const parentNode = coordElements[i].parentNode;
    if (
      parentNode &&
      (parentNode.nodeName === "LinearRing" ||
        parentNode.nodeName === "outerBoundaryIs" ||
        parentNode.nodeName === "Polygon")
    ) {
      coordsStr = coordElements[i].textContent || "";
      if (coordsStr.trim()) break;
    }
  }

  if (!coordsStr.trim()) {
    coordsStr = coordElements[0].textContent || "";
  }

  if (!coordsStr.trim()) {
    throw new Error("O arquivo KML de coordenadas está vazio.");
  }

  const points = coordsStr
    .trim()
    .split(/\s+/)
    .map((pointStr) => {
      const parts = pointStr.split(",");
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      return [lng, lat] as [number, number];
    })
    .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));

  if (points.length === 0) {
    throw new Error("Nenhum ponto válido encontrado no arquivo.");
  }

  // Remove closing duplicate coordinate if present
  if (points.length >= 4) {
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7) {
      points.pop();
    }
  }

  return points;
}

export function NewPropertyForm() {
  const router = useRouter();
  const mapRef = useRef<MapRef | null>(null);
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  const [form, setForm] = useState<PropertyFormState>({
    nomeProp: "",
    cidadeProp: "",
    ufProp: "",
  });

  const [cep, setCep] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [viewState, setViewState] = useState({ ...defaultMapProps });
  const [loadingUserLoc, setLoadingUserLoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  // Load user default map view if available
  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.latMap && data?.user?.longMap) {
            const nextView = {
              latitude: Number(data.user.latMap),
              longitude: Number(data.user.longMap),
              zoom: Number(data.user.zoomMap ?? 12),
            };
            setViewState(nextView);
            mapRef.current?.flyTo({
              center: [nextView.longitude, nextView.latitude],
              zoom: nextView.zoom,
              duration: 1500,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar configurações de mapa do usuário", err);
      }
    }
    loadMe();
  }, []);

  // Fetch address and coordinates using CEP (ViaCEP + Nominatim OSM)
  const handleCepChange = async (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 8);
    setCep(clean);
    setCepError(null);

    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (data.erro) {
            setCepError("CEP não encontrado.");
          } else {
            setForm((f) => ({
              ...f,
              cidadeProp: data.localidade || "",
              ufProp: data.uf || "",
            }));

            // Use Nominatim to geocode and center map
            const query = `${data.localidade}, ${data.uf}, Brazil`;
            const nominatimRes = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
              {
                headers: {
                  "User-Agent": "gh2o-sistema-horimetros-app",
                },
              }
            );

            if (nominatimRes.ok) {
              const results = await nominatimRes.json();
              if (results && results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lon = parseFloat(results[0].lon);
                const nextView = { latitude: lat, longitude: lon, zoom: 12 };
                setViewState(nextView);
                mapRef.current?.flyTo({
                  center: [lon, lat],
                  zoom: 12,
                  duration: 1500,
                });
              }
            }
          }
        } else {
          setCepError("Erro ao consultar CEP.");
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
        setCepError("Erro na conexão ao consultar CEP.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Fly to user GPS location
  const handleGetLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    setLoadingUserLoc(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nextView = { latitude, longitude, zoom: 15 };
        setViewState(nextView);
        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true,
          duration: 1500,
        });
        setLoadingUserLoc(false);
      },
      (error) => {
        console.error("Erro ao obter localização física:", error);
        alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
        setLoadingUserLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Add point on click
  const handleMapClick = (evt: any) => {
    const { lng, lat } = evt.lngLat;
    setCoordinates((prev) => [...prev, [lng, lat]]);
  };

  // Remove a specific point
  const handleRemovePoint = (index: number) => {
    setCoordinates((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Move marker when dragged
  const handleMarkerDragEnd = (index: number, evt: any) => {
    const { lng, lat } = evt.lngLat;
    setCoordinates((prev) => {
      const next = [...prev];
      next[index] = [lng, lat];
      return next;
    });
  };

  // Clear map
  const handleClear = () => {
    if (window.confirm("Deseja realmente limpar toda a área desenhada?")) {
      setCoordinates([]);
      setUploadedFileName(null);
    }
  };

  // Handle KML/KMZ upload
  const handleFileUpload = async (file: File | null) => {
    if (!file) {
      setUploadedFileName(null);
      return;
    }

    setUploadedFileName(file.name);
    setSubmitError(null);
    setSubmitOk(null);
    try {
      let kmlText = "";
      if (file.name.endsWith(".kmz")) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(file);
        const kmlFileName = Object.keys(zip.files).find((name) => name.endsWith(".kml"));
        if (!kmlFileName) {
          throw new Error("Arquivo KML não encontrado dentro do KMZ.");
        }
        kmlText = await zip.files[kmlFileName].async("text");
      } else if (file.name.endsWith(".kml")) {
        kmlText = await file.text();
      } else {
        throw new Error("Formato de arquivo não suportado. Envie um arquivo .kml ou .kmz.");
      }

      const parsedPoints = parseKmlText(kmlText);
      setCoordinates(parsedPoints);

      // Centroid lookup and map flying
      if (parsedPoints.length > 0) {
        let sumLng = 0;
        let sumLat = 0;
        for (const p of parsedPoints) {
          sumLng += p[0];
          sumLat += p[1];
        }
        const cLng = sumLng / parsedPoints.length;
        const cLat = sumLat / parsedPoints.length;

        setViewState((v) => ({
          ...v,
          latitude: cLat,
          longitude: cLng,
          zoom: 14,
        }));
        mapRef.current?.flyTo({
          center: [cLng, cLat],
          zoom: 14,
          duration: 1500,
        });
      }
    } catch (err) {
      console.error("Erro no upload de KML/KMZ:", err);
      setSubmitError(err instanceof Error ? err.message : "Erro ao processar o arquivo.");
      setUploadedFileName(null);
    }
  };

  // GeoJSON Polygon preview
  const polygonGeoJSON = useMemo(() => {
    if (coordinates.length < 3) return null;
    const closedCoords = [...coordinates, coordinates[0]];
    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [closedCoords],
      },
      properties: {},
    };
  }, [coordinates]);

  // GeoJSON Line boundary preview
  const lineGeoJSON = useMemo(() => {
    if (coordinates.length < 2) return null;
    const closedCoords = coordinates.length >= 3 ? [...coordinates, coordinates[0]] : coordinates;
    return {
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: closedCoords,
      },
      properties: {},
    };
  }, [coordinates]);

  // Form submit handler
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitOk(null);

    if (!form.nomeProp.trim()) {
      return setSubmitError("O nome da propriedade é obrigatório.");
    }
    if (coordinates.length > 0 && coordinates.length < 3) {
      return setSubmitError(
        "A propriedade precisa ter no mínimo 3 pontos para formar uma área. Ou limpe o mapa para cadastrar sem área."
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/propriedade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeProp: form.nomeProp.trim(),
          cidadeProp: form.cidadeProp.trim() || undefined,
          ufProp: form.ufProp.trim() || undefined,
          coordinates: coordinates.length >= 3 ? coordinates : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Falha ao criar propriedade.");
      }

      setSubmitOk("Propriedade cadastrada com sucesso!");
      router.refresh();
      setTimeout(() => {
        router.push("/propriedade/view");
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao criar propriedade.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-6">

        {/* Left column: Fields and controls */}
        <div className="md:w-1/2 w-full">
          <div className="border border-slate-200 p-4 space-y-4">
            <div className="text-lg font-semibold">Dados da propriedade</div>

            <label className="space-y-1 block">
              <div className="text-sm font-medium">Nome (nomeProp) *</div>
              <input
                className="w-full border px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-500 transition"
                value={form.nomeProp}
                onChange={(e) => setForm((f) => ({ ...f, nomeProp: e.target.value }))}
                placeholder="Fazenda Primavera"
                required
              />
            </label>

            <label className="space-y-1 block">
              <div className="text-sm font-medium flex items-center justify-between">
                <span>CEP (para buscar endereço e centralizar mapa)</span>
                {loadingCep && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    Buscando...
                  </span>
                )}
              </div>
              <input
                className="w-full border px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-500 transition"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="38500-000"
              />
              {cepError && <div className="text-xs text-red-600">{cepError}</div>}
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1 block md:col-span-2">
                <div className="text-sm font-medium">Cidade (cidadeProp)</div>
                <input
                  className="w-full border px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-500 transition"
                  value={form.cidadeProp}
                  onChange={(e) => setForm((f) => ({ ...f, cidadeProp: e.target.value }))}
                  placeholder="Monte Carmelo"
                />
              </label>

              <label className="space-y-1 block">
                <div className="text-sm font-medium">Estado (ufProp)</div>
                <input
                  className="w-full border px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-500 transition uppercase"
                  value={form.ufProp}
                  onChange={(e) => setForm((f) => ({ ...f, ufProp: e.target.value.slice(0, 2) }))}
                  placeholder="MG"
                  maxLength={2}
                />
              </label>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="text-sm font-medium mb-2">Desenho da Área no Mapa (opcional)</div>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                Navegue livremente pelo mapa e dê um clique/toque para marcar os pontos de limite da propriedade.
                Clique e arraste qualquer ponto para movê-lo de lugar. Clique duas vezes seguidas em um ponto para removê-lo.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={loadingUserLoc}
                  className="px-4 py-2 border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                >
                  {loadingUserLoc ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faLocationCrosshairs} />
                  )}
                  Ir p/ meu GPS
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={coordinates.length === 0}
                  className="px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  Limpar Mapa
                </button>
              </div>

              <div className="mt-4">
                <FileUploadButton
                  label="Importar KML/KMZ"
                  accept=".kml,.kmz"
                  selectedFileName={uploadedFileName}
                  onFileSelected={handleFileUpload}
                  helperText="Carregue um arquivo .kml ou .kmz (do Google Earth ou semelhante) para preencher a área automaticamente."
                />
              </div>

              {/* Coordinates status log */}
              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <div>
                  Pontos marcados: <span className="font-semibold text-slate-700">{coordinates.length}</span>
                </div>
                {coordinates.length > 0 && (
                  <div className="max-h-24 overflow-y-auto pt-1 border-t border-slate-200 space-y-1 font-mono">
                    {coordinates.map((coord, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span>P{idx + 1}: {coord[1].toFixed(5)}, {coord[0].toFixed(5)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePoint(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Apagar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting || (coordinates.length > 0 && coordinates.length < 3)}
                className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 transition"
              >
                {submitting ? "Salvando..." : "Criar propriedade"}
              </button>

              {submitError && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 border border-red-200">
                  {submitError}
                </div>
              )}

              {submitOk && (
                <div className="mt-3 text-sm text-green-700 bg-green-50 p-2 border border-green-200">
                  {submitOk}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right column: Interactive map */}
        <div className="md:w-1/2 w-full flex flex-col">
          <div className="border border-slate-200 p-4 space-y-4 flex flex-col flex-1">
            <div className="text-lg font-semibold">Localização</div>

            <div className="flex-grow min-h-[400px] h-[400px] md:h-full relative bg-slate-100">
              <Map
                ref={mapRef}
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                onClick={handleMapClick}
                style={{ width: "100%", height: "100%" }}
                mapLib={maplibregl}
                mapStyle={`https://api.maptiler.com/maps/hybrid-v4/style.json?key=${maptilerKey}`}
              >
                {/* Vertex Markers */}
                {coordinates.map((coord, idx) => (
                  <Marker
                    key={idx}
                    longitude={coord[0]}
                    latitude={coord[1]}
                    anchor="center"
                    draggable
                    onDragEnd={(evt) => handleMarkerDragEnd(idx, evt)}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleRemovePoint(idx);
                      }}
                      className="w-5 h-5 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold select-none cursor-pointer hover:bg-red-700 transition shadow"
                      title={`Ponto ${idx + 1} - Arraste para mover, duplo clique para remover`}
                    >
                      {idx + 1}
                    </div>
                  </Marker>
                ))}

                {/* Filled Polygon Layer */}
                {polygonGeoJSON && (
                  <Source id="polygon-source" type="geojson" data={polygonGeoJSON}>
                    <Layer
                      id="polygon-layer"
                      type="fill"
                      paint={{
                        "fill-color": "#10b981",
                        "fill-opacity": 0.25,
                      }}
                    />
                  </Source>
                )}

                {/* Line Boundary Layer */}
                {lineGeoJSON && (
                  <Source id="line-source" type="geojson" data={lineGeoJSON}>
                    <Layer
                      id="line-layer"
                      type="line"
                      paint={{
                        "line-color": "#10b981",
                        "line-width": 3,
                      }}
                    />
                  </Source>
                )}
              </Map>
            </div>

            <div className="text-xs text-slate-500">
              {coordinates.length >= 3
                ? `Área desenhada com ${coordinates.length} vértices.`
                : "Clique no mapa para marcar a área da propriedade."}
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}
