"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

export default function RegisterPage() {
    const router = useRouter();

    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    nome,
                    email,
                    password,
                    passwordConfirm
                }),
            });
            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as { error: string } | null;
                setError(json?.error || "Erro ao cadastrar");
                return;
            }
            setSuccess(true);
            const loginRes = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    email,
                    password
                }),
            });
            if (!loginRes.ok) {
                setError("Cadastro ok, mas houve erro ao fazer o login automático.");
                return;
            }
            router.push("/");
            router.refresh();
            setNome("");
            setEmail("");
            setPassword("");
            setPasswordConfirm("");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen w-full flex items-center justify-center p-6 bg-linear-to-br from-[var(--color-gh2ogreen)] to-[var(--color-gh2oblue)]">
            <div className="flex flex-col md:flex-row w-[80vw] h-[80vh] bg-white shadow-xl">
                {/* Lado Esquerdo - Formulário */}
                <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-y-auto">
                    <div className="w-full max-w-sm flex flex-col justify-center space-y-8">
                        <div className="flex justify-center mb-10">
                            <Image 
                                src="/logoatg.png" 
                                alt="Logo" 
                                width={300} 
                                height={80} 
                                className="object-contain" 
                                priority 
                            />
                        </div>
                        
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Nome</label>
                                <input
                                    className="w-full border border-gray-400 px-3 py-2 focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    autoComplete="name"
                                    required
                                />
                            </div>

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
                                        autoComplete="new-password"
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

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Repetir senha</label>
                                <div className="relative">
                                    <input
                                        className="w-full border border-gray-400 px-3 py-2 pr-10 focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                        type={showPasswordConfirm ? "text" : "password"}
                                        value={passwordConfirm}
                                        onChange={e => setPasswordConfirm(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                        title={showPasswordConfirm ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        <FontAwesomeIcon icon={showPasswordConfirm ? faEyeSlash : faEye} className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {error && <div className="text-sm text-red-600 border border-red-200 bg-red-50 p-2">{error}</div>}
                            {success && (
                                <div className="text-sm text-green-600 border border-green-200 bg-green-50 p-2">Usuário cadastrado! Redirecionando...</div>
                            )}

                            <div className="pt-2 flex flex-col space-y-4">
                                <div className="text-sm text-center text-slate-600">
                                    Já possui uma conta?{" "}
                                    <Link href="/login" className="text-[var(--color-gh2ogreen)] font-semibold hover:underline">
                                        Entrar
                                    </Link>
                                </div>
                                <button
                                    className="w-full px-4 py-3 bg-[var(--color-gh2ogreen)] hover:bg-emerald-600 text-white font-semibold disabled:opacity-60 transition-colors"
                                    disabled={loading}
                                    type="submit"
                                >
                                    {loading ? "Cadastrando..." : "Cadastrar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Lado Direito - Imagem */}
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