import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { NavbarClient } from "../components/Navbar/NavbarClient";
import OverviewClient from "./OverviewClient";

export default async function OverviewPage() {
    // 1. Pega o usuário logado para passar o ID dele ao client component
    // Opcional: Se 'me' for nulo, passamos 'public' ou vazio para buscar apenas as públicas
    const me = await getCurrentUser();
    const codUsr = me?.codUsr || 'public';

    return (
        <div className="">
            <NavbarClient title="Visão Geral" />
            <main className="mt-28 p-6 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Overview das Estações</h1>
                </div>

                <OverviewClient targetCodUsr={codUsr} />
            </main>
        </div>
    );
}