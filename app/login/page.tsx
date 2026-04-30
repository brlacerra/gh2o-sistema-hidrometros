"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                }),
            });

            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as { error: string } | null;
                setError(json?.error || "Erro ao realizar o login");
                return;
            }

            router.push("/");
            router.refresh();

        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen w-full flex items-center justify-center p-6 bg-linear-to-br from-[var(--color-gh2ogreen)] to-[var(--color-gh2oblue)]">
            <div className="flex flex-col md:flex-row w-[80vw] h-[80vh] bg-white shadow-xl">
                <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-y-auto">
                    <div className="w-full max-w-sm flex flex-col justify-center space-y-8">
                        <div className="flex justify-center mb-10">
                            <Image
                                src="/logoatg.png"
                                alt="Logo"
                                width={200}
                                height={80}
                                className="object-contain"
                                priority
                            />
                        </div>

                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Email</label>
                                <input
                                    className="w-full border border-gray-400 px-3 py-2 focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Senha</label>
                                <div className="relative">
                                    <input
                                        className="w-full border border-gray-400 px-3 py-2 pr-10 focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="text-sm text-red-600 border border-red-200 bg-red-50 p-2">
                                    {error}
                                </div>
                            )}

                            <div className="pt-2 flex flex-col space-y-4">
                                <div className="text-sm text-center text-slate-600">
                                    Não possui conta?{" "}
                                    <Link href="/register" className="text-[var(--color-gh2ogreen)] font-semibold hover:underline">
                                        Cadastre-se
                                    </Link>
                                </div>
                                <button
                                    className="w-full px-4 py-3 bg-[var(--color-gh2ogreen)] hover:bg-emerald-600 text-white font-semibold disabled:opacity-60 transition-colors"
                                    disabled={loading}
                                    type="submit"
                                >
                                    {loading ? "Entrando..." : "Entrar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="hidden md:flex w-1/2 h-full bg-gray-600 relative items-center justify-center overflow-hidden">
                    <Image
                        src="/fundo_login.jpg"
                        alt="Imagem de fundo"
                        fill
                        className="object-cover opacity-40"
                        priority
                    />
                </div>
            </div>
        </main>
    );
}