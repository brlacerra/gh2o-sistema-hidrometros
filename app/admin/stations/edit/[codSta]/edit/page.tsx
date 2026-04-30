import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { EditStationForm } from "../../../../../components/admin/station/EditStationForm";

export default async function EditStationPage(
  props: { params: Promise<{ codSta: string }> }
) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  if (me.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
      </div>
    );
  }

  const { codSta } = await props.params;

  return (
    <>
      <NavbarClient title="Administração - Editar Estação" />
      <div className="mt-28 px-4 md:px-10">
        <EditStationForm codSta={codSta} />
      </div>
    </>
  );
}