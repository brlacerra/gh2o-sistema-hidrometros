"use client";

import { useEffect, useMemo, useState } from "react";
import { StationMap, type StationPosition } from "./StationMap";
import { ToggleSwitch } from "../../ui/ToogleSwitch";

type StationFormState = {
  codSta: string;
  nomeSta: string;
  aliasSta: string;
  resSta: string;
  perSta: string;
  is_public: boolean;
  ownerCodUsr: string;

  hasPulsos: boolean;
  hasTemp: boolean;
  hasPressao: boolean;
  hasUmidade: boolean;
  hasLum: boolean;
  hasVent: boolean;
  hasDv: boolean;

  latSta: string;
  longSta: string;
};

type UserOption = {
  codUsr: string;
  nomeUsr: string;
  role: "admin" | "user";
}


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

export function NewStationForm() {
  const [form, setForm] = useState<StationFormState>({
    codSta: "",
    nomeSta: "",
    aliasSta: "",
    resSta: "",
    perSta: "15",
    is_public: false,
    ownerCodUsr: "",

    hasPulsos: false,
    hasTemp: false,
    hasPressao: false,
    hasUmidade: false,
    hasLum: false,
    hasVent: false,
    hasDv: false,

    latSta: "",
    longSta: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  const [debouncedLat, setDebouncedLat] = useState(form.latSta);
  const [debouncedLng, setDebouncedLng] = useState(form.longSta);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setUsersLoading(true);
      setUsersError(null);

      try {
        const res = await fetch("/api/users", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error ?? `Erro ao buscar usuários (status ${res.status})`);
        }
        if (cancelled) return;
        setUsers(Array.isArray(data) ? (data as UserOption[]) : []);
      } catch (err) {
        setUsersError(err instanceof Error ? err.message : "Erro ao buscar usuários.");
      } finally {
        setUsersLoading(false);
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    }
  }, []);

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

    if (!form.codSta.trim()) return setSubmitError("Informe o ID da estação (codSta).");
    if (!form.nomeSta.trim()) return setSubmitError("Informe o nome da estação (nomeSta).");
    if (!form.ownerCodUsr.trim()) return setSubmitError("Informe o proprietário (ownerCodUsr).");

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
        codSta: form.codSta.trim(),
        nomeSta: form.nomeSta.trim(),
        aliasSta: form.aliasSta.trim() ? form.aliasSta.trim() : null,
        resSta: form.resSta.trim(),
        perSta,
        is_public: form.is_public,
        ownerCodUsr: form.ownerCodUsr.trim(),

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

      const res = await fetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.error ??
          `Falha ao criar estação (status ${res.status}).`;
        throw new Error(msg);
      }

      setSubmitOk("Estação criada com sucesso.");
      setForm((f) => ({ ...f, codSta: "", nomeSta: "", aliasSta: "", resSta: "", perSta: "", latSta: "", longSta: "" }));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao criar estação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2 w-full">
          <div className="border border-slate-200 p-4 space-y-4">
            <div className="text-lg font-semibold">Dados da estação</div>

            <label className="space-y-1 block">
              <div className="text-sm font-medium">ID (codSta)</div>
              <input
                className="w-full border px-3 py-2"
                value={form.codSta}
                onChange={(e) => setForm((f) => ({ ...f, codSta: e.target.value }))}
                placeholder="STA001"
              />
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

            <label className="flex items-center gap-2">
              <ToggleSwitch
                checked={form.is_public}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))}
                label="Estação pública"
              />
            </label>

            <label className="space-y-1 block">
              <div className="text-sm font-medium">Proprietário</div>

              <select
                className="w-full border px-3 py-2 bg-white"
                value={form.ownerCodUsr}
                onChange={(e) => setForm((f) => ({ ...f, ownerCodUsr: e.target.value }))}
                disabled={usersLoading || !!usersError}
              >
                <option value="" disabled>
                  {usersLoading
                    ? "Carregando usuários..."
                    : usersError
                      ? "Falha ao carregar usuários"
                      : "Selecione um usuário"}
                </option>

                {users.map((u) => (
                  <option key={u.codUsr} value={u.codUsr}>
                    {u.codUsr} — {u.nomeUsr ?? "(sem nome)"} {u.role === "admin" ? "[admin]" : ""}
                  </option>
                ))}
              </select>

              {usersError ? (
                <div className="text-sm text-red-600">{usersError}</div>
              ) : (
                <div className="text-xs text-slate-500">
                  Escolha quem será o dono (sta.codUsr).
                </div>
              )}
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-slate-900 text-white disabled:opacity-50"
              >
                {submitting ? "Salvando..." : "Criar estação"}
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

        <div className="md:w-1/2 w-full flex flex-col">
          <div className="border border-slate-200 p-4 space-y-4 flex flex-col flex-1">
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

            <StationMap
              position={position}
              initialViewState={{
                latitude: -14.235,
                longitude: -51.9253,
                zoom: 3.5,
              }}
              className="flex-1 min-h-[300px] max-h-[500px] w-full"
            />
          </div>
        </div>
      </form>
    </div>
  );
}