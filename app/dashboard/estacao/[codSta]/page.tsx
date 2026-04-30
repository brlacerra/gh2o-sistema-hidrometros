import { canAccessStation } from "@/lib/auth/canAccessStation";
import { redirect } from "next/navigation";

export default async function EstacaoIndexPage({
  params,
}: {
  params: Promise<{ codSta: string }>;
}) {

  const { codSta } = await params;
  redirect(`/dashboard/estacao/${codSta}/inicialPag`);
}