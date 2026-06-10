import { NavbarClient } from "@/app/components/Navbar/NavbarClient";
import { NewPropertyForm } from "@/app/components/propriedade/NewPropertyForm";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { redirect } from "next/navigation";

export default async function NewPropertyPage() {
  const me = await getCurrentUser();
  
  if (!me) {
    redirect("/login");
  }

  // Redirect if user already has a property
  if (me.propriedade && me.propriedade.length > 0) {
    redirect("/propriedade/view");
  }

  return (
    <>
      <NavbarClient title="Criar Propriedade" />
      <main className="flex items-center justify-center p-4 md:p-6 mt-28">
        <NewPropertyForm />
      </main>
    </>
  );
}