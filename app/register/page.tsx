"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function formatCPF(value: string) {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

function formatCEP(value: string) {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 5) return clean;
    return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}

function formatPhone(value: string) {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 2) return clean;
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

export default function RegisterPage() {
    const router = useRouter();

    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [numero, setNumero] = useState("");
    const [cpfUsr, setCpfUsr] = useState("");
    const [cepUsr, setCepUsr] = useState("");
    const [ufUsr, setUfUsr] = useState("");
    const [cidadeUsr, setCidadeUsr] = useState("");
    const [logradouroUsr, setLogradouroUsr] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatCEP(val);
        setCepUsr(formatted);

        const clean = val.replace(/\D/g, "");
        if (clean.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
                if (response.ok) {
                    const data = await response.json();
                    if (!data.erro) {
                        setUfUsr(data.uf || "");
                        setCidadeUsr(data.localidade || "");
                        setLogradouroUsr(data.logradouro || "");
                    }
                }
            } catch (err) {
                console.error("Erro ao buscar CEP", err);
            }
        }
    };

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
                    passwordConfirm,
                    numero,
                    cpfUsr,
                    cepUsr,
                    ufUsr,
                    cidadeUsr,
                    logradouroUsr
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
            setNumero("");
            setCpfUsr("");
            setCepUsr("");
            setUfUsr("");
            setCidadeUsr("");
            setLogradouroUsr("");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen w-full flex items-center justify-center p-6 bg-linear-to-br from-[var(--color-gh2ogreen)] to-[var(--color-gh2oblue)]">
            <div className="flex flex-col md:flex-row w-[90vw] h-[80vh] md:w-[80vw] bg-white shadow-xl">
                {/* Lado Esquerdo - Formulário */}
                <div className="w-full md:w-1/2 h-full flex flex-col items-center p-6 md:p-8 lg:px-12 lg:py-6 relative overflow-y-auto">
                    <div className="w-full max-w-md my-auto flex flex-col space-y-4 py-4 2xl:overflow-y-hidden">
                        <div className="flex justify-center mb-2">
                            <Image
                                src="/logoatg.png"
                                alt="Logo"
                                width={240}
                                height={60}
                                className="object-contain"
                                priority
                            />
                        </div>

                        <form onSubmit={onSubmit} className="space-y-3.5">
                            {/* Dados de Login */}
                            <div className="border-b border-gray-150 pb-1">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informações da Conta</h3>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Nome</label>
                                <input
                                    className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    autoComplete="name"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Email</label>
                                    <input
                                        className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Telefone</label>
                                    <input
                                        className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                        value={numero}
                                        onChange={e => setNumero(formatPhone(e.target.value))}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">CPF</label>
                                <input
                                    className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                    value={cpfUsr}
                                    onChange={e => setCpfUsr(formatCPF(e.target.value))}
                                    placeholder="000.000.000-00"
                                    maxLength={14}
                                />
                            </div>

                            {/* Endereço */}
                            <div className="border-b border-gray-150 pb-1 pt-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Localização</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">CEP</label>
                                    <input
                                        className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                        value={cepUsr}
                                        onChange={handleCepChange}
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
                                </div>
                                <div className="col-span-1 space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">UF</label>
                                    <input
                                        className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors uppercase"
                                        value={ufUsr}
                                        onChange={e => setUfUsr(e.target.value.slice(0, 2))}
                                        placeholder="EX"
                                        maxLength={2}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Cidade</label>
                                    <input
                                        className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                        value={cidadeUsr}
                                        onChange={e => setCidadeUsr(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Logradouro</label>
                                    <input
                                        className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
                                        value={logradouroUsr}
                                        onChange={e => setLogradouroUsr(e.target.value)}
                                        placeholder="Rua, Av., etc."
                                    />
                                </div>
                            </div>

                            {/* Segurança */}
                            <div className="border-b border-gray-150 pb-1 pt-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Segurança</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Senha</label>
                                    <div className="relative">
                                        <input
                                            className="w-full border border-gray-300 px-3 py-1.5 pr-10 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
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
                                    <label className="text-xs font-semibold text-slate-700">Repetir senha</label>
                                    <div className="relative">
                                        <input
                                            className="w-full border border-gray-300 px-3 py-1.5 pr-10 text-sm focus:outline-none focus:border-[var(--color-gh2ogreen)] transition-colors"
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
                            </div>

                            {error && <div className="text-xs text-red-600 border border-red-200 bg-red-50 p-2">{error}</div>}
                            {success && (
                                <div className="text-xs text-green-600 border border-green-200 bg-green-50 p-2">Usuário cadastrado! Redirecionando...</div>
                            )}

                            <div className="pt-2 flex flex-col space-y-3">
                                <div className="text-xs text-center text-slate-600">
                                    Já possui uma conta?{" "}
                                    <Link href="/login" className="text-[var(--color-gh2ogreen)] font-semibold hover:underline">
                                        Entrar
                                    </Link>
                                </div>
                                <button
                                    className="w-full px-4 py-2.5 bg-[var(--color-gh2ogreen)] hover:bg-emerald-600 text-white font-semibold disabled:opacity-60 transition-colors text-sm"
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