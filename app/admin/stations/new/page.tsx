import { NewStationForm } from "@/app/components/admin/station/NewStationForm";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { redirect } from "next/navigation";


export default async function NewStationPage() {

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
      <NavbarClient title="Administração - Nova Estação" />
      <div className="flex items-center justify-center p-6 mt-28">

        <NewStationForm />
      </div>
    </>
  );

}