import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { StationsAdminClient } from "@/app/admin/stations/edit/stationsAdminClient";

export default async function AdminStationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  if (me.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
      </div>
    );
  }

  return (
    <>
      <NavbarClient title="Administração - Estações" />
      <div className="mt-40 px-4 md:px-10">
        <StationsAdminClient />
      </div>
    </>
  );
}