"use client";

import Image from "next/image";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faClock, faPhone, faUser, faChartBar, faPlus, faPenToSquare, faSignOut, faBars } from "@fortawesome/free-solid-svg-icons";
import { faFacebookF, faInstagram } from "@fortawesome/free-brands-svg-icons";

type MeResponse = {
  user: null | {
    codUsr: string;
    emailUsr: string;
    nomeUsr: string;
    role: "admin" | "user";
  }
}

function isMeResponse(value: unknown): value is MeResponse {
  if (!value || typeof value !== "object") return false;
  return "user" in value;
}

interface NavbarProps {
  title?: string;
}

export function NavbarClient({ title }: NavbarProps) {

  const router = useRouter();

  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadMe() {
      setLoadingMe(true);
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          setMe(null);
          return;
        }

        const json = (await res.json()) as unknown;

        const user = isMeResponse(json) ? json.user : null;
        setMe(user ?? null);
      } catch {
        setMe(null);
      } finally {
        setLoadingMe(false);
      }
    }

    loadMe();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function doLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setOpen(false);
    setMe(null);
    router.refresh();
    window.location.href = "/";
  }

  async function goToStationCreation() {
    router.push("/admin/stations/new");
  }
  async function goToStationChange() {
    router.push("/admin/stations/edit");
  }
  async function goToStationOverview() {
    router.push("/overview");
  }

  const normalizedTitle = (title ?? "").toLowerCase();
  const isDashboardTitle = normalizedTitle.includes("usuário") || normalizedTitle.includes("sistema");
  const logoSrc = "/logoatg.png";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 shadow-md">
      {isDashboardTitle && (
        <nav className="hidden sm:flex items-center justify-between px-10 h-10 bg-gray-100">
          <nav className="flex items-center gap-10">
            <div className="flex gap-2 items-center text-sm">
              <FontAwesomeIcon icon={faLocationDot} className="text-[var(--color-gh2ogreen)]" />
              <p className="text-gray-600">Rua Joaquim Pinto, 520 Bairro Batuque, Monte Carmelo - MG</p>
            </div>
            <div className="flex gap-2 items-center">
              <FontAwesomeIcon icon={faClock} className="text-[var(--color-gh2ogreen)]" />
              <p className="text-gray-600">Seg. - Sex. : 07:30 - 17:30</p>
            </div>
          </nav>
          <nav className="flex items-center gap-10">
            <div className="flex gap-2 items-center text-sm">
              <FontAwesomeIcon icon={faPhone} className="text-[var(--color-gh2ogreen)]" />
              <p className="text-gray-600">(34) 3842-6447</p>
            </div>
            <div className="flex gap-2 items-center">
              <section className="flex gap-2 items-center text-[var(--color-gh2ogreen)]">
                <div className="bg-white p-1">
                  <a href="https://www.facebook.com/fernandofariagestaorh/?locale=pt_BR">
                    <FontAwesomeIcon icon={faFacebookF} />
                  </a>
                </div>
                <div className="bg-white p-1">
                  <a href="https://www.instagram.com/gh2orecursoshidricos/">
                    <FontAwesomeIcon icon={faInstagram} />
                  </a>
                </div>
              </section>
            </div>
          </nav>
        </nav>
      )}

      <nav className="flex items-center justify-between px-4 md:px-10 h-24
                      bg-white backdrop-blur-sm text-white">
        <div className="flex items-center gap-3 ">
          <a href="/">
            <Image src={logoSrc} alt="Logo" width={180} height={200} />
          </a>
          <div className="hidden sm:flex">
            <h2 className="text-sm md:text-lg lg:text-1xl xl:text-3xl font-sans ml-5 text-stone-600 font-bold">
              {title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3" ref={menuRef}>
          {loadingMe ? (
            <div className="text-stone-600 text-sm">...</div>
          ) : me ? (
            <div className="relative">
              <button
                type="button"
                className="px-5 py-1.5 bg-gray-200 hover:bg-gray-300 text-lg text-black border border-gray-300 flex items-center justify-center gap-2"
                onClick={() => setOpen(v => !v)}
              >
                <FontAwesomeIcon icon={faBars} className="lg:hidden" />
                <span className="hidden lg:inline">Olá, {me.nomeUsr}</span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 border border-gray-400 shadow-md overflow-hidden">
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3"
                    onClick={() => {
                      setOpen(false);
                      router.push("/conta"); // placeholder
                    }}
                  >
                    <FontAwesomeIcon icon={faUser} className="text-lg text-slate-500" />
                    Conta
                  </button>
                  <button
                    type="button"
                    className="hidden lg:block w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3"
                    onClick={() => {
                      setOpen(false);
                      goToStationOverview();
                    }}
                  >
                    <FontAwesomeIcon icon={faChartBar} className="text-lg text-slate-500" />
                    Visualizar estações
                  </button>
                  {me.role === "admin" ? (
                    <>
                      <button
                        type="button"
                        className="block w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3"
                        onClick={() => {
                          setOpen(false);
                          goToStationCreation();
                        }}
                      >
                        <FontAwesomeIcon icon={faPlus} className="text-lg text-slate-500" />
                        Criar estação
                      </button>
                      <button
                        type="button"
                        className="block w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3"
                        onClick={() => {
                          setOpen(false);
                          goToStationChange();
                        }}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} className="text-lg text-slate-500" />
                        Editar estação
                      </button>

                    </>
                  ) : null}
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3"
                    onClick={doLogout}
                  >
                    <FontAwesomeIcon icon={faSignOut} className="text-lg text-slate-500" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Mobile hamburger button */}
              <button
                type="button"
                className="lg:hidden px-4 py-2 bg-[var(--color-gh2ogreen)] hover:bg-emerald-600 text-white text-lg flex items-center justify-center gap-2"
                onClick={() => setOpen(v => !v)}
              >
                <FontAwesomeIcon icon={faBars} />
                <span className="text-sm">Menu</span>
              </button>

              {/* Mobile dropdown */}
              {open && (
                <div className="lg:hidden absolute right-0 mt-2 w-48 bg-white text-slate-800 border border-gray-400 shadow-md overflow-hidden">
                  <button
                    type="button"
                    className="block w-full text-left px-5 py-3 font-semibold hover:bg-slate-50 border-b border-gray-100"
                    onClick={() => { setOpen(false); router.push("/login"); }}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-5 py-3 font-semibold hover:bg-slate-50"
                    onClick={() => { setOpen(false); router.push("/register"); }}
                  >
                    Registrar
                  </button>
                </div>
              )}

              {/* Desktop buttons */}
              <div className="hidden lg:flex gap-2 items-center">
                <button
                  type="button"
                  className="px-7 py-1.5 bg-[var(--color-gh2ogreen)] hover:bg-emerald-600 text-lg shadow-sm"
                  onClick={() => router.push("/login")}
                >
                  Login
                </button>
                <div className="text-black">ou</div>
                <button
                  type="button"
                  className="px-7 py-1.5 bg-[var(--color-gh2ogreen)] hover:bg-emerald-600 text-lg shadow-sm"
                  onClick={() => router.push("/register")}
                >
                  Registrar
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}