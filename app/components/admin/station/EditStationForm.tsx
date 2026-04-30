"use client";

import { useEffect, useMemo, useState } from "react";
import { StationMap, type StationPosition } from "./StationMap";
import { ToggleSwitch } from "../../ui/ToogleSwitch";
import { FileUploadButton } from "../../ui/FileUploadButton";

type StationFormState = {
  codSta: string;        // read-only
  nomeSta: string;
  aliasSta: string;
  resSta: string;
  perSta: string;
  is_public: boolean;
  ownerCodUsr: string;   // read-only
  isActive: boolean;

  hasPulsos: boolean;
  hasTemp: boolean;
  hasPressao: boolean;
  hasUmidade: boolean;
  hasLum: boolean;
  hasVent: boolean;
  hasDv: boolean;

  latSta: string;
  longSta: string;

  hasImage: boolean;
};

function parseCoord(v: string): number | null {
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

function isValidLatLng(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function toNumberOrUndefined(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function EditStationForm({ codSta }: { codSta: string }) {
  const [form, setForm] = useState<StationFormState>({
    codSta,
    nomeSta: "",
    aliasSta: "",
    resSta: "",
    perSta: "15",
    is_public: false,
    ownerCodUsr: "",
    isActive: true,

    hasPulsos: false,
    hasTemp: false,
    hasPressao: false,
    hasUmidade: false,
    hasLum: false,
    hasVent: false,
    hasDv: false,

    latSta: "",
    longSta: "",

    hasImage: false,
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  const [debouncedLat, setDebouncedLat] = useState(form.latSta);
  const [debouncedLng, setDebouncedLng] = useState(form.longSta);

  const [imageFile, setImageFile] = useState<File | null>(null);

  // load existing station
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const res = await fetch(`/api/stations/${codSta}?view=allData`, {
          method: "GET",
          credentials: "include",
        });

        const json = await res.json().catch(() => null);

        if (res.status === 404) throw new Error("Estação Não Encontrada");
        if (res.status === 403) throw new Error("Acesso Negado");
        if (!res.ok) throw new Error(json?.error ?? `Erro ao carregar estação (status ${res.status})`);

        const s = json?.station;
        if (!s) throw new Error("Resposta inválida do servidor.");

        if (cancelled) return;

        setForm({
          codSta: s.codSta ?? codSta,
          nomeSta: s.nomeSta ?? "",
          aliasSta: s.aliasSta ?? "",
          resSta: s.resSta != null ? String(s.resSta) : "",
          perSta: s.perSta != null ? String(s.perSta) : "15",
          is_public: Boolean(s.is_public),
          isActive: Boolean(s.isActive),
          ownerCodUsr: s.codUsr ?? "",

          hasPulsos: Boolean(s.hasPulsos),
          hasTemp: Boolean(s.hasTemp),
          hasPressao: Boolean(s.hasPressao),
          hasUmidade: Boolean(s.hasUmidade),
          hasLum: Boolean(s.hasLum),
          hasVent: Boolean(s.hasVent),
          hasDv: Boolean(s.hasDv),

          latSta: s.latSta != null ? String(s.latSta) : "",
          longSta: s.longSta != null ? String(s.longSta) : "",

          hasImage: Boolean(s.hasImage),
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Erro ao carregar estação.");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [codSta]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLat(form.latSta), 250);
    return () => clearTimeout(t);
  }, [form.latSta]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLng(form.longSta), 250);
    return () => clearTimeout(t);
  }, [form.longSta]);

  const position: StationPosition | null = useMemo(() => {
    const lat = parseCoord(debouncedLat);
    const lng = parseCoord(debouncedLng);
    if (lat == null || lng == null) return null;
    if (!isValidLatLng(lat, lng)) return null;
    return { latitude: lat, longitude: lng };
  }, [debouncedLat, debouncedLng]);

  async function onSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitOk(null);

    // validations similar to NewStationForm
    if (!form.codSta.trim()) return setSubmitError("ID inválido (codSta).");
    if (!form.nomeSta.trim()) return setSubmitError("Informe o nome da estação (nomeSta).");
    if (!form.ownerCodUsr.trim()) return setSubmitError("Proprietário inválido (codUsr).");

    const lat = parseCoord(form.latSta);
    const lng = parseCoord(form.longSta);
    if (lat == null || lng == null || !isValidLatLng(lat, lng)) {
      return setSubmitError("Latitude/Longitude inválidas.");
    }

    const perSta = toNumberOrUndefined(form.perSta);
    if (!perSta || perSta <= 0) return setSubmitError("perSta deve ser um número > 0.");

    const resSta = Number(form.resSta.replace(",", "."));
    if (!Number.isFinite(resSta)) return setSubmitError("resSta inválido (use número).");

    setSubmitting(true);
    try {
      const payload = {
        // codSta e codUsr são read-only (server ignora se vier)
        nomeSta: form.nomeSta.trim(),
        aliasSta: form.aliasSta.trim() ? form.aliasSta.trim() : null,
        resSta: form.resSta.trim(),
        perSta,
        is_public: form.is_public,
        isActive: form.isActive,

        hasPulsos: form.hasPulsos,
        hasTemp: form.hasTemp,
        hasPressao: form.hasPressao,
        hasUmidade: form.hasUmidade,
        hasLum: form.hasLum,
        hasVent: form.hasVent,
        hasDv: form.hasDv,

        latSta: form.latSta.trim(),
        longSta: form.longSta.trim(),
      };

      const fd = new FormData();
      fd.set("payload", JSON.stringify(payload));
      if (imageFile) fd.set("image", imageFile);

      const res = await fetch(`/admin/stations/edit/${encodeURIComponent(form.codSta)}`, {
        method: "PATCH",
        credentials: "include",
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error ?? `Falha ao salvar (status ${res.status}).`;
        throw new Error(msg);
      }

      setSubmitOk("Estação atualizada com sucesso.");
      setImageFile(null);

      // se você retorna { savedImage: true } no PATCH:
      if (data?.savedImage) {
        setForm((f) => ({ ...f, hasImage: true }));
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao salvar estação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="w-full max-w-6xl mx-auto text-slate-700">Carregando...</div>;
  }

  if (loadError) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-sm text-red-600">{loadError}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          <div className="border border-slate-200 p-4 space-y-4">
            <div className="text-lg font-semibold">Dados da estação</div>

            <label className="space-y-1 block">
              <div className="text-sm font-medium">ID (codSta)</div>
              <input
                className="w-full border px-3 py-2 bg-slate-100"
                value={form.codSta}
                disabled
              />
              <div className="text-xs text-slate-500">Campo somente leitura.</div>
            </label>

            <label className="space-y-1 block">
              <div className="text-sm font-medium">Nome (nomeSta)</div>
              <input
                className="w-full border px-3 py-2"
                value={form.nomeSta}
                onChange={(e) => setForm((f) => ({ ...f, nomeSta: e.target.value }))}
                placeholder="Estação Fazenda X"
              />
            </label>

            <label className="space-y-1 block">
              <div className="text-sm font-medium">Alias (aliasSta)</div>
              <input
                className="w-full border px-3 py-2"
                value={form.aliasSta}
                onChange={(e) => setForm((f) => ({ ...f, aliasSta: e.target.value }))}
                placeholder="Fazenda X"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1 block">
                <div className="text-sm font-medium">Resolução (resSta)</div>
                <input
                  className="w-full border px-3 py-2"
                  value={form.resSta}
                  onChange={(e) => setForm((f) => ({ ...f, resSta: e.target.value }))}
                  placeholder="0.2"
                  inputMode="decimal"
                />
              </label>

              <label className="space-y-1 block">
                <div className="text-sm font-medium">Período (perSta)</div>
                <input
                  className="w-full border px-3 py-2"
                  value={form.perSta}
                  onChange={(e) => setForm((f) => ({ ...f, perSta: e.target.value }))}
                  placeholder="15"
                  inputMode="numeric"
                />
                <div className="text-xs text-slate-500">Em minutos</div>
              </label>
            </div>

            <label className="flex justify-between items-center gap-2">
              <ToggleSwitch
                checked={form.is_public}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))}
                label="Estação pública"
              />
              <ToggleSwitch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                label="Estação ativa"
              />
            </label>

            <label className="space-y-1 block">
              <div className="text-sm font-medium">Proprietário</div>
              <input
                className="w-full border px-3 py-2 bg-slate-100"
                value={form.ownerCodUsr}
                disabled
              />
              <div className="text-xs text-slate-500">Campo somente leitura.</div>
            </label>

            <div className="pt-2 border-t border-slate-200">
              <div className="text-sm font-medium mb-2">Sensores habilitados</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ToggleSwitch
                  checked={form.hasPulsos}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hasPulsos: v }))}
                  label="Pulsos"
                />

                <ToggleSwitch
                  checked={form.hasTemp}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hasTemp: v }))}
                  label="Temperatura"
                />

                <ToggleSwitch
                  checked={form.hasPressao}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hasPressao: v }))}
                  label="Pressão"
                />

                <ToggleSwitch
                  checked={form.hasUmidade}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hasUmidade: v }))}
                  label="Umidade"
                />

                <ToggleSwitch
                  checked={form.hasLum}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hasLum: v }))}
                  label="Luminosidade"
                />

                <ToggleSwitch
                  checked={form.hasVent}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hasVent: v }))}
                  label="Vento"
                />

                <ToggleSwitch
                  checked={form.hasDv}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hasDv: v }))}
                  label="Direção do vento (DV)"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-slate-900 text-white disabled:opacity-50"
              >
                {submitting ? "Salvando..." : "Salvar alterações"}
              </button>

              {submitError ? (
                <div className="mt-3 text-sm text-red-600">{submitError}</div>
              ) : null}

              {submitOk ? (
                <div className="mt-3 text-sm text-green-700">{submitOk}</div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="md:w-1/2 w-full mb-6 md:mb-0">
          <div className="border border-slate-200 p-4 space-y-4 h-full">
            <div className="text-lg font-semibold">Localização</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <div className="text-sm font-medium">Latitude (latSta)</div>
                <input
                  className="w-full border px-3 py-2"
                  value={form.latSta}
                  onChange={(e) => setForm((f) => ({ ...f, latSta: e.target.value }))}
                  placeholder="-18.7315157"
                  inputMode="decimal"
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-medium">Longitude (longSta)</div>
                <input
                  className="w-full border px-3 py-2"
                  value={form.longSta}
                  onChange={(e) => setForm((f) => ({ ...f, longSta: e.target.value }))}
                  placeholder="-47.5004928"
                  inputMode="decimal"
                />
              </label>
            </div>

            <div className="text-sm text-slate-600">
              {position
                ? `Preview: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
                : "Digite uma latitude/longitude válidas para pré-visualizar no mapa."}
            </div>

            {/* Mapa + Imagem empilhados (50/50 visual) */}
            <div className="flex flex-col gap-4">
              {/* MAPA */}
              <div className="border border-slate-200 p-2 flex flex-col">
                <div className="text-sm font-medium mb-2">Mapa</div>

                <div className="flex-1">
                  <StationMap
                    position={position}
                    initialViewState={{
                      latitude: -14.235,
                      longitude: -51.9253,
                      zoom: 3.5,
                    }}
                    className="min-h-[250px] w-full h-full"
                  />
                </div>
              </div>

              {/* IMAGEM */}
              <div className="border border-slate-200 p-2 h-full">
                <div className="text-sm font-medium mb-2">Imagem</div>

                {form.hasImage && (
                  <img
                    src={`/stations/${form.codSta}.jpg`}
                    alt={`Estação ${form.codSta}`}
                    className="object-cover"
                  />
                )}

                {!form.hasImage ? (
                  <label className="space-y-1 block mt-3">
                    <div className="text-sm font-medium">A estação não possui imagens cadastradas</div>
                    <FileUploadButton
                      label="Enviar imagem"
                      selectedFileName={imageFile?.name ?? null}
                      onFileSelected={(file) => setImageFile(file)}
                    />
                    {imageFile ? (
                      <div className="text-xs text-slate-500">
                        Selecionado: {imageFile.name}
                      </div>
                    ) : null}
                  </label>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}