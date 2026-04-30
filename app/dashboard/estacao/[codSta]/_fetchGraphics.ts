import "server-only";

import { headers } from "next/headers";

export async function getBaseUrlFromHeaders() {
  const h = await headers();

  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");

  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }

  return `${proto}://${host}`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const h = await headers();
  const base = await getBaseUrlFromHeaders();
  const url = new URL(path, base);

  // Encaminha o cookie da request atual para a API route
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      cookie,
      "x-requested-with": "ssr",
    },
  });

  let json: any = null;
  try {
    json = await res.clone().json();
  } catch {}

  if (!res.ok) {
    // Se for 401 mas a resposta indicar estação pública, retorna o JSON normalmente
    if (
      res.status === 401 &&
      json && (json.is_public === true || json.public === true)
    ) {
      return json;
    }
    throw new Error(
      `fetch_failed ${res.status} ${url.toString()} detail=${JSON.stringify(json)}`,
    );
  }

  return json;
}